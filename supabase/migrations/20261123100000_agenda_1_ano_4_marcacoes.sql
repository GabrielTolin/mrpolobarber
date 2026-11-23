-- =============================================================================
-- Regras novas (pedido do Gabriel, 2026-11-23):
--   • a agenda pública abre até 1 ANO à frente (antes 30 dias; o máximo permitido era 180);
--   • cada telemóvel pode ter até 4 marcações futuras ativas (antes 2), para o
--     cliente poder marcar também para o filho no próprio nome.
-- As marcações da marcação semanal continuam a não contar para este limite (D6).
-- =============================================================================
alter table public.settings drop constraint settings_max_days_ahead_check;
alter table public.settings add constraint settings_max_days_ahead_check check (max_days_ahead between 1 and 366);

update public.settings set max_days_ahead = 365, max_active_per_phone = 4 where id = 1;
