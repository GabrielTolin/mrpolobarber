-- =============================================================================
-- P-01 (decisão do Gabriel, 2026-11-15) · "Tenho cadastro" na página de entrada.
-- Ao carregar em "Marcar horário" o cliente escolhe "Visitante / 1.ª vez" ou
-- "Tenho cadastro". No 2.º caso escreve o telemóvel, e esta função diz SÓ se
-- esse número está registado como HABITUAL (pelo barbeiro). Nada mais da ficha.
--
-- O preço continua a ser decidido pelo servidor a partir do telemóvel
-- (quote_price / create_booking não mudam): escolher "Tenho cadastro" com um
-- número que não é habitual não dá preço de habitual; um habitual que escolha
-- "Visitante" paga o habitual na mesma.
-- Revela se um número é habitual — o mesmo efeito já aceite na 1.7 (a diferença
-- de preço na revisão) — e por isso partilha o limite do quote_price (30/h por IP).
-- =============================================================================
create function public.check_regular(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := public.normalize_phone(p_phone);
begin
  if not public.hit_rate_limit('quote:' || public.request_ip_hash(), 30, interval '1 hour') then
    return public.public_error('RATE_LIMITED');
  end if;
  if v_phone is null then
    return public.public_error('INVALID_PHONE');
  end if;
  return jsonb_build_object(
    'ok', true,
    'regular', exists (select 1 from public.clients where phone_e164 = v_phone and is_regular and not is_blocked)
  );
end;
$$;

grant execute on function public.check_regular(text) to anon, authenticated;

-- quote_price passa a devolver também "regular" (para a revisão mostrar
-- "Preço de cliente habitual" / "Preço de visitante"). O cálculo não muda.
create or replace function public.quote_price(p_service_id uuid, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone   text := public.normalize_phone(p_phone);
  v_price   integer;
  v_regular boolean;
begin
  if not public.hit_rate_limit('quote:' || public.request_ip_hash(), 30, interval '1 hour') then
    return public.public_error('RATE_LIMITED');
  end if;
  if v_phone is null then
    return public.public_error('INVALID_PHONE');
  end if;

  select coalesce(c.is_regular, false),
         case when c.is_regular then s.price_regular_cents else s.price_visitor_cents end
    into v_regular, v_price
    from public.services s
    left join public.clients c on c.phone_e164 = v_phone
   where s.id = p_service_id and s.is_active;
  if not found then
    return public.public_error('SERVICE_UNAVAILABLE');
  end if;

  return jsonb_build_object('ok', true, 'price_cents', v_price, 'regular', v_regular);
end;
$$;
