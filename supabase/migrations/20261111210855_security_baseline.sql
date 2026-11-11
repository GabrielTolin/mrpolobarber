-- =============================================================================
-- Base de segurança (Etapa 4.5) — antes de existir qualquer tabela ou função.
--
-- Arquitetura 3.7:
--   regra 2: o público (anon) não tem acesso direto a nenhuma tabela;
--   regra 4: por defeito ninguém executa funções; cada função recebe depois
--            só a permissão de que precisa (grant execute ... explícito).
--
-- "alter default privileges" aplica-se aos objetos que forem criados DEPOIS
-- desta migration pelo role postgres (o que corre as migrations).
-- Os "revoke ... on all ..." tratam o que já existir hoje (nada, por agora).
-- =============================================================================

-- Funções: ninguém executa por defeito (nem PUBLIC, nem anon, nem authenticated).
revoke execute on all functions in schema public from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- Tabelas e sequências: o público (anon) não recebe nenhuma permissão.
-- O authenticated mantém as permissões por defeito, mas o acesso real
-- fica sempre limitado pelas políticas RLS de administrador (3.7).
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

alter default privileges for role postgres in schema public
  revoke all on tables from anon;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon;
