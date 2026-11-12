-- =============================================================================
-- 5.7 · Motor da agenda (Arquitetura 3.6; Especificação 2.2, 2.3, 2.4, 2.6).
--
-- 1. Mensagens das regras de estado em português (pendente da 5.1).
-- 2. Cálculo de horários: janelas de trabalho, ocupação e horários livres
--    (grelha + encaixe, os 7 passos da 2.4).
-- 3. Funções do painel para marcações: criar/editar com avisos ("verificar →
--    avisar → confirmar"), cancelar, cancelamento tardio, falta e notas.
--    Todas passam pela fila da agenda (lock_agenda) e verificam is_admin().
--
-- As funções PÚBLICAS (create_booking, get/cancel por link, preço, limites de
-- pedidos) e a abertura de available_* ao público ficam para a área pública.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Estados em português nas mensagens de erro
-- -----------------------------------------------------------------------------
create function public.status_label(p_status public.appointment_status)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'confirmed'   then 'confirmada'
    when 'in_progress' then 'em curso'
    when 'completed'   then 'concluída'
    when 'cancelled'   then 'cancelada'
    when 'no_show'     then 'com falta'
  end;
$$;

create or replace function public.appointments_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tolerance integer;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'confirmed' then
      raise exception 'Uma marcação nova começa sempre como confirmada' using errcode = 'P0001';
    end if;
    return new;
  end if;

  -- Estados finais (2.3 regra 6): nada muda. Exceção: marcar um cancelamento como tardio (1.6).
  if old.status in ('completed', 'cancelled', 'no_show') then
    if old.status = 'cancelled'
       and new.status = old.status
       and (to_jsonb(new) - 'cancelled_late' - 'updated_at') = (to_jsonb(old) - 'cancelled_late' - 'updated_at') then
      return new;
    end if;
    raise exception 'Uma marcação % já não pode ser alterada', public.status_label(old.status) using errcode = 'P0001';
  end if;

  if new.status <> old.status then
    if not (
         (old.status = 'confirmed'   and new.status in ('in_progress', 'completed', 'cancelled', 'no_show'))
      or (old.status = 'in_progress' and new.status in ('completed', 'cancelled', 'no_show'))
    ) then
      raise exception 'Não é possível passar de % para %', public.status_label(old.status), public.status_label(new.status)
        using errcode = 'P0001';
    end if;

    if new.status = 'in_progress' and now() < new.start_at then
      raise exception 'A marcação ainda não começou' using errcode = 'P0001';
    end if;
    if new.status = 'completed' and now() < new.end_at then
      raise exception 'A marcação ainda não terminou' using errcode = 'P0001';
    end if;
    if new.status = 'cancelled' and now() >= old.end_at then
      raise exception 'Não é possível cancelar uma marcação que já terminou' using errcode = 'P0001';
    end if;
    if new.status = 'no_show' then
      select late_tolerance_minutes into v_tolerance from public.settings where id = 1;
      if now() < old.start_at + make_interval(mins => coalesce(v_tolerance, 10)) or now() >= old.end_at then
        raise exception 'A falta só pode ser registada durante a marcação, depois da tolerância' using errcode = 'P0001';
      end if;
    end if;
  end if;

  if old.status = 'in_progress' then
    if new.start_at <> old.start_at
       or new.client_id <> old.client_id
       or new.client_name <> old.client_name
       or new.source <> old.source then
      raise exception 'Numa marcação em curso só se alteram o serviço, o preço e as observações'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Cálculo de horários (2.4)
-- -----------------------------------------------------------------------------

-- Janelas de trabalho de um dia (hora de Lisboa → instantes UTC):
-- feriado ativo = nenhuma; horário excecional substitui tudo (3.3 regra 4);
-- senão horário semanal menos as pausas.
create function public.day_windows(p_date date)
returns tstzmultirange
language plpgsql
stable
set search_path = ''
as $$
declare
  v_ov   public.day_overrides%rowtype;
  v_wh   public.weekly_hours%rowtype;
  v_win  tstzmultirange;
begin
  if exists (select 1 from public.holidays where date = p_date and is_active) then
    return '{}'::tstzmultirange;
  end if;

  select * into v_ov from public.day_overrides where date = p_date;
  if found then
    if v_ov.is_closed then
      return '{}'::tstzmultirange;
    end if;
    return tstzmultirange(tstzrange(
      (p_date + v_ov.open_time)  at time zone 'Europe/Lisbon',
      (p_date + v_ov.close_time) at time zone 'Europe/Lisbon', '[)'));
  end if;

  select * into v_wh from public.weekly_hours where weekday = extract(isodow from p_date)::smallint;
  if not found or not v_wh.is_open then
    return '{}'::tstzmultirange;
  end if;

  v_win := tstzmultirange(tstzrange(
    (p_date + v_wh.open_time)  at time zone 'Europe/Lisbon',
    (p_date + v_wh.close_time) at time zone 'Europe/Lisbon', '[)'));

  return v_win - coalesce((
    select range_agg(tstzrange(
      (p_date + b.start_time) at time zone 'Europe/Lisbon',
      (p_date + b.end_time)   at time zone 'Europe/Lisbon', '[)'))
    from public.weekly_breaks b
    where b.weekday = v_wh.weekday
  ), '{}'::tstzmultirange);
end;
$$;

-- Ocupação de um período: marcações ativas (incluindo sobreposições intencionais)
-- e bloqueios, alargados pelo intervalo entre marcações (2.4 passo 3).
create function public.busy_between(p_from timestamptz, p_to timestamptz, p_exclude uuid default null)
returns tstzmultirange
language sql
stable
set search_path = ''
as $$
  with s as (select make_interval(mins => buffer_minutes) as buf from public.settings where id = 1)
  select coalesce(range_agg(r), '{}'::tstzmultirange)
  from (
    select tstzrange(a.start_at - s.buf, a.end_at + s.buf, '[)') as r
    from public.appointments a, s
    where a.status in ('confirmed', 'in_progress')
      and (p_exclude is null or a.id <> p_exclude)
      and a.start_at < p_to + s.buf and a.end_at > p_from - s.buf
    union all
    select tstzrange(b.start_at, b.end_at, '[)')
    from public.blocks b
    where b.start_at < p_to and b.end_at > p_from
  ) x;
$$;

-- Horários livres para um serviço numa data (2.4): grelha alinhada ao relógio
-- + encaixe no início de cada janela livre; só os que cabem inteiros e
-- respeitam a antecedência mínima e o limite de dias.
create function public.available_slots(p_service_id uuid, p_date date, p_exclude uuid default null)
returns setof timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_set      public.settings%rowtype;
  v_duration interval;
  v_today    date := (now() at time zone 'Europe/Lisbon')::date;
  v_day0     timestamptz := p_date at time zone 'Europe/Lisbon';
  v_day1     timestamptz := (p_date + 1) at time zone 'Europe/Lisbon';
  v_free     tstzmultirange;
begin
  select * into v_set from public.settings where id = 1;
  select make_interval(mins => duration_minutes) into v_duration
    from public.services where id = p_service_id and is_active;
  if v_duration is null then
    return;
  end if;

  -- 1. Dia elegível
  if p_date < v_today or p_date > v_today + v_set.max_days_ahead
     or (p_date = v_today and not v_set.allow_same_day) then
    return;
  end if;

  -- 2–4. Janelas livres = janelas de trabalho − ocupação
  v_free := public.day_windows(p_date) - public.busy_between(v_day0, v_day1, p_exclude);

  -- 5–7. Candidatos (encaixe + grelha), filtrados, ordenados
  return query
  select distinct c.t
  from unnest(v_free) as w(r)
  cross join lateral (
    select lower(w.r) as t
    union
    select g from generate_series(v_day0, v_day1, make_interval(mins => v_set.slot_step_minutes)) as g
    where g >= lower(w.r) and g < upper(w.r)
  ) c
  where c.t + v_duration <= upper(w.r)
    and c.t >= now() + make_interval(mins => v_set.min_notice_minutes)
  order by c.t;
end;
$$;

-- O período cabe dentro do horário de trabalho do seu dia?
create function public.within_working_hours(p_start timestamptz, p_end timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.day_windows((p_start at time zone 'Europe/Lisbon')::date) @> tstzrange(p_start, p_end, '[)');
$$;

-- -----------------------------------------------------------------------------
-- 3. Funções do painel (marcações)
-- -----------------------------------------------------------------------------

-- Conflitos de um período com marcações ativas e bloqueios (para os avisos, 2.2).
create function public.conflicts_between(p_start timestamptz, p_end timestamptz, p_exclude uuid default null)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(x order by x ->> 'start_at'), '[]'::jsonb)
  from (
    select jsonb_build_object(
             'kind', 'appointment', 'id', a.id, 'start_at', a.start_at, 'end_at', a.end_at,
             'label', a.client_name || coalesce(' — ' || (
               select string_agg(s.service_name, ' + ' order by s.position)
               from public.appointment_services s where s.appointment_id = a.id), '')) as x
    from public.appointments a
    where a.status in ('confirmed', 'in_progress')
      and (p_exclude is null or a.id <> p_exclude)
      and tstzrange(a.start_at, a.end_at, '[)') && tstzrange(p_start, p_end, '[)')
    union all
    select jsonb_build_object(
             'kind', 'block', 'id', b.id, 'start_at', b.start_at, 'end_at', b.end_at,
             'label', case b.kind when 'slot' then 'Bloqueio' when 'day_off' then 'Folga' else 'Férias' end
                      || coalesce(' — ' || b.reason, ''))
    from public.blocks b
    where tstzrange(b.start_at, b.end_at, '[)') && tstzrange(p_start, p_end, '[)')
  ) t;
$$;

-- Criar (p_id null) ou editar uma marcação manual (2.2, 2.6).
-- Sem p_confirm devolve os avisos (fora do horário, conflitos) e não grava.
-- p_price_cents null = preço sugerido pela categoria do cliente (2.7).
create function public.admin_save_booking(
  p_id           uuid,
  p_client_id    uuid,
  p_service_id   uuid,
  p_start_local  timestamp,
  p_source       public.appointment_source,
  p_price_cents  integer default null,
  p_client_notes text default null,
  p_confirm      boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client   public.clients%rowtype;
  v_service  public.services%rowtype;
  v_old      public.appointments%rowtype;
  v_old_svc  uuid;
  v_start    timestamptz := p_start_local at time zone 'Europe/Lisbon';
  v_minutes  integer;
  v_end      timestamptz;
  v_price    integer;
  v_outside  boolean;
  v_conf     jsonb;
  v_id       uuid;
begin
  perform public.require_admin();
  perform public.lock_agenda();
  perform set_config('app.actor', 'barber', true);

  select * into v_client from public.clients where id = p_client_id;
  if not found then
    raise exception 'Cliente não encontrado' using errcode = 'P0002';
  end if;

  if p_id is not null then
    select * into v_old from public.appointments where id = p_id for update;
    if not found then
      raise exception 'Marcação não encontrada' using errcode = 'P0002';
    end if;
    select service_id into v_old_svc from public.appointment_services where appointment_id = p_id and position = 1;
  end if;

  select * into v_service from public.services where id = p_service_id;
  if not found then
    raise exception 'Serviço não encontrado' using errcode = 'P0002';
  end if;
  -- Serviços inativos não se usam em marcações novas nem como troca (2.11).
  if not v_service.is_active and p_service_id is distinct from v_old_svc then
    raise exception 'O serviço "%" está desativado', v_service.name using errcode = 'P0001';
  end if;

  -- Mantém a duração guardada se o serviço não mudou (2.11: mudar a duração do
  -- serviço não mexe nas marcações existentes).
  v_minutes := case when p_id is not null and p_service_id = v_old_svc
                    then v_old.total_duration_minutes else v_service.duration_minutes end;
  v_end := v_start + make_interval(mins => v_minutes);
  v_price := coalesce(p_price_cents,
                      case when p_id is not null and p_service_id = v_old_svc then v_old.total_price_cents
                           when v_client.is_regular then v_service.price_regular_cents
                           else v_service.price_visitor_cents end);
  if v_price < 0 then
    raise exception 'O preço não pode ser negativo' using errcode = '22023';
  end if;

  v_outside := not public.within_working_hours(v_start, v_end);
  v_conf := public.conflicts_between(v_start, v_end, p_id);

  if (v_outside or jsonb_array_length(v_conf) > 0) and not p_confirm then
    return jsonb_build_object('saved', false, 'outside_hours', v_outside, 'conflicts', v_conf,
                              'price_cents', v_price, 'end_at', v_end);
  end if;

  if p_id is null then
    insert into public.appointments (
      client_id, client_name, start_at, end_at, source, total_price_cents, total_duration_minutes,
      client_notes, is_intentional_overlap, created_by)
    values (
      v_client.id, v_client.name, v_start, v_end, p_source, v_price, v_minutes,
      nullif(btrim(p_client_notes), ''), jsonb_array_length(v_conf) > 0, (select auth.uid()))
    returning id into v_id;

    insert into public.appointment_services (appointment_id, service_id, service_name, price_cents, duration_minutes, position)
    values (v_id, v_service.id, v_service.name, v_price, v_minutes, 1);
  else
    v_id := p_id;
    update public.appointments
       set client_id = v_client.id,
           client_name = case when client_id = v_client.id then client_name else v_client.name end,
           start_at = v_start,
           end_at = v_end,
           source = p_source,
           total_price_cents = v_price,
           total_duration_minutes = v_minutes,
           client_notes = nullif(btrim(p_client_notes), ''),
           is_intentional_overlap = jsonb_array_length(v_conf) > 0
     where id = p_id;

    update public.appointment_services
       set service_id = v_service.id,
           service_name = case when service_id = v_service.id then service_name else v_service.name end,
           price_cents = v_price,
           duration_minutes = v_minutes
     where appointment_id = p_id and position = 1;
  end if;

  return jsonb_build_object('saved', true, 'id', v_id, 'outside_hours', v_outside, 'conflicts', v_conf);
end;
$$;

-- Cancelar pelo barbeiro (2.3). p_late = cancelamento tardio (o cliente avisou
-- depois do prazo; fica no histórico e não conta como falta, 1.6).
create function public.admin_cancel_booking(p_id uuid, p_late boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  perform public.lock_agenda();
  perform set_config('app.actor', 'barber', true);
  update public.appointments
     set status = 'cancelled', cancelled_by = 'barber', cancelled_at = now(), cancelled_late = p_late
   where id = p_id;
  if not found then
    raise exception 'Marcação não encontrada' using errcode = 'P0002';
  end if;
end;
$$;

-- Marcar/desmarcar um cancelamento como tardio depois de cancelado (1.6).
create function public.admin_set_cancelled_late(p_id uuid, p_late boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  perform set_config('app.actor', 'barber', true);
  update public.appointments set cancelled_late = p_late where id = p_id and status = 'cancelled';
  if not found then
    raise exception 'Só uma marcação cancelada pode ser marcada como tardia' using errcode = 'P0001';
  end if;
end;
$$;

-- Registar falta (2.3 regra 5; a janela é verificada pelo appointments_guard).
create function public.admin_mark_no_show(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  perform public.lock_agenda();
  perform set_config('app.actor', 'barber', true);
  update public.appointments set status = 'no_show' where id = p_id;
  if not found then
    raise exception 'Marcação não encontrada' using errcode = 'P0002';
  end if;
end;
$$;

-- Nota interna no histórico da marcação (2.6: em qualquer estado).
create function public.admin_add_note(p_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  if btrim(coalesce(p_note, '')) = '' then
    raise exception 'A nota está vazia' using errcode = '22023';
  end if;
  insert into public.appointment_events (appointment_id, actor, actor_id, type, note)
  values (p_id, 'barber', (select auth.uid()), 'note', btrim(p_note));
end;
$$;

-- -----------------------------------------------------------------------------
-- Permissões: só o painel (authenticated + is_admin verificado lá dentro).
-- available_slots também para o painel por agora; o público recebe-a na área pública.
-- -----------------------------------------------------------------------------
grant execute on function public.admin_save_booking(uuid, uuid, uuid, timestamp, public.appointment_source, integer, text, boolean) to authenticated;
grant execute on function public.admin_cancel_booking(uuid, boolean) to authenticated;
grant execute on function public.admin_set_cancelled_late(uuid, boolean) to authenticated;
grant execute on function public.admin_mark_no_show(uuid) to authenticated;
grant execute on function public.admin_add_note(uuid, text) to authenticated;
grant execute on function public.available_slots(uuid, date, uuid) to authenticated;
