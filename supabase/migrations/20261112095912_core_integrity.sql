-- =============================================================================
-- 5.1 · Integridade (Arquitetura 3.5 §3–4): updated_at, proibições de apagar,
-- regras de estado e de edição por estado (2.3, 2.6) e histórico automático (2.6).
-- Funções de trigger: a base de segurança já retira o execute a todos
-- (os triggers disparam na mesma; ninguém as chama diretamente).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- updated_at automático
-- -----------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger settings_updated_at      before update on public.settings      for each row execute function public.set_updated_at();
create trigger weekly_hours_updated_at  before update on public.weekly_hours  for each row execute function public.set_updated_at();
create trigger day_overrides_updated_at before update on public.day_overrides for each row execute function public.set_updated_at();
create trigger blocks_updated_at        before update on public.blocks        for each row execute function public.set_updated_at();
create trigger services_updated_at      before update on public.services      for each row execute function public.set_updated_at();
create trigger clients_updated_at       before update on public.clients       for each row execute function public.set_updated_at();
create trigger appointments_updated_at  before update on public.appointments  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- O que nunca se apaga (3.5 §4)
-- -----------------------------------------------------------------------------
create function public.forbid_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% em %.% não é permitido (o histórico é preservado)', tg_op, tg_table_schema, tg_table_name
    using errcode = 'P0001';
end;
$$;

create trigger appointments_no_delete before delete on public.appointments
  for each row execute function public.forbid_change();
create trigger settings_no_delete before delete on public.settings
  for each row execute function public.forbid_change();
create trigger appointment_events_append_only before update or delete on public.appointment_events
  for each row execute function public.forbid_change();

-- -----------------------------------------------------------------------------
-- Regras de estado e edição por estado (2.3, 2.6 opção A)
-- -----------------------------------------------------------------------------
create function public.appointments_guard()
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
    raise exception 'Uma marcação % já não pode ser alterada', old.status using errcode = 'P0001';
  end if;

  -- Transições de estado permitidas (2.3)
  if new.status <> old.status then
    if not (
         (old.status = 'confirmed'   and new.status in ('in_progress', 'completed', 'cancelled', 'no_show'))
      or (old.status = 'in_progress' and new.status in ('completed', 'cancelled', 'no_show'))
    ) then
      raise exception 'Transição de estado inválida: % → %', old.status, new.status using errcode = 'P0001';
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
    -- Falta: só durante a marcação, a partir do início + tolerância (2.3 regra 5).
    -- Decide pela hora real, não pelo estado guardado (3.8).
    if new.status = 'no_show' then
      select late_tolerance_minutes into v_tolerance from public.settings where id = 1;
      if now() < old.start_at + make_interval(mins => coalesce(v_tolerance, 10)) or now() >= old.end_at then
        raise exception 'A falta só pode ser registada durante a marcação, depois da tolerância' using errcode = 'P0001';
      end if;
    end if;
  end if;

  -- Em andamento: só serviço (duração/fim), preço e observações (2.6).
  if old.status = 'in_progress' then
    if new.start_at <> old.start_at
       or new.client_id <> old.client_id
       or new.client_name <> old.client_name
       or new.source <> old.source then
      raise exception 'Numa marcação em andamento só se alteram o serviço, o preço e as observações'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger appointments_guard before insert or update on public.appointments
  for each row execute function public.appointments_guard();

-- -----------------------------------------------------------------------------
-- Histórico automático (2.6): criação, alterações e mudanças de estado.
-- Quem fez: as funções da 5.7 indicam-no em app.actor ('client' | 'barber' | 'system');
-- sem indicação, utilizador autenticado = barbeiro, sem sessão = sistema.
-- -----------------------------------------------------------------------------
create function public.current_event_actor()
returns public.event_actor
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif(current_setting('app.actor', true), '')::public.event_actor,
    case when (select auth.uid()) is not null then 'barber'::public.event_actor
         else 'system'::public.event_actor end
  );
$$;

create function public.appointments_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor    public.event_actor := public.current_event_actor();
  v_actor_id uuid := (select auth.uid());
  v_field    text;
  v_old      jsonb;
  v_new      jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.appointment_events (appointment_id, actor, actor_id, type)
    values (new.id, v_actor, v_actor_id, 'created');
    return new;
  end if;

  if new.status <> old.status then
    insert into public.appointment_events (appointment_id, actor, actor_id, type, field, old_value, new_value)
    values (new.id, v_actor, v_actor_id, 'status_changed', 'status', old.status::text, new.status::text);
  end if;

  v_old := to_jsonb(old);
  v_new := to_jsonb(new);
  foreach v_field in array array[
    'start_at', 'end_at', 'client_id', 'client_name', 'total_price_cents',
    'total_duration_minutes', 'client_notes', 'is_intentional_overlap', 'cancelled_late'
  ] loop
    if v_new -> v_field is distinct from v_old -> v_field then
      insert into public.appointment_events (appointment_id, actor, actor_id, type, field, old_value, new_value)
      values (new.id, v_actor, v_actor_id, 'updated', v_field, v_old ->> v_field, v_new ->> v_field);
    end if;
  end loop;

  return new;
end;
$$;

create trigger appointments_history after insert or update on public.appointments
  for each row execute function public.appointments_history();

-- Troca de serviço numa marcação (2.6): regista "serviço antigo → novo".
create function public.appointment_services_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.service_id is distinct from old.service_id or new.price_cents <> old.price_cents then
    insert into public.appointment_events (appointment_id, actor, actor_id, type, field, old_value, new_value)
    values (
      new.appointment_id, public.current_event_actor(), (select auth.uid()), 'updated', 'service',
      format('%s (%s €)', old.service_name, to_char(old.price_cents / 100.0, 'FM999990.00')),
      format('%s (%s €)', new.service_name, to_char(new.price_cents / 100.0, 'FM999990.00'))
    );
  end if;
  return new;
end;
$$;

create trigger appointment_services_history after update on public.appointment_services
  for each row execute function public.appointment_services_history();
