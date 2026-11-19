-- =============================================================================
-- S.1 · Marcação semanal (docs/SEMANAL.md; decisões D1–D6 validadas pelo Gabriel
-- a 2026-11-19).
--
-- Um cliente HABITUAL pede, ao marcar online, para repetir todas as semanas no
-- mesmo dia e hora → fica PENDENTE até o barbeiro aprovar. O barbeiro também
-- pode criar uma série diretamente (D4). Uma série ativa mantém sempre as
-- próximas 4 semanas marcadas (D1) com marcações normais (origem "weekly").
-- Semana impossível (feriado, fechado, bloqueio, hora ocupada) → salta e avisa
-- (D2). O cliente não gere as semanas: fala com o barbeiro (D3). Faltas: só o
-- aviso normal (D5). As marcações da série NÃO contam para o limite de
-- marcações por telemóvel (D6).
-- Se o cliente deixar de ser habitual ou for bloqueado, a série para e as
-- marcações futuras dela são canceladas.
-- =============================================================================

-- Valores novos (só usados dentro de funções plpgsql, por isso podem ser
-- acrescentados nesta mesma transação).
alter type public.appointment_source add value if not exists 'weekly';
alter type public.notification_type  add value if not exists 'weekly_request';
alter type public.notification_type  add value if not exists 'weekly_skipped';
alter type public.notification_type  add value if not exists 'weekly_stopped';

-- -----------------------------------------------------------------------------
-- 1. Tabela das séries
-- -----------------------------------------------------------------------------
create table public.weekly_series (
  id                     uuid primary key default gen_random_uuid(),
  client_id              uuid not null references public.clients (id) on delete restrict,
  service_id             uuid not null references public.services (id) on delete restrict,
  weekday                smallint not null check (weekday between 1 and 7),   -- 1 = segunda (ISO)
  time_local             time not null,                                       -- hora de Lisboa
  status                 text not null check (status in ('pending', 'active', 'rejected', 'stopped')),
  requested_by           public.event_actor not null,                         -- client (pedido) · barber (criada no painel)
  origin_appointment_id  uuid references public.appointments (id) on delete set null,
  generated_until        date,          -- última semana já tratada (marcada ou saltada)
  stop_reason            text,
  created_at             timestamptz not null default now(),
  decided_at             timestamptz,
  stopped_at             timestamptz
);
comment on table public.weekly_series is 'Marcação semanal de clientes habituais (SEMANAL.md).';

-- No máximo uma série pendente/ativa por cliente, dia e hora.
create unique index weekly_series_unique_open on public.weekly_series (client_id, weekday, time_local)
  where status in ('pending', 'active');
create index weekly_series_client_idx on public.weekly_series (client_id);

alter table public.weekly_series enable row level security;
create policy weekly_series_admin_select on public.weekly_series for select to authenticated
  using ((select public.is_admin()));
-- Escritas só pelas funções abaixo.
revoke insert, update, delete on public.weekly_series from anon, authenticated;

alter table public.appointments add column series_id uuid references public.weekly_series (id) on delete set null;
create index appointments_series_idx on public.appointments (series_id) where series_id is not null;

