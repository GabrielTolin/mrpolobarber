-- =============================================================================
-- 5.9 · Estados automáticos (Arquitetura 3.8 §1 e §5; Especificação 2.3 regras 2, 3, 8).
--
-- - pg_cron: tarefas agendadas dentro do PostgreSQL (não dependem do PWA aberto).
-- - advance_statuses (cada minuto): confirmed → in_progress na hora de início;
--   → completed na hora de fim. Cada mudança fica no histórico com ator "sistema".
--   As regras que dependem da hora já decidem pela hora real (3.8), por isso um
--   atraso do cron nunca muda uma decisão.
-- - ensure_holidays (1 de dezembro): garante os feriados dos 2 anos seguintes.
-- =============================================================================

create extension if not exists pg_cron;

create function public.advance_statuses()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.actor', 'system', true);

  -- Já terminaram (inclui as que o cron apanha atrasadas e ainda estão "confirmed").
  update public.appointments
     set status = 'completed'
   where status in ('confirmed', 'in_progress')
     and end_at <= now();

  -- Já começaram e ainda não terminaram.
  update public.appointments
     set status = 'in_progress'
   where status = 'confirmed'
     and start_at <= now()
     and end_at > now();
end;
$$;

comment on function public.advance_statuses() is
  'Avança os estados pela hora (3.8). Corre a cada minuto via pg_cron. Ninguém a executa diretamente.';

-- Tarefas agendadas (cron.schedule com o mesmo nome substitui a anterior).
select cron.schedule('advance_statuses', '* * * * *', 'select public.advance_statuses()');

select cron.schedule(
  'ensure_holidays',
  '0 3 1 12 *',   -- 1 de dezembro, 03:00 UTC
  $$select public.ensure_holidays(extract(year from now())::int + 1);
    select public.ensure_holidays(extract(year from now())::int + 2);$$
);
