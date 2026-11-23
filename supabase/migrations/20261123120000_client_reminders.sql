-- =============================================================================
-- Lembrete ao CLIENTE no dia da marcação (pedido do Gabriel, 2026-11-23;
-- decisão: uma notificação no próprio dia às 08:00).
--
-- O cliente ativa os lembretes no telemóvel (ecrã final da marcação ou link
-- pessoal). O código da marcação prova quem é: o aparelho fica ligado à FICHA do
-- cliente, por isso recebe o lembrete de TODAS as marcações dele — também as que o
-- barbeiro marca por ele e as da marcação semanal.
--   client_push_subscriptions ... aparelhos dos clientes (só o servidor lê)
--   client_push_messages ........ mensagens a enviar (uma por marcação e tipo)
--   send_client_reminders() ..... às 08:00 (no tick de cada minuto), marcações de hoje
-- O envio usa a mesma Edge Function send-push (corpo { client_message_id }).
-- Interruptor no painel: settings.client_reminder_enabled.
-- Limpeza: mensagens com mais de 30 dias; aparelhos de clientes anonimizados.
-- =============================================================================

alter table public.settings add column client_reminder_enabled boolean not null default true;

create table public.client_push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);
create index client_push_subscriptions_client_idx on public.client_push_subscriptions (client_id);
alter table public.client_push_subscriptions enable row level security;  -- sem políticas: só o servidor
revoke all on public.client_push_subscriptions from anon, authenticated;

create table public.client_push_messages (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients (id) on delete cascade,
  appointment_id  uuid references public.appointments (id) on delete set null,
  kind            text not null check (kind in ('reminder_day')),
  title           text not null,
  body            text not null,
  url             text not null default '/',
  created_at      timestamptz not null default now(),
  sent_at         timestamptz,
  unique (appointment_id, kind)
);
alter table public.client_push_messages enable row level security;   -- sem políticas: só o servidor
revoke all on public.client_push_messages from anon, authenticated;

-- Cada mensagem nova pede o envio à Edge Function (igual ao request_push do barbeiro).
create function public.request_client_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_segredo text;
begin
  select decrypted_secret into v_segredo from vault.decrypted_secrets where name = 'send_push_secret';
  if v_segredo is null then
    raise warning 'send_push_secret em falta no Vault: lembrete não enviado';
    return new;
  end if;
  perform net.http_post(
    url     := 'https://sxxbenaejbdgadrsavef.supabase.co/functions/v1/send-push',
    body    := jsonb_build_object('client_message_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_segredo),
    timeout_milliseconds := 10000
  );
  return new;
exception when others then
  raise warning 'lembrete não pedido para a mensagem %: %', new.id, sqlerrm;
  return new;
end;
$$;

create trigger client_push_messages_request
  after insert on public.client_push_messages
  for each row execute function public.request_client_push();

-- Lembretes do dia: entre as 08:00 e as 08:10 (hora de Lisboa), para as marcações
-- confirmadas de HOJE ainda por começar, de clientes com aparelho ativado.
-- Não repete (unique appointment_id + kind). p_agora só serve para os testes.
create function public.send_client_reminders(p_agora timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_local  timestamp := p_agora at time zone 'Europe/Lisbon';
  v_hoje   date := v_local::date;
  v_nome   text;
  v_n      integer;
begin
  if not (select client_reminder_enabled from public.settings where id = 1) then
    return 0;
  end if;
  if v_local::time < time '08:00' or v_local::time >= time '08:10' then
    return 0;
  end if;

  select business_name into v_nome from public.settings where id = 1;

  insert into public.client_push_messages (client_id, appointment_id, kind, title, body, url)
  select a.client_id, a.id, 'reminder_day',
         'Lembrete: hoje tem marcação',
         format('Hoje às %s: %s na %s. Até já!',
                to_char(a.start_at at time zone 'Europe/Lisbon', 'HH24:MI'),
                coalesce(public.appointment_service_names(a.id), 'marcação'), v_nome),
         '/'
    from public.appointments a
   where a.status = 'confirmed'
     and a.start_at > p_agora
     and a.start_at >= v_hoje::timestamp at time zone 'Europe/Lisbon'
     and a.start_at <  (v_hoje + 1)::timestamp at time zone 'Europe/Lisbon'
     and exists (select 1 from public.client_push_subscriptions s where s.client_id = a.client_id)
  on conflict (appointment_id, kind) do nothing;
  get diagnostics v_n = row_count;

  -- Limpeza (uma vez por dia, aproveitando esta janela)
  delete from public.client_push_messages where created_at < p_agora - interval '30 days';
  delete from public.client_push_subscriptions s
   using public.clients c
   where c.id = s.client_id and c.anonymized_at is not null;

  return v_n;
end;
$$;

-- O tick de cada minuto passa a incluir os lembretes dos clientes.
select cron.schedule('notifications_tick', '* * * * *',
  'select public.send_reminders(); select public.send_daily_summary(); select public.send_client_reminders();');

-- -----------------------------------------------------------------------------
-- Público: ativar / desativar lembretes neste aparelho
-- -----------------------------------------------------------------------------
create function public.subscribe_client_push(
  p_code       text,
  p_endpoint   text,
  p_p256dh     text,
  p_auth       text,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client uuid;
begin
  if not public.hit_rate_limit('link:' || public.request_ip_hash(), 30, interval '1 hour') then
    return public.public_error('RATE_LIMITED');
  end if;
  if coalesce(p_endpoint, '') !~ '^https://' or char_length(p_endpoint) > 1000
     or coalesce(p_p256dh, '') = '' or char_length(p_p256dh) > 200
     or coalesce(p_auth, '') = '' or char_length(p_auth) > 100 then
    return public.public_error('INVALID_REQUEST');
  end if;

  select a.client_id into v_client
    from public.appointments a
    join public.clients c on c.id = a.client_id
   where a.manage_token_hash = public.manage_code_hash(p_code) and c.anonymized_at is null;
  if not found then
    return public.public_error('NOT_FOUND');
  end if;

  insert into public.client_push_subscriptions (client_id, endpoint, p256dh, auth, user_agent)
  values (v_client, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set client_id = excluded.client_id, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent;

  -- No máximo 5 aparelhos por cliente (os mais antigos saem).
  delete from public.client_push_subscriptions
   where client_id = v_client
     and id not in (select id from public.client_push_subscriptions where client_id = v_client order by created_at desc limit 5);

  return jsonb_build_object('ok', true);
end;
$$;

create function public.unsubscribe_client_push(p_endpoint text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.hit_rate_limit('link:' || public.request_ip_hash(), 30, interval '1 hour') then
    return public.public_error('RATE_LIMITED');
  end if;
  delete from public.client_push_subscriptions where endpoint = p_endpoint;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.request_client_push()                     from public, anon, authenticated;
revoke all on function public.send_client_reminders(timestamptz)        from public, anon, authenticated;
grant execute on function public.subscribe_client_push(text, text, text, text, text) to anon, authenticated;
grant execute on function public.unsubscribe_client_push(text)                       to anon, authenticated;
