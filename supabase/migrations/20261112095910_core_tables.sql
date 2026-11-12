-- =============================================================================
-- 5.1 · Tabelas do núcleo (Arquitetura 3.2, 3.3, 3.4) + verificações (3.5 §1–2).
-- A tabela admins já existe (20261111212240).
-- Dinheiro em cêntimos (integer) · durações em minutos · datas em timestamptz (UTC).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos enumerados (3.4)
-- -----------------------------------------------------------------------------
create type public.appointment_status as enum ('confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
create type public.appointment_source as enum ('online', 'whatsapp', 'phone', 'walk_in');
create type public.cancel_actor       as enum ('client', 'barber');
create type public.block_kind         as enum ('slot', 'day_off', 'vacation');
create type public.holiday_kind       as enum ('national', 'municipal', 'custom');
create type public.event_actor        as enum ('client', 'barber', 'system');
create type public.event_type         as enum ('created', 'updated', 'status_changed', 'note');
create type public.notification_type  as enum ('new_booking', 'client_cancelled', 'daily_summary', 'reminder');

-- -----------------------------------------------------------------------------
-- settings: uma só linha com os dados da barbearia e as regras (2.13)
-- -----------------------------------------------------------------------------
create table public.settings (
  id                        smallint primary key default 1 check (id = 1),
  business_name             text not null default 'MR Polo Barber' check (btrim(business_name) <> ''),
  owner_name                text not null default 'Matheus' check (btrim(owner_name) <> ''),
  address                   text,
  map_url                   text,
  whatsapp_phone            text check (whatsapp_phone ~ '^\+[1-9][0-9]{6,14}$'),
  privacy_policy_url        text,
  allow_same_day            boolean not null default true,
  min_notice_minutes        integer not null default 120 check (min_notice_minutes between 0 and 2880),
  max_days_ahead            integer not null default 30  check (max_days_ahead between 1 and 180),
  slot_step_minutes         integer not null default 15  check (slot_step_minutes between 5 and 60),
  buffer_minutes            integer not null default 0   check (buffer_minutes between 0 and 60),
  max_services_per_booking  integer not null default 1   check (max_services_per_booking between 1 and 5),
  max_active_per_phone      integer not null default 2   check (max_active_per_phone between 1 and 10),
  cancel_notice_minutes     integer not null default 120 check (cancel_notice_minutes between 0 and 2880),
  late_tolerance_minutes    integer not null default 10  check (late_tolerance_minutes between 0 and 30),
  no_show_flag_threshold    integer not null default 2   check (no_show_flag_threshold between 1 and 10),
  notify_new_booking        boolean not null default true,
  notify_client_cancelled   boolean not null default true,
  daily_summary_enabled     boolean not null default true,
  daily_summary_time        time    not null default '08:00',
  reminder_enabled          boolean not null default false,
  reminder_minutes          integer not null default 15  check (reminder_minutes between 5 and 120),
  updated_at                timestamptz not null default now()
);
comment on column public.settings.owner_name is 'Nome do barbeiro (saudação do painel). Acrescento à 3.4, decidido em 2026-11-12.';

-- -----------------------------------------------------------------------------
-- Disponibilidade (1.3, 2.12)
-- -----------------------------------------------------------------------------
create table public.weekly_hours (
  weekday     smallint primary key check (weekday between 1 and 7),  -- 1 = segunda … 7 = domingo (ISO)
  is_open     boolean not null,
  open_time   time,
  close_time  time,
  updated_at  timestamptz not null default now(),
  check (not is_open or (open_time is not null and close_time is not null and close_time > open_time))
);

create table public.weekly_breaks (
  id          uuid primary key default gen_random_uuid(),
  weekday     smallint not null references public.weekly_hours (weekday) on delete cascade,
  start_time  time not null,
  end_time    time not null,
  label       text,
  created_at  timestamptz not null default now(),
  check (end_time > start_time)
);
create index weekly_breaks_weekday_idx on public.weekly_breaks (weekday);

create table public.day_overrides (
  date        date primary key,
  is_closed   boolean not null default false,
  open_time   time,
  close_time  time,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (is_closed or (open_time is not null and close_time is not null and close_time > open_time))
);

create table public.holidays (
  date        date primary key,
  name        text not null check (btrim(name) <> ''),
  kind        public.holiday_kind not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.blocks (
  id          uuid primary key default gen_random_uuid(),
  kind        public.block_kind not null,
  start_at    timestamptz not null,
  end_at      timestamptz not null,
  reason      text,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_at > start_at)
);
create index blocks_period_idx on public.blocks using gist (tstzrange(start_at, end_at, '[)'));

-- -----------------------------------------------------------------------------
-- Negócio
-- -----------------------------------------------------------------------------
create table public.services (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null check (btrim(name) <> ''),
  description          text,
  duration_minutes     integer not null check (duration_minutes between 5 and 480),
  price_regular_cents  integer not null check (price_regular_cents >= 0),
  price_visitor_cents  integer not null check (price_visitor_cents >= 0),
  is_active            boolean not null default true,
  sort_order           integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table public.clients (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (btrim(name) <> ''),
  phone_e164   text unique check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),  -- único quando preenchido
  is_regular   boolean not null default false,   -- Habitual/local (2.7)
  is_blocked   boolean not null default false,   -- bloqueado de marcar online (1.6)
  notes        text,                             -- notas internas do barbeiro
  created_via  public.appointment_source not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (created_via <> 'online' or phone_e164 is not null)
);
create index clients_name_idx on public.clients (lower(name));

create table public.appointments (
  id                      uuid primary key default gen_random_uuid(),
  client_id               uuid not null references public.clients (id) on delete restrict,
  client_name             text not null check (btrim(client_name) <> ''),  -- nome escrito nesta marcação (RN-11)
  start_at                timestamptz not null,
  end_at                  timestamptz not null,
  status                  public.appointment_status not null default 'confirmed',
  source                  public.appointment_source not null,
  total_price_cents       integer not null check (total_price_cents >= 0),
  total_duration_minutes  integer not null check (total_duration_minutes >= 5),
  client_notes            text check (char_length(client_notes) <= 200),
  is_intentional_overlap  boolean not null default false,
  manage_token_hash       text unique,   -- só o hash do link pessoal (3.4, 3.9)
  idempotency_key         uuid unique,   -- duplo clique (2.5)
  cancelled_by            public.cancel_actor,
  cancelled_late          boolean not null default false,
  cancelled_at            timestamptz,
  created_by              uuid references auth.users (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  check (end_at > start_at),
  check (end_at = start_at + make_interval(mins => total_duration_minutes)),
  check ((status = 'cancelled') = (cancelled_by is not null and cancelled_at is not null)),
  check (not cancelled_late or status = 'cancelled'),
  check (source <> 'online' or manage_token_hash is not null),
  -- Rede de segurança contra sobreposições (3.6, camada 3): parcial, deixa passar
  -- as sobreposições manuais confirmadas pelo barbeiro (2.2).
  constraint appointments_no_overlap exclude using gist (
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status in ('confirmed', 'in_progress') and not is_intentional_overlap)
);
create index appointments_start_idx  on public.appointments (start_at);
create index appointments_client_idx on public.appointments (client_id);
create index appointments_period_idx on public.appointments using gist (tstzrange(start_at, end_at, '[)'));

create table public.appointment_services (
  id                uuid primary key default gen_random_uuid(),
  appointment_id    uuid not null references public.appointments (id) on delete cascade,
  service_id        uuid not null references public.services (id) on delete restrict,
  service_name      text not null,
  price_cents       integer not null check (price_cents >= 0),
  duration_minutes  integer not null check (duration_minutes >= 5),
  position          smallint not null default 1,
  unique (appointment_id, position)
);
create index appointment_services_service_idx on public.appointment_services (service_id);

create table public.appointment_events (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references public.appointments (id) on delete cascade,
  actor           public.event_actor not null,
  actor_id        uuid references auth.users (id) on delete set null,
  type            public.event_type not null,
  field           text,
  old_value       text,
  new_value       text,
  note            text,
  created_at      timestamptz not null default now()
);
create index appointment_events_appointment_idx on public.appointment_events (appointment_id, created_at);

-- -----------------------------------------------------------------------------
-- Notificações (estrutura; a lógica fica para a etapa das notificações)
-- -----------------------------------------------------------------------------
create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  type            public.notification_type not null,
  title           text not null,
  body            text not null,
  appointment_id  uuid references public.appointments (id) on delete set null,
  read_at         timestamptz,
  push_sent_at    timestamptz,
  created_at      timestamptz not null default now()
);
create index notifications_unread_idx on public.notifications (created_at) where read_at is null;

create table public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);

-- -----------------------------------------------------------------------------
-- Interna: limite de pedidos das funções públicas (3.7 §4)
-- -----------------------------------------------------------------------------
create table public.rate_limits (
  key           text not null,
  window_start  timestamptz not null,
  count         integer not null default 0,
  primary key (key, window_start)
);
