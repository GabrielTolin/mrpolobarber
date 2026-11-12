-- =============================================================================
-- 5.1 · Dados iniciais (Requisitos 1.2, 1.3, 1.4; Especificação 2.11–2.13; 3.8 §5).
-- Configurações, horário semanal, almoço, os 5 serviços reais e feriados 2026–2030.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Configurações (valores por defeito da tabela = decisões validadas)
-- -----------------------------------------------------------------------------
insert into public.settings (id) values (1);

-- -----------------------------------------------------------------------------
-- Horário semanal (1.3): Seg–Sex 09:00–19:00 · Sáb 09:00–13:00 · Dom fechado
-- -----------------------------------------------------------------------------
insert into public.weekly_hours (weekday, is_open, open_time, close_time) values
  (1, true,  '09:00', '19:00'),
  (2, true,  '09:00', '19:00'),
  (3, true,  '09:00', '19:00'),
  (4, true,  '09:00', '19:00'),
  (5, true,  '09:00', '19:00'),
  (6, true,  '09:00', '13:00'),
  (7, false, null,    null);

-- Almoço 13:00–14:00 de segunda a sexta
insert into public.weekly_breaks (weekday, start_time, end_time, label)
select d, '13:00', '14:00', 'Almoço' from generate_series(1, 5) as d;

-- -----------------------------------------------------------------------------
-- Serviços (1.2 / 2.11): preços fixos; visitante começa igual ao habitual
-- -----------------------------------------------------------------------------
insert into public.services (name, duration_minutes, price_regular_cents, price_visitor_cents, sort_order) values
  ('Cabelo e barba',              45, 2000, 2000, 1),
  ('Corte de cabelo na tesoura',  50, 2000, 2000, 2),
  ('Corte de cabelo com máquina', 35, 1700, 1700, 3),
  ('Barba',                       25,  900,  900, 4),
  ('Corte de criança',            35, 1000, 1000, 5);

-- -----------------------------------------------------------------------------
-- Feriados (1.3 / 3.8 §5)
-- -----------------------------------------------------------------------------

-- Domingo de Páscoa (algoritmo gregoriano anónimo)
create function public.easter_date(p_year integer)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  a int := p_year % 19;
  b int := p_year / 100;
  c int := p_year % 100;
  d int := b / 4;
  e int := b % 4;
  f int := (b + 8) / 25;
  g int := (b - f + 1) / 3;
  h int := (19 * a + b - d - g + 15) % 30;
  i int := c / 4;
  k int := c % 4;
  l int := (32 + 2 * e + 2 * i - h - k) % 7;
  m int := (a + 11 * h + 22 * l) / 451;
begin
  return make_date(p_year, (h + l - 7 * m + 114) / 31, ((h + l - 7 * m + 114) % 31) + 1);
end;
$$;

-- Garante os feriados de um ano. Nunca mexe em dias já existentes
-- (feriados que o barbeiro desligou ou acrescentou ficam como estão).
create function public.ensure_holidays(p_year integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_easter date := public.easter_date(p_year);
begin
  insert into public.holidays (date, name, kind, is_active) values
    (make_date(p_year, 1, 1),   'Ano Novo',                          'national', true),
    (v_easter - 47,             'Carnaval',                          'custom',   false),  -- P-05: desligado por defeito
    (v_easter - 2,              'Sexta-feira Santa',                 'national', true),
    (v_easter,                  'Domingo de Páscoa',                 'national', true),
    (make_date(p_year, 4, 25),  'Dia da Liberdade',                  'national', true),
    (make_date(p_year, 5, 1),   'Dia do Trabalhador',                'national', true),
    (v_easter + 60,             'Corpo de Deus',                     'national', true),
    (make_date(p_year, 6, 10),  'Dia de Portugal',                   'national', true),
    (make_date(p_year, 8, 15),  'Assunção de Nossa Senhora',         'national', true),
    (make_date(p_year, 8, 20),  'Dia do Município de Albufeira',     'municipal', true),
    (make_date(p_year, 10, 5),  'Implantação da República',          'national', true),
    (make_date(p_year, 11, 1),  'Dia de Todos os Santos',            'national', true),
    (make_date(p_year, 12, 1),  'Restauração da Independência',      'national', true),
    (make_date(p_year, 12, 8),  'Imaculada Conceição',               'national', true),
    (make_date(p_year, 12, 25), 'Natal',                             'national', true)
  on conflict (date) do nothing;
end;
$$;

select public.ensure_holidays(y) from generate_series(2026, 2030) as y;
