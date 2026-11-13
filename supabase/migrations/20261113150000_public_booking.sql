-- =============================================================================
-- 6.1 · Funções públicas da área de marcações
--       (Arquitetura 3.6 §2 e §4, 3.7 §3–4, 3.8 §4, 3.9 §2; Especificação 2.1, 2.5, 2.7).
--
-- O público (anon) NÃO lê tabelas: só executa estas funções.
--   Leitura ....... public_info · public_services · available_days · available_times
--   Preço ......... quote_price
--   Marcação ...... create_booking (fila, revalidação, idempotência, bloqueado,
--                   limite por telemóvel, campo armadilha, código só em hash)
--   Link pessoal .. get_booking · cancel_booking
-- Todas com limite de pedidos (rate_limits, IP guardado só como hash) e
-- limpeza dos registos com mais de 24 h (cron).
--
-- Erros de negócio voltam como { ok: false, error: 'CÓDIGO' } (3.6 §4) para o
-- site mostrar a mensagem certa. As notificações ao barbeiro ficam para a
-- etapa das notificações.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Segredo interno (pepper): torna os hashes de IP/telemóvel e os códigos do
--    link impossíveis de calcular por fora. Ninguém o lê (RLS sem políticas).
-- -----------------------------------------------------------------------------
create table public.app_secrets (
  id          smallint primary key default 1 check (id = 1),
  pepper      bytea not null default extensions.gen_random_bytes(32),
  created_at  timestamptz not null default now()
);
alter table public.app_secrets enable row level security;  -- sem políticas: só funções do servidor
revoke all on public.app_secrets from anon, authenticated;
insert into public.app_secrets default values;

-- -----------------------------------------------------------------------------
-- 2. Auxiliares internas (sem permissão para ninguém de fora)
-- -----------------------------------------------------------------------------

