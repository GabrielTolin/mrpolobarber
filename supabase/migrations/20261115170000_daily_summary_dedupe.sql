-- =============================================================================
-- 7.1 (correção) · Resumo do dia: a verificação "já enviado hoje" passa a usar
-- o dia REAL de hoje (hora de Lisboa), e não o dia do parâmetro p_agora.
-- Em produção p_agora = now(), por isso o comportamento é o mesmo; assim fica
-- também correto nos testes e se a tarefa correr atrasada perto da meia-noite.
-- =============================================================================
create or replace function public.send_daily_summary(p_agora timestamptz default now())
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_set      public.settings%rowtype;
  v_local    timestamp := p_agora at time zone 'Europe/Lisbon';
  v_hoje     date := v_local::date;
  v_n        integer;
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
  -- Já enviado hoje? (uma vez por dia; hoje = dia real em Lisboa)
  if exists (
    select 1 from public.notifications
    where type = 'daily_summary'
      and (created_at at time zone 'Europe/Lisbon')::date = (now() at time zone 'Europe/Lisbon')::date
  ) then
    return false;
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
