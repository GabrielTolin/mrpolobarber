-- =============================================================================
-- 8.1 · RGPD: anonimização automática dos clientes inativos (P-03; Arquitetura
-- 3.4 "Dados de clientes e RGPD"; política de privacidade 6.6).
-- Prazo decidido pelo Gabriel a 2026-11-15: 2 ANOS sem marcações.
--
-- Os clientes com histórico não se apagam (as marcações ficam para estatística),
-- por isso tiram-se os dados que identificam a pessoa:
--   ficha ............ nome → "Cliente anonimizado", telemóvel, notas, habitual, bloqueado
--   marcações ........ nome escrito e observações
--   histórico ........ valores antigos/novos de nome e observações, e notas internas
-- As proteções (marcações terminadas imutáveis, histórico só de acrescentar) só
-- deixam passar ESTA operação (app.anonimizar = on) e só nestes campos.
-- Tarefa diária às 03:30.
-- =============================================================================

alter table public.clients add column anonymized_at timestamptz;
comment on column public.clients.anonymized_at is 'Quando os dados pessoais foram anonimizados (RGPD, 8.1).';

-- Um cliente online anonimizado deixa de ter telemóvel.
alter table public.clients drop constraint clients_check;
alter table public.clients add constraint clients_check
  check (created_via <> 'online' or phone_e164 is not null or anonymized_at is not null);

-- Marcações: durante a anonimização só podem mudar o nome e as observações.
create or replace function public.appointments_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tolerance integer;
begin
  if tg_op = 'UPDATE' and current_setting('app.anonimizar', true) = 'on' then
    if (to_jsonb(new) - 'client_name' - 'client_notes' - 'updated_at') = (to_jsonb(old) - 'client_name' - 'client_notes' - 'updated_at') then
      return new;
    end if;
    raise exception 'A anonimização só pode mudar o nome e as observações' using errcode = 'P0001';
  end if;

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

-- Histórico: a anonimização não regista "nome antigo → novo" (seria guardar o nome
-- outra vez); fica só uma nota de sistema a dizer que houve anonimização.
create or replace function public.appointments_history()
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

  if current_setting('app.anonimizar', true) = 'on' then
    insert into public.appointment_events (appointment_id, actor, type, note)
    values (new.id, 'system', 'note', 'Dados do cliente anonimizados (RGPD)');
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

-- Histórico só de acrescentar, EXCETO a anonimização a limpar textos pessoais
-- (valores de nome/observações e notas). Apagar continua proibido.
create function public.appointment_events_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and current_setting('app.anonimizar', true) = 'on'
     and (to_jsonb(new) - 'old_value' - 'new_value' - 'note') = (to_jsonb(old) - 'old_value' - 'new_value' - 'note') then
    return new;
  end if;
  raise exception '% em %.% não é permitido (o histórico é preservado)', tg_op, tg_table_schema, tg_table_name
    using errcode = 'P0001';
end;
$$;

drop trigger appointment_events_append_only on public.appointment_events;
create trigger appointment_events_append_only before update or delete on public.appointment_events
  for each row execute function public.appointment_events_guard();

-- A anonimização. p_agora só serve para os testes.
create function public.anonymize_inactive_clients(p_agora timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limite timestamptz := p_agora - interval '2 years';
  v_ids    uuid[];
begin
  select coalesce(array_agg(c.id), '{}') into v_ids
  from public.clients c
  where c.anonymized_at is null
    and c.created_at < v_limite
    and not exists (select 1 from public.appointments a where a.client_id = c.id and a.start_at >= v_limite);

  if cardinality(v_ids) = 0 then
    return 0;
  end if;

  perform set_config('app.anonimizar', 'on', true);
  perform set_config('app.actor', 'system', true);

  update public.appointment_events e
     set old_value = case when e.field in ('client_name', 'client_notes') then null else e.old_value end,
         new_value = case when e.field in ('client_name', 'client_notes') then null else e.new_value end,
         note      = case when e.type = 'note' then '(nota apagada na anonimização)' else e.note end
    from public.appointments a
   where a.id = e.appointment_id
     and a.client_id = any(v_ids)
     and (e.field in ('client_name', 'client_notes') or e.type = 'note');

  update public.appointments
     set client_name = 'Cliente anonimizado', client_notes = null
   where client_id = any(v_ids);

  update public.clients
     set name = 'Cliente anonimizado', phone_e164 = null, notes = null,
         is_regular = false, is_blocked = false, anonymized_at = p_agora
   where id = any(v_ids);

  perform set_config('app.anonimizar', '', true);
  return cardinality(v_ids);
end;
$$;

select cron.schedule('anonymize_inactive_clients', '30 3 * * *', 'select public.anonymize_inactive_clients()');
