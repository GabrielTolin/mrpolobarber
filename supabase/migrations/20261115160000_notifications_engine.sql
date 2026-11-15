-- =============================================================================
-- 7.1 · Motor das notificações (Especificação 2.9; Arquitetura 3.8 §2–4).
--
-- Princípio (1.9): o barbeiro só é notificado do que NÃO foi ele a fazer.
--   Nova marcação online ...... quando o cliente marca (create_booking), com
--                               "⚠️ N faltas" se o cliente estiver sinalizado
--   Cancelamento pelo cliente . pelo link pessoal (cancel_booking)
--   Resumo do dia ............. à hora escolhida, só em dias de trabalho
--   Lembrete .................. X minutos antes de cada marcação ativa
-- Cada tipo respeita o interruptor das Configurações. Cada notificação nova
-- chama a Edge Function send-push (7.2) por pg_net, com o segredo do Vault.
-- Se o push falhar, a notificação fica na mesma (o painel é a fonte de verdade).
-- Limpeza: notificações com mais de 30 dias.
-- =============================================================================

create extension if not exists pg_net with schema extensions;

-- -----------------------------------------------------------------------------
-- 1. Auxiliares
-- -----------------------------------------------------------------------------

-- "ter 11/11 10:00" (hora de Lisboa)
create function public.pt_quando(p_instante timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select (array['seg','ter','qua','qui','sex','sáb','dom'])[extract(isodow from p_instante at time zone 'Europe/Lisbon')::int]
         || ' ' || to_char(p_instante at time zone 'Europe/Lisbon', 'DD/MM HH24:MI');
$$;

-- Serviço(s) de uma marcação: "Barba" ou "Corte + Barba"
create function public.appointment_service_names(p_appointment_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select string_agg(service_name, ' + ' order by position)
  from public.appointment_services
  where appointment_id = p_appointment_id;
$$;

-- Cria uma notificação (o envio do push é feito pelo trigger da secção 4).
create function public.notify(
  p_type           public.notification_type,
  p_title          text,
  p_body           text,
  p_appointment_id uuid default null
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (type, title, body, appointment_id)
  values (p_type, p_title, p_body, p_appointment_id)
  returning id;
$$;

-- -----------------------------------------------------------------------------
-- 2. Acontecimentos
-- -----------------------------------------------------------------------------

-- Nova marcação ONLINE feita pelo cliente. Corre quando o serviço da marcação é
-- gravado (na marcação ainda não há serviço) e só se quem fez foi o cliente
-- (create_booking põe app.actor = 'client'): as marcações do barbeiro não notificam.
create function public.notify_new_online_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appt   public.appointments%rowtype;
  v_set    public.settings%rowtype;
  v_faltas integer;
  v_body   text;
begin
  if new.position <> 1 or public.current_event_actor() <> 'client' then
    return new;
  end if;
  select * into v_set from public.settings where id = 1;
  if not v_set.notify_new_booking then
    return new;
  end if;
  select * into v_appt from public.appointments where id = new.appointment_id;
  if v_appt.source <> 'online' then
    return new;
  end if;

  select count(*) into v_faltas from public.appointments where client_id = v_appt.client_id and status = 'no_show';

  v_body := format('%s, %s, %s', v_appt.client_name, new.service_name, public.pt_quando(v_appt.start_at));
  if v_faltas >= v_set.no_show_flag_threshold then
    v_body := v_body || format(' · ⚠️ %s %s', v_faltas, case when v_faltas = 1 then 'falta' else 'faltas' end);
  end if;

  perform public.notify('new_booking', 'Nova marcação', v_body, v_appt.id);
  return new;
end;
$$;

create trigger appointment_services_notify_new_booking
  after insert on public.appointment_services
  for each row execute function public.notify_new_online_booking();

-- Cancelamento pelo cliente (link pessoal). O do barbeiro não notifica.
create function public.notify_client_cancelled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' and new.cancelled_by = 'client'
     and (select notify_client_cancelled from public.settings where id = 1) then
    perform public.notify(
      'client_cancelled',
      'Cancelamento',
      format('%s cancelou: %s, %s. O horário ficou livre.',
             new.client_name, coalesce(public.appointment_service_names(new.id), 'marcação'), public.pt_quando(new.start_at)),
      new.id);
  end if;
  return new;
end;
$$;

create trigger appointments_notify_client_cancelled
  after update of status on public.appointments
  for each row execute function public.notify_client_cancelled();

-- -----------------------------------------------------------------------------
-- 3. Tarefas agendadas (cron, a cada minuto). p_agora só serve para os testes.
-- -----------------------------------------------------------------------------

-- Lembrete X min antes (2.9; pedido do barbeiro: 5 min). Marcações confirmadas
-- que começam nos próximos X minutos e ainda sem lembrete. Não avisa marcações
-- criadas já dentro dessa janela (foram feitas agora, o barbeiro já sabe).
create function public.send_reminders(p_agora timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_set    public.settings%rowtype;
  v_janela interval;
  v_a      record;
  v_n      integer := 0;
  v_min    integer;
begin
  select * into v_set from public.settings where id = 1;
  if not v_set.reminder_enabled then
    return 0;
  end if;
  v_janela := make_interval(mins => v_set.reminder_minutes);

  for v_a in
    select a.id, a.client_name, a.start_at
    from public.appointments a
    where a.status = 'confirmed'
      and a.start_at > p_agora
      and a.start_at <= p_agora + v_janela
      and a.created_at < a.start_at - v_janela
      and not exists (select 1 from public.notifications n where n.appointment_id = a.id and n.type = 'reminder')
    order by a.start_at
  loop
    v_min := greatest(1, ceil(extract(epoch from (v_a.start_at - p_agora)) / 60)::int);
    perform public.notify(
      'reminder',
      'Próximo cliente',
      format('Daqui a %s min: %s, %s', v_min, v_a.client_name, coalesce(public.appointment_service_names(v_a.id), 'marcação')),
      v_a.id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- Resumo do dia (2.9): uma vez por dia, nos 10 minutos a seguir à hora escolhida,
-- só em dias de trabalho (com horário nesse dia).
create function public.send_daily_summary(p_agora timestamptz default now())
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_set     public.settings%rowtype;
  v_local   timestamp := p_agora at time zone 'Europe/Lisbon';
  v_hoje    date := v_local::date;
  v_n       integer;
  v_primeira timestamptz;
begin
  select * into v_set from public.settings where id = 1;
  if not v_set.daily_summary_enabled then
    return false;
  end if;
  if v_local::time < v_set.daily_summary_time or v_local::time >= v_set.daily_summary_time + interval '10 minutes' then
    return false;
  end if;
  if isempty(public.day_windows(v_hoje)) then
    return false; -- dia de folga, domingo ou feriado
  end if;
  if exists (
    select 1 from public.notifications
    where type = 'daily_summary' and (created_at at time zone 'Europe/Lisbon')::date = v_hoje
  ) then
    return false; -- já enviado hoje
  end if;

  select count(*), min(start_at) into v_n, v_primeira
  from public.appointments
  where status in ('confirmed', 'in_progress')
    and start_at >= v_hoje::timestamp at time zone 'Europe/Lisbon'
    and start_at < (v_hoje + 1)::timestamp at time zone 'Europe/Lisbon';

  perform public.notify(
    'daily_summary',
    'Resumo do dia',
    case when v_n = 0 then 'Hoje ainda não há marcações.'
         when v_n = 1 then format('Hoje: 1 marcação, às %s.', to_char(v_primeira at time zone 'Europe/Lisbon', 'HH24:MI'))
         else format('Hoje: %s marcações, a 1.ª às %s.', v_n, to_char(v_primeira at time zone 'Europe/Lisbon', 'HH24:MI'))
    end);
  return true;
end;
$$;

-- Limpeza: notificações com mais de 30 dias (2.9).
create function public.purge_notifications()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.notifications where created_at < now() - interval '30 days';
$$;

select cron.schedule('notifications_tick', '* * * * *', 'select public.send_reminders(); select public.send_daily_summary();');
select cron.schedule('purge_notifications', '0 3 * * *', 'select public.purge_notifications()');

-- -----------------------------------------------------------------------------
-- 4. Envio do push: cada notificação nova chama a Edge Function send-push (7.2).
--    Nunca faz falhar quem criou a notificação (ex.: a marcação do cliente).
-- -----------------------------------------------------------------------------
create function public.request_push()
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
    raise warning 'send_push_secret em falta no Vault: push não enviado';
    return new;
  end if;
  perform net.http_post(
    url     := 'https://sxxbenaejbdgadrsavef.supabase.co/functions/v1/send-push',
    body    := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_segredo),
    timeout_milliseconds := 10000
  );
  return new;
exception when others then
  raise warning 'push não pedido para a notificação %: %', new.id, sqlerrm;
  return new;
end;
$$;

create trigger notifications_request_push
  after insert on public.notifications
  for each row execute function public.request_push();
