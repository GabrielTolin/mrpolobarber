-- =============================================================================
-- 5.1 · Segurança das tabelas do núcleo (Arquitetura 3.7 §1–2).
-- RLS em todas · nenhuma política para anon · tudo verificado com is_admin().
-- Marcações e bloqueios: o barbeiro LÊ diretamente, mas escreve só pelas funções
-- (fila da agenda + avisos, 3.6), que chegam na 5.4 e na 5.7.
-- =============================================================================

alter table public.settings             enable row level security;
alter table public.weekly_hours         enable row level security;
alter table public.weekly_breaks        enable row level security;
alter table public.day_overrides        enable row level security;
alter table public.holidays             enable row level security;
alter table public.blocks               enable row level security;
alter table public.services             enable row level security;
alter table public.clients              enable row level security;
alter table public.appointments         enable row level security;
alter table public.appointment_services enable row level security;
alter table public.appointment_events   enable row level security;
alter table public.notifications        enable row level security;
alter table public.push_subscriptions   enable row level security;
alter table public.rate_limits          enable row level security;  -- sem políticas: só funções do servidor

-- -----------------------------------------------------------------------------
-- settings: ler e alterar (uma só linha; não se cria nem apaga)
-- -----------------------------------------------------------------------------
create policy settings_admin_select on public.settings for select to authenticated using ((select public.is_admin()));
create policy settings_admin_update on public.settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Configuração simples: o barbeiro gere diretamente
-- -----------------------------------------------------------------------------
create policy weekly_hours_admin_all on public.weekly_hours for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy weekly_breaks_admin_all on public.weekly_breaks for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy day_overrides_admin_all on public.day_overrides for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy holidays_admin_all on public.holidays for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
-- Apagar serviços/clientes com marcações é impedido pelas FKs (RESTRICT, 3.3).
create policy services_admin_all on public.services for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy clients_admin_all on public.clients for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Agenda: só leitura direta (a escrita passa pelas funções)
-- -----------------------------------------------------------------------------
create policy blocks_admin_select on public.blocks for select to authenticated using ((select public.is_admin()));
create policy appointments_admin_select on public.appointments for select to authenticated using ((select public.is_admin()));
create policy appointment_services_admin_select on public.appointment_services for select to authenticated using ((select public.is_admin()));
create policy appointment_events_admin_select on public.appointment_events for select to authenticated using ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Notificações: ler e marcar como lidas (só a coluna read_at)
-- -----------------------------------------------------------------------------
create policy notifications_admin_select on public.notifications for select to authenticated using ((select public.is_admin()));
create policy notifications_admin_update on public.notifications for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- -----------------------------------------------------------------------------
-- Dispositivos de push: cada administrador gere os seus
-- -----------------------------------------------------------------------------
create policy push_subscriptions_own_select on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_admin()));
create policy push_subscriptions_own_insert on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_admin()));
create policy push_subscriptions_own_delete on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Defesa extra: o público (anon) não tem nenhuma permissão nestas tabelas
-- (já garantido pela base de segurança; repetido para ficar explícito).
-- -----------------------------------------------------------------------------
revoke all on
  public.settings, public.weekly_hours, public.weekly_breaks, public.day_overrides, public.holidays,
  public.blocks, public.services, public.clients, public.appointments, public.appointment_services,
  public.appointment_events, public.notifications, public.push_subscriptions, public.rate_limits
from anon;
