-- =============================================================================
-- Correção da base de segurança (security_baseline, 20261111210855).
--
-- Problema encontrado na verificação da 4.6: a função is_admin() ficou
-- executável por PUBLIC (ACL "=X/postgres"), logo também pelo anon.
--
-- Causa: no PostgreSQL, o "alter default privileges ... IN SCHEMA public"
-- só consegue ACRESCENTAR permissões. O execute para PUBLIC vem da regra
-- GLOBAL por defeito (sem schema) e só se tira com um alter default
-- privileges SEM "in schema".
--
-- Arquitetura 3.7 regra 4: por defeito ninguém executa funções.
-- =============================================================================

-- Regra global para todas as funções que o role postgres criar daqui em diante.
alter default privileges for role postgres
  revoke execute on functions from public;

-- Funções já criadas.
revoke execute on all functions in schema public from public;

-- is_admin() continua disponível só para quem tem sessão (3.7).
grant execute on function public.is_admin() to authenticated;
