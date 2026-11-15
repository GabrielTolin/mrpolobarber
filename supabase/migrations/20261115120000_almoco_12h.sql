-- =============================================================================
-- Horário (pedido do barbeiro, 2026-11-15): de segunda a sexta o almoço passa
-- de 13:00–14:00 para 12:00–14:00. Abertura 09:00 e fecho 19:00 mantêm-se.
-- Sábado (09:00–13:00, sem almoço) e domingo (fechado) não mudam.
-- Só altera as pausas "Almoço" que ainda estão 13:00–14:00 (não mexe noutras
-- pausas que o barbeiro tenha criado no painel).
-- =============================================================================
update public.weekly_breaks
   set start_time = '12:00'
 where weekday between 1 and 5
   and label = 'Almoço'
   and start_time = '13:00'
   and end_time = '14:00';