-- -----------------------------------------------------------------------------
-- 2. Gerador: mantém as próximas 4 semanas de uma série (ou de todas as ativas).
--    Cada semana é tratada UMA vez (generated_until): ou fica marcada, ou salta
--    com o motivo. p_agora só serve para os testes.
-- -----------------------------------------------------------------------------
create function public.weekly_series_generate(
  p_series_id uuid default null,
  p_notify    boolean default true,
  p_agora     timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hoje     date := (p_agora at time zone 'Europe/Lisbon')::date;
  v_limite   date := v_hoje + 28;  -- D1: 4 semanas
  v_s        public.weekly_series%rowtype;
  v_cli      public.clients%rowtype;
  v_svc      public.services%rowtype;
  v_notas    text;
  v_dia      date;
  v_ini      timestamptz;
  v_fim      timestamptz;
  v_motivo   text;
  v_id       uuid;
  v_criadas  jsonb := '[]'::jsonb;
  v_saltadas jsonb := '[]'::jsonb;
begin
  perform public.lock_agenda();
  perform set_config('app.actor', 'system', true);

  for v_s in
    select * from public.weekly_series
    where status = 'active' and (p_series_id is null or id = p_series_id)
    order by created_at
    for update
  loop
    select * into v_cli from public.clients where id = v_s.client_id;
    select * into v_svc from public.services where id = v_s.service_id;
    select client_notes into v_notas from public.appointments where id = v_s.origin_appointment_id;

    -- 1.ª data a tratar: o dia da semana certo, depois do que já foi tratado.
    v_dia := greatest(coalesce(v_s.generated_until + 1, v_hoje), v_hoje);
    v_dia := v_dia + ((v_s.weekday - extract(isodow from v_dia)::int + 7) % 7);

    while v_dia <= v_limite loop
      v_ini := (v_dia + v_s.time_local) at time zone 'Europe/Lisbon';
      v_fim := v_ini + make_interval(mins => v_svc.duration_minutes);
      v_motivo := null;

      if v_ini <= p_agora then
        v_motivo := null;  -- já passou: só avança (não avisa)
      elsif not v_svc.is_active then
        v_motivo := 'serviço desativado';
      elsif exists (select 1 from public.holidays where date = v_dia and is_active) then
        v_motivo := 'feriado';
      elsif not public.within_working_hours(v_ini, v_fim) then
        v_motivo := 'barbearia fechada ou fora do horário';
      elsif exists (select 1 from public.blocks b where b.start_at < v_fim and b.end_at > v_ini) then
        v_motivo := 'bloqueio ou férias';
      elsif public.busy_between(v_ini, v_fim) && tstzrange(v_ini, v_fim, '[)') then
        v_motivo := 'hora ocupada';
      end if;

      if v_ini <= p_agora then
        null;
      elsif v_motivo is null then
        insert into public.appointments (
          client_id, client_name, start_at, end_at, source, total_price_cents, total_duration_minutes,
          client_notes, series_id)
        values (
          v_cli.id, v_cli.name, v_ini, v_fim, 'weekly', v_svc.price_regular_cents, v_svc.duration_minutes,
          v_notas, v_s.id)
        returning id into v_id;

        insert into public.appointment_services (appointment_id, service_id, service_name, price_cents, duration_minutes, position)
        values (v_id, v_svc.id, v_svc.name, v_svc.price_regular_cents, v_svc.duration_minutes, 1);

        v_criadas := v_criadas || jsonb_build_object('series_id', v_s.id, 'date', v_dia, 'appointment_id', v_id);
      else
        v_saltadas := v_saltadas || jsonb_build_object('series_id', v_s.id, 'date', v_dia, 'reason', v_motivo);
        if p_notify then
          perform public.notify(
            'weekly_skipped',
            'Semana não marcada',
            format('%s (semanal): %s não foi marcada — %s.', v_cli.name, public.pt_quando(v_ini), v_motivo));
        end if;
      end if;

      update public.weekly_series set generated_until = v_dia where id = v_s.id;
      v_dia := v_dia + 7;
    end loop;
  end loop;

  return jsonb_build_object('created', v_criadas, 'skipped', v_saltadas);
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Parar uma série: cancela as marcações FUTURAS dela (as passadas ficam).
-- -----------------------------------------------------------------------------
create function public.weekly_series_stop_internal(p_series_id uuid, p_reason text, p_actor public.event_actor)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  perform set_config('app.actor', p_actor::text, true);
  update public.weekly_series
     set status = 'stopped', stopped_at = now(), stop_reason = p_reason
   where id = p_series_id and status in ('pending', 'active');

  update public.appointments
     set status = 'cancelled', cancelled_by = 'barber', cancelled_at = now()
   where series_id = p_series_id and status = 'confirmed' and start_at > now();
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Deixou de ser habitual ou foi bloqueado → as séries param (com aviso).
create function public.weekly_series_on_client_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s public.weekly_series%rowtype;
  v_n integer;
begin
  if (new.is_regular and not new.is_blocked) or (old.is_regular = new.is_regular and old.is_blocked = new.is_blocked) then
    return new;
  end if;
  for v_s in select * from public.weekly_series where client_id = new.id and status in ('pending', 'active') loop
    v_n := public.weekly_series_stop_internal(
      v_s.id,
      case when new.is_blocked then 'cliente bloqueado' else 'deixou de ser habitual' end,
      'system');
    perform public.notify(
      'weekly_stopped',
      'Marcação semanal parada',
      format('%s: a marcação semanal parou (%s). %s marcação(ões) futura(s) cancelada(s).',
             new.name, case when new.is_blocked then 'cliente bloqueado' else 'deixou de ser habitual' end, v_n));
  end loop;
  return new;
end;
$$;

create trigger clients_weekly_series_stop
  after update of is_regular, is_blocked on public.clients
  for each row execute function public.weekly_series_on_client_change();

-- Tarefa diária: mantém as 4 semanas de todas as séries ativas.
select cron.schedule('weekly_series_generate', '45 3 * * *', 'select public.weekly_series_generate()');

-- -----------------------------------------------------------------------------
-- 4. Público: pedir a marcação semanal a partir do link da marcação acabada de
--    fazer (o código prova que a marcação é de quem pede). Só para habituais.
-- -----------------------------------------------------------------------------
create function public.request_weekly(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appt public.appointments%rowtype;
  v_cli  public.clients%rowtype;
  v_svc  uuid;
  v_dow  smallint;
  v_hora time;
  v_s    public.weekly_series%rowtype;
begin
  if not public.hit_rate_limit('link:' || public.request_ip_hash(), 30, interval '1 hour') then
    return public.public_error('RATE_LIMITED');
  end if;

  select * into v_appt from public.appointments where manage_token_hash = public.manage_code_hash(p_code);
  if not found then
    return public.public_error('NOT_FOUND');
  end if;
  if v_appt.status <> 'confirmed' or v_appt.start_at <= now() then
    return public.public_error('WEEKLY_NOT_ALLOWED');
  end if;

  select * into v_cli from public.clients where id = v_appt.client_id;
  if not v_cli.is_regular or v_cli.is_blocked then
    return public.public_error('NOT_REGULAR');
  end if;

  v_dow  := extract(isodow from v_appt.start_at at time zone 'Europe/Lisbon')::smallint;
  v_hora := (v_appt.start_at at time zone 'Europe/Lisbon')::time;
  select service_id into v_svc from public.appointment_services where appointment_id = v_appt.id and position = 1;

  -- Já existe (pedido repetido, ou série igual): devolve o estado.
  select * into v_s from public.weekly_series
   where client_id = v_cli.id and weekday = v_dow and time_local = v_hora and status in ('pending', 'active');
  if found then
    return jsonb_build_object('ok', true, 'weekly_status', v_s.status);
  end if;

  insert into public.weekly_series (client_id, service_id, weekday, time_local, status, requested_by,
                                    origin_appointment_id, generated_until)
  values (v_cli.id, v_svc, v_dow, v_hora, 'pending', 'client', v_appt.id,
          (v_appt.start_at at time zone 'Europe/Lisbon')::date)   -- a 1.ª semana é a própria marcação
  returning * into v_s;

  perform public.notify(
    'weekly_request',
    'Pedido de marcação semanal',
    format('%s pede marcação semanal: %s às %s (%s). Aprovar ou recusar no painel.',
           v_cli.name,
           (array['segundas','terças','quartas','quintas','sextas','sábados','domingos'])[v_dow],
           to_char(v_hora, 'HH24:MI'),
           coalesce(public.appointment_service_names(v_appt.id), 'serviço')),
    v_appt.id);

  return jsonb_build_object('ok', true, 'weekly_status', 'pending');
end;
$$;

-- Resumo do link pessoal passa a mostrar a série (se houver).
create or replace function public.booking_summary(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'ok',               true,
    'start_at',         a.start_at,
    'end_at',           a.end_at,
    'date_local',       to_char(a.start_at at time zone 'Europe/Lisbon', 'YYYY-MM-DD'),
    'time_local',       to_char(a.start_at at time zone 'Europe/Lisbon', 'HH24:MI'),
    'service_name',     sv.service_name,
    'duration_minutes', a.total_duration_minutes,
    'price_cents',      a.total_price_cents,
    'client_name',      a.client_name,
    'status',           case
                          when a.status in ('confirmed', 'in_progress') and now() >= a.end_at then 'completed'
                          when a.status = 'confirmed' and now() >= a.start_at then 'in_progress'
                          else a.status::text
                        end,
    'cancelled_by',     a.cancelled_by,
    'cancel_until',     a.start_at - make_interval(mins => st.cancel_notice_minutes),
    'can_cancel',       a.status = 'confirmed' and now() < a.start_at - make_interval(mins => st.cancel_notice_minutes),
    'weekly',           (select jsonb_build_object('status', ws.status, 'weekday', ws.weekday,
                                                   'time_local', to_char(ws.time_local, 'HH24:MI'))
                           from public.weekly_series ws
                          where ws.origin_appointment_id = a.id
                          order by ws.created_at desc limit 1)
  )
  from public.appointments a
  join public.appointment_services sv on sv.appointment_id = a.id and sv.position = 1
  cross join public.settings st
  where a.id = p_id and st.id = 1;
$$;

-- -----------------------------------------------------------------------------
-- 5. Painel
-- -----------------------------------------------------------------------------

-- Aprovar (gera já as 4 semanas) ou recusar um pedido.
create function public.admin_weekly_decide(p_id uuid, p_approve boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s public.weekly_series%rowtype;
begin
  perform public.require_admin();
  perform public.lock_agenda();
  select * into v_s from public.weekly_series where id = p_id for update;
  if not found then
    raise exception 'Pedido não encontrado' using errcode = 'P0002';
  end if;
  if v_s.status <> 'pending' then
    raise exception 'Este pedido já foi tratado' using errcode = 'P0001';
  end if;
  if p_approve and not exists (select 1 from public.clients where id = v_s.client_id and is_regular and not is_blocked) then
    raise exception 'O cliente já não é habitual (ou está bloqueado)' using errcode = 'P0001';
  end if;

  update public.weekly_series
     set status = case when p_approve then 'active' else 'rejected' end, decided_at = now()
   where id = p_id;

  if not p_approve then
    return jsonb_build_object('status', 'rejected');
  end if;
  return jsonb_build_object('status', 'active') || public.weekly_series_generate(p_id, false);
end;
$$;

-- Criar uma série no painel (D4): a 1.ª semana é p_first_start_local.
create function public.admin_weekly_create(p_client_id uuid, p_service_id uuid, p_first_start_local timestamp)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.require_admin();
  perform public.lock_agenda();
  if not exists (select 1 from public.clients where id = p_client_id and is_regular and not is_blocked) then
    raise exception 'Só clientes habituais (e não bloqueados) podem ter marcação semanal' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.services where id = p_service_id and is_active) then
    raise exception 'Serviço não disponível' using errcode = 'P0001';
  end if;
  if p_first_start_local is null or (p_first_start_local at time zone 'Europe/Lisbon') <= now() then
    raise exception 'A 1.ª semana tem de ser no futuro' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.weekly_series
              where client_id = p_client_id and status in ('pending', 'active')
                and weekday = extract(isodow from p_first_start_local)::smallint
                and time_local = p_first_start_local::time) then
    raise exception 'Este cliente já tem marcação semanal neste dia e hora' using errcode = 'P0001';
  end if;

  insert into public.weekly_series (client_id, service_id, weekday, time_local, status, requested_by, generated_until, decided_at)
  values (p_client_id, p_service_id, extract(isodow from p_first_start_local)::smallint, p_first_start_local::time,
          'active', 'barber', p_first_start_local::date - 1, now())
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'status', 'active') || public.weekly_series_generate(v_id, false);
end;
$$;

