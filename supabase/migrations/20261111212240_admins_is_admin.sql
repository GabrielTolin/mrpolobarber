-- =============================================================================
-- Administrador e verificação "é administrador?" (Etapa 4.6, opção A).
--
-- Arquitetura: 3.2 (tabela admins), 3.4 (campos), 3.7 (is_admin, RLS),
-- 3.9 (só o administrador definido entra no painel).
-- O barbeiro é inserido aqui mais tarde pelo Gabriel (tarefa G-3), por SQL.
-- =============================================================================

create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admins is
  'Quem é administrador do painel. No máximo 1 linha na v1 (o barbeiro).';

-- No máximo um administrador na v1 (3.3 regra 6).
create unique index admins_single_row on public.admins ((true));

alter table public.admins enable row level security;

-- O administrador só lê a própria linha. Ninguém cria, altera ou apaga pelo site.
create policy admins_select_own on public.admins
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete, truncate on public.admins from authenticated;

-- -----------------------------------------------------------------------------
-- is_admin(): usada pelo painel (RotaAdmin) e por todas as políticas RLS futuras.
-- SECURITY DEFINER para poder ler admins sem depender das políticas;
-- search_path vazio para não poder ser enganada por objetos com o mesmo nome.
-- -----------------------------------------------------------------------------
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

comment on function public.is_admin() is
  'Verdadeiro se o utilizador autenticado é o administrador (3.7).';

-- A base de segurança já tira o execute a todos; só o authenticated o recebe.
grant execute on function public.is_admin() to authenticated;