-- Hash com o segredo (HMAC-SHA256, hex). Usado para IP e telemóvel nos limites.
create function public.private_hash(p_value text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select encode(extensions.hmac(convert_to(coalesce(p_value, ''), 'UTF8'),
                                (select pepper from public.app_secrets where id = 1), 'sha256'), 'hex');
$$;

-- IP de quem faz o pedido (1.º endereço do x-forwarded-for), só em hash.
create function public.request_ip_hash()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select public.private_hash(coalesce(nullif(btrim(split_part(
           nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ',', 1)), ''),
         'desconhecido'));
$$;

-- Conta um pedido na janela atual; devolve false se passou do limite.
create function public.hit_rate_limit(p_key text, p_limit integer, p_window interval)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, date_bin(p_window, now(), timestamptz '2000-01-01 00:00:00+00'), 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into v_count;
  return v_count <= p_limit;
end;
$$;

-- Leituras públicas: 120 por minuto por IP (3.7 §4).
create function public.check_read_limit()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.hit_rate_limit('read:' || public.request_ip_hash(), 120, interval '1 minute') then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
end;
$$;

-- Mesmas regras que normalizarTelefone() do site (src/lib/telefone.js):
-- tira espaços/pontuação, 00 → +, 9 dígitos a começar por 2 ou 9 → +351. Inválido = null.
create function public.normalize_phone(p_raw text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := regexp_replace(coalesce(p_raw, ''), '[\s().-]', '', 'g');
begin
  if v like '00%' then
    v := '+' || substr(v, 3);
  end if;
  if v ~ '^[29][0-9]{8}$' then
    v := '+351' || v;
  end if;
  return case when v ~ '^\+[1-9][0-9]{6,14}$' then v end;
end;
$$;

-- Código do link pessoal (3.9): 32 bytes (HMAC-SHA256 da chave do pedido com o
-- segredo) em base64 para URL, ~43 caracteres. É imprevisível sem o segredo e
-- sai IGUAL se o mesmo pedido for repetido — é isso que permite devolver o mesmo
-- código num duplo clique ou numa nova tentativa (2.5), guardando só o hash.
create function public.manage_code_for(p_idempotency_key uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select rtrim(translate(encode(extensions.hmac(convert_to(p_idempotency_key::text, 'UTF8'),
                                                (select pepper from public.app_secrets where id = 1), 'sha256'),
                                'base64'), '+/', '-_'), '=');
$$;

create function public.manage_code_hash(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(convert_to(coalesce(p_code, ''), 'UTF8'), 'sha256'), 'hex');
$$;

-- Resumo de uma marcação para o cliente. Estado "efetivo" pela hora (3.8 §1).
create function public.booking_summary(p_id uuid)
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
    'can_cancel',       a.status = 'confirmed' and now() < a.start_at - make_interval(mins => st.cancel_notice_minutes)
  )
  from public.appointments a
  join public.appointment_services sv on sv.appointment_id = a.id and sv.position = 1
  cross join public.settings st
  where a.id = p_id and st.id = 1;
$$;

create function public.public_error(p_code text, p_extra jsonb default '{}'::jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object('ok', false, 'error', p_code) || p_extra;
$$;

-- -----------------------------------------------------------------------------
-- 3. Leitura pública
-- -----------------------------------------------------------------------------

-- Dados da barbearia e horário semanal (3.7 §3). Sem configurações internas.
create function public.public_info()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.check_read_limit();
  return (
    select jsonb_build_object(
      'business_name',         s.business_name,
      'owner_name',            s.owner_name,
      'address',               s.address,
      'map_url',               s.map_url,
      'whatsapp_phone',        s.whatsapp_phone,
      'privacy_policy_url',    s.privacy_policy_url,
      'max_days_ahead',        s.max_days_ahead,
      'cancel_notice_minutes', s.cancel_notice_minutes,
      'max_active_per_phone',  s.max_active_per_phone,
      'weekly_hours', (
        select jsonb_agg(jsonb_build_object(
                 'weekday',    h.weekday,
                 'is_open',    h.is_open,
                 'open_time',  to_char(h.open_time, 'HH24:MI'),
                 'close_time', to_char(h.close_time, 'HH24:MI'),
                 'breaks', coalesce((
                   select jsonb_agg(jsonb_build_object('start', to_char(b.start_time, 'HH24:MI'),
                                                       'end',   to_char(b.end_time, 'HH24:MI'))
                                    order by b.start_time)
                   from public.weekly_breaks b where b.weekday = h.weekday), '[]'::jsonb))
               order by h.weekday)
        from public.weekly_hours h)
    )
    from public.settings s
    where s.id = 1
  );
end;
$$;

-- Serviços ativos SEM preços (2.1, 2.7).
create function public.public_services()
returns table (id uuid, name text, description text, duration_minutes integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.check_read_limit();
  return query
  select s.id, s.name, s.description, s.duration_minutes
  from public.services s
  where s.is_active
  order by s.sort_order, s.name;
end;
$$;

-- Dias com pelo menos um horário livre para o serviço (calendário, 2.1 passo 3).
create function public.available_days(p_service_id uuid, p_from date, p_to date)
returns setof date
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.check_read_limit();
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 62 then
    raise exception 'Intervalo de datas inválido' using errcode = '22023';
  end if;
  return query
  select d::date
  from generate_series(p_from, p_to, interval '1 day') as d
  where exists (select 1 from public.available_slots(p_service_id, d::date));
end;
$$;

-- Horas livres num dia (2.1 passo 4). Versão pública de available_slots, que
-- continua só do painel (tem o parâmetro p_exclude, que o público não deve usar).
create function public.available_times(p_service_id uuid, p_date date)
returns table (start_at timestamptz, time_local text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.check_read_limit();
  return query
  select t, to_char(t at time zone 'Europe/Lisbon', 'HH24:MI')
  from public.available_slots(p_service_id, p_date) as t;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Preço pelo telemóvel (2.7): habitual só se o barbeiro o marcou como tal.
--    30 por hora por IP, para não dar para "testar" muitos números.
-- -----------------------------------------------------------------------------
create function public.quote_price(p_service_id uuid, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := public.normalize_phone(p_phone);
  v_price integer;
begin
  if not public.hit_rate_limit('quote:' || public.request_ip_hash(), 30, interval '1 hour') then
    return public.public_error('RATE_LIMITED');
  end if;
  if v_phone is null then
    return public.public_error('INVALID_PHONE');
  end if;

  select case when c.is_regular then s.price_regular_cents else s.price_visitor_cents end
    into v_price
    from public.services s
    left join public.clients c on c.phone_e164 = v_phone
   where s.id = p_service_id and s.is_active;
  if not found then
    return public.public_error('SERVICE_UNAVAILABLE');
  end if;

  return jsonb_build_object('ok', true, 'price_cents', v_price);
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Criar marcação online (3.6 §4)
-- -----------------------------------------------------------------------------
create function public.create_booking(
  p_service_id      uuid,
  p_start_at        timestamptz,
  p_name            text,
  p_phone           text,
  p_notes           text default null,
  p_idempotency_key uuid default null,
  p_website         text default null   -- campo armadilha: escondido no formulário; pessoas deixam-no vazio
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

  -- 1. Pedido repetido (duplo clique, nova tentativa): devolve a mesma marcação e o mesmo código.
  select id into v_id from public.appointments where idempotency_key = p_idempotency_key;
  if found then
    return public.booking_summary(v_id) || jsonb_build_object('code', public.manage_code_for(p_idempotency_key));
  end if;

  -- 2. Anti-bot e limites de pedidos (3.7 §4)
  if coalesce(p_website, '') <> '' then
    return public.public_error('REJECTED');
  end if;
  if not public.hit_rate_limit('book-ip:' || public.request_ip_hash(), 5, interval '1 hour') then
    return public.public_error('RATE_LIMITED');
  end if;

  -- 3. Dados do formulário
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

  -- 4. Fila da agenda: daqui para a frente, um pedido de cada vez (3.6 camada 1)
  perform public.lock_agenda();

  -- O pedido igual pode ter entrado enquanto esperávamos na fila.
  select id into v_id from public.appointments where idempotency_key = p_idempotency_key;
  if found then
    return public.booking_summary(v_id) || jsonb_build_object('code', public.manage_code_for(p_idempotency_key));
  end if;

  -- 5. Revalidar tudo (3.6 camada 2)
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

  -- 6. Cliente pelo telemóvel: existente não é alterado (RN-11); novo = visitante.
  select * into v_client from public.clients where phone_e164 = v_phone;
  if found then
    if v_client.is_blocked then
      return public.public_error('PHONE_BLOCKED');
    end if;
    select count(*) into v_active
      from public.appointments
     where client_id = v_client.id and status in ('confirmed', 'in_progress') and end_at > now();
    if v_active >= v_set.max_active_per_phone then
      return public.public_error('LIMIT_REACHED', jsonb_build_object('limit', v_set.max_active_per_phone));
    end if;
  else
    insert into public.clients (name, phone_e164, created_via)
    values (v_name, v_phone, 'online')
    returning * into v_client;
  end if;

  -- 7. Gravar (preço pela categoria, 2.7; histórico com ator "cliente")
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

  -- 8. O código vai UMA vez para o cliente; na base de dados fica só o hash (3.9).
  return public.booking_summary(v_id) || jsonb_build_object('code', public.manage_code_for(p_idempotency_key));
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Link pessoal (3.9): ver e cancelar. 30 por hora por IP (as duas juntas).
-- -----------------------------------------------------------------------------
create function public.get_booking(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.hit_rate_limit('link:' || public.request_ip_hash(), 30, interval '1 hour') then
    return public.public_error('RATE_LIMITED');
  end if;
  select id into v_id from public.appointments where manage_token_hash = public.manage_code_hash(p_code);
  if not found then
    return public.public_error('NOT_FOUND');
  end if;
  return public.booking_summary(v_id);
end;
$$;

-- Cancelar pelo cliente: só confirmada e até cancel_notice_minutes antes (1.5, 2.6).
create function public.cancel_booking(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appt   public.appointments%rowtype;
  v_notice integer;
begin
  if not public.hit_rate_limit('link:' || public.request_ip_hash(), 30, interval '1 hour') then
    return public.public_error('RATE_LIMITED');
  end if;

  perform public.lock_agenda();

  select * into v_appt from public.appointments where manage_token_hash = public.manage_code_hash(p_code) for update;
  if not found then
    return public.public_error('NOT_FOUND');
  end if;
  if v_appt.status = 'cancelled' then
    return public.public_error('ALREADY_CANCELLED');
  end if;

  select cancel_notice_minutes into v_notice from public.settings where id = 1;
  if v_appt.status <> 'confirmed' or now() >= v_appt.start_at - make_interval(mins => v_notice) then
    return public.public_error('TOO_LATE_TO_CANCEL');
  end if;

  perform set_config('app.actor', 'client', true);
  update public.appointments
     set status = 'cancelled', cancelled_by = 'client', cancelled_at = now()
   where id = v_appt.id;

  return public.booking_summary(v_appt.id);
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. Limpeza dos registos de limite de pedidos com mais de 24 h (3.8 §4, RGPD)
-- -----------------------------------------------------------------------------
create function public.purge_rate_limits()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.rate_limits where window_start < now() - interval '24 hours';
$$;

select cron.schedule('purge_rate_limits', '17 * * * *', 'select public.purge_rate_limits()');

-- -----------------------------------------------------------------------------
-- 8. Permissões: só as funções públicas, para o público e para o painel.
--    As auxiliares (hashes, limites, resumo…) não ficam acessíveis a ninguém de fora.
-- -----------------------------------------------------------------------------
grant execute on function public.public_info()                                       to anon, authenticated;
grant execute on function public.public_services()                                   to anon, authenticated;
grant execute on function public.available_days(uuid, date, date)                    to anon, authenticated;
grant execute on function public.available_times(uuid, date)                         to anon, authenticated;
grant execute on function public.quote_price(uuid, text)                             to anon, authenticated;
grant execute on function public.create_booking(uuid, timestamptz, text, text, text, uuid, text) to anon, authenticated;
grant execute on function public.get_booking(text)                                   to anon, authenticated;
grant execute on function public.cancel_booking(text)                                to anon, authenticated;