-- Parar uma série (D3): cancela as marcações futuras dela.
create function public.admin_weekly_stop(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  perform public.require_admin();
  perform public.lock_agenda();
  if not exists (select 1 from public.weekly_series where id = p_id and status in ('pending', 'active')) then
    raise exception 'Esta marcação semanal já não está ativa' using errcode = 'P0001';
  end if;
  v_n := public.weekly_series_stop_internal(p_id, 'parada pelo barbeiro', 'barber');
  return jsonb_build_object('status', 'stopped', 'cancelled', v_n);
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. D6: as marcações da série não contam para o limite por telemóvel.
--    (create_booking igual ao da 6.1, só muda a contagem do passo 6)
-- -----------------------------------------------------------------------------
create or replace function public.create_booking(
  p_service_id      uuid,
  p_start_at        timestamptz,
  p_name            text,
  p_phone           text,
  p_notes           text default null,
  p_idempotency_key uuid default null,
  p_website         text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone   text := public.normalize_phone(p_phone);
  v_name    text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_notes   text := nullif(btrim(coalesce(p_notes, '')), '');
  v_set     public.settings%rowtype;
  v_service public.services%rowtype;
  v_client  public.clients%rowtype;
  v_id      uuid;
  v_price   integer;
  v_active  integer;
begin
  if p_idempotency_key is null then
    return public.public_error('INVALID_REQUEST');
  end if;

  select id into v_id from public.appointments where idempotency_key = p_idempotency_key;
  if found then
    return public.booking_summary(v_id) || jsonb_build_object('code', public.manage_code_for(p_idempotency_key));
  end if;

  if coalesce(p_website, '') <> '' then
    return public.public_error('REJECTED');
  end if;
  if not public.hit_rate_limit('book-ip:' || public.request_ip_hash(), 5, interval '1 hour') then
    return public.public_error('RATE_LIMITED');
  end if;

  if v_phone is null then
    return public.public_error('INVALID_PHONE');
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    return public.public_error('INVALID_NAME');
  end if;
  if char_length(v_notes) > 200 then
    return public.public_error('INVALID_NOTES');
  end if;
  if not public.hit_rate_limit('book-phone:' || public.private_hash(v_phone), 3, interval '1 hour') then
    return public.public_error('RATE_LIMITED');
  end if;

  perform public.lock_agenda();

  select id into v_id from public.appointments where idempotency_key = p_idempotency_key;
  if found then
    return public.booking_summary(v_id) || jsonb_build_object('code', public.manage_code_for(p_idempotency_key));
  end if;

  select * into v_set from public.settings where id = 1;

  select * into v_service from public.services where id = p_service_id and is_active;
  if not found then
    return public.public_error('SERVICE_UNAVAILABLE');
  end if;

  if p_start_at is null or p_start_at < now() + make_interval(mins => v_set.min_notice_minutes) then
    return public.public_error('TOO_LATE');
  end if;
  if not exists (
    select 1 from public.available_slots(p_service_id, (p_start_at at time zone 'Europe/Lisbon')::date) as t
    where t = p_start_at
  ) then
    return public.public_error('SLOT_TAKEN');
  end if;

  select * into v_client from public.clients where phone_e164 = v_phone;
  if found then
    if v_client.is_blocked then
      return public.public_error('PHONE_BLOCKED');
    end if;
    select count(*) into v_active
      from public.appointments
     where client_id = v_client.id and status in ('confirmed', 'in_progress') and end_at > now()
       and series_id is null;   -- D6
    if v_active >= v_set.max_active_per_phone then
      return public.public_error('LIMIT_REACHED', jsonb_build_object('limit', v_set.max_active_per_phone));
    end if;
  else
    insert into public.clients (name, phone_e164, created_via)
    values (v_name, v_phone, 'online')
    returning * into v_client;
  end if;

  v_price := case when v_client.is_regular then v_service.price_regular_cents else v_service.price_visitor_cents end;
  perform set_config('app.actor', 'client', true);

  insert into public.appointments (
    client_id, client_name, start_at, end_at, source, total_price_cents, total_duration_minutes,
    client_notes, manage_token_hash, idempotency_key)
  values (
    v_client.id, v_name, p_start_at, p_start_at + make_interval(mins => v_service.duration_minutes), 'online',
    v_price, v_service.duration_minutes, v_notes,
    public.manage_code_hash(public.manage_code_for(p_idempotency_key)), p_idempotency_key)
  returning id into v_id;

  insert into public.appointment_services (appointment_id, service_id, service_name, price_cents, duration_minutes, position)
  values (v_id, v_service.id, v_service.name, v_price, v_service.duration_minutes, 1);

  return public.booking_summary(v_id) || jsonb_build_object('code', public.manage_code_for(p_idempotency_key));
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. Permissões
-- -----------------------------------------------------------------------------
revoke all on function public.weekly_series_generate(uuid, boolean, timestamptz)          from public, anon, authenticated;
revoke all on function public.weekly_series_stop_internal(uuid, text, public.event_actor) from public, anon, authenticated;
grant execute on function public.request_weekly(text)                                     to anon, authenticated;
grant execute on function public.admin_weekly_decide(uuid, boolean)                      to authenticated;
grant execute on function public.admin_weekly_create(uuid, uuid, timestamp)              to authenticated;
grant execute on function public.admin_weekly_stop(uuid)                                 to authenticated;
