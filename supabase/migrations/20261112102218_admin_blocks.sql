-- =============================================================================
-- 5.4 · Bloqueios, folgas e férias pelo painel (Especificação 2.12; Arquitetura 3.6, 3.7).
--
-- - Fila única da agenda (3.6, camada 1): lock_agenda() serializa tudo o que
--   mexe na agenda. Usada aqui e, na 5.7, pelas marcações.
-- - admin_save_block: padrão "verificar → avisar → confirmar" (3.6 §4).
--   Sem confirmação devolve as marcações afetadas e não grava;
--   com confirmação grava e marca as marcações mantidas como sobreposição
--   intencional (2.12 regra 5). Nunca cancela nada sozinho (2.12 regra 4).
-- - As horas chegam em hora de Lisboa ("timestamp" sem fuso) e são convertidas
--   aqui, para a mudança de hora ficar tratada num só sítio (3.1, decisão 7).
-- =============================================================================

create function public.lock_agenda()
returns void
language sql
set search_path = ''
as $$
  select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('mrpolobarber:agenda'));
$$;

create function public.require_admin()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not coalesce(public.is_admin(), false) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
end;
$$;

-- Marcações ativas que se sobrepõem a um período (para os avisos).
create function public.active_appointments_between(p_start timestamptz, p_end timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', a.id,
           'start_at', a.start_at,
           'end_at', a.end_at,
           'client_name', a.client_name,
           'client_phone', c.phone_e164,
           'services', (select string_agg(s.service_name, ' + ' order by s.position)
                          from public.appointment_services s where s.appointment_id = a.id)
         ) order by a.start_at), '[]'::jsonb)
  from public.appointments a
  join public.clients c on c.id = a.client_id
  where a.status in ('confirmed', 'in_progress')
    and tstzrange(a.start_at, a.end_at, '[)') && tstzrange(p_start, p_end, '[)');
$$;

-- Criar ou alterar um bloqueio (p_id null = novo).
create function public.admin_save_block(
  p_id          uuid,
  p_kind        public.block_kind,
  p_start_local timestamp,
  p_end_local   timestamp,
  p_reason      text default null,
  p_confirm     boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start    timestamptz := p_start_local at time zone 'Europe/Lisbon';
  v_end      timestamptz := p_end_local   at time zone 'Europe/Lisbon';
  v_affected jsonb;
  v_id       uuid;
begin
  perform public.require_admin();
  perform public.lock_agenda();

  if v_end <= v_start then
    raise exception 'O fim tem de ser depois do início' using errcode = '22023';
  end if;

  v_affected := public.active_appointments_between(v_start, v_end);

  if jsonb_array_length(v_affected) > 0 and not p_confirm then
    return jsonb_build_object('saved', false, 'affected', v_affected);
  end if;

  perform set_config('app.actor', 'barber', true);

  if p_id is null then
    insert into public.blocks (kind, start_at, end_at, reason, created_by)
    values (p_kind, v_start, v_end, nullif(btrim(p_reason), ''), (select auth.uid()))
    returning id into v_id;
  else
    update public.blocks
       set kind = p_kind, start_at = v_start, end_at = v_end, reason = nullif(btrim(p_reason), '')
     where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Bloqueio não encontrado' using errcode = 'P0002';
    end if;
  end if;

  -- Marcações mantidas dentro do bloqueio = sobreposição intencional (2.12 regra 5).
  update public.appointments
     set is_intentional_overlap = true
   where id in (select (x ->> 'id')::uuid from jsonb_array_elements(v_affected) x)
     and status = 'confirmed'
     and not is_intentional_overlap;

  return jsonb_build_object('saved', true, 'id', v_id, 'affected', v_affected);
end;
$$;

create function public.admin_delete_block(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  perform public.lock_agenda();
  delete from public.blocks where id = p_id;
end;
$$;

-- Só o painel (authenticated + is_admin verificado dentro) usa estas duas.
grant execute on function public.admin_save_block(uuid, public.block_kind, timestamp, timestamp, text, boolean) to authenticated;
grant execute on function public.admin_delete_block(uuid) to authenticated;
