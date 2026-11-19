# MR Polo Barber — Operação

Guia para o dia a dia depois do lançamento. É para o Gabriel, que dá o suporte técnico. Prometido na 3.9 e escrito na 8.2 (2026-11-19).

**Projeto Supabase:** `sxxbenaejbdgadrsavef` · **Site:** Vercel · **Administrador:** `mathybarber01@gmail.com` (só pode haver 1).

---

## 1. O Matheus esqueceu-se da palavra-passe

1. No painel da Supabase, vai a **Authentication → Users**.
2. Procura `mathybarber01@gmail.com`.
3. No menu da linha, há duas opções:
   - **"Send password recovery"**: o Matheus recebe um email com um link e escolhe a nova palavra-passe;
   - definires tu uma palavra-passe temporária e ele muda-a no primeiro acesso.
4. Confirma que ele consegue entrar em `/admin`.

A palavra-passe nunca se escreve no Git, no chat nem em ficheiros do projeto.

## 2. Trocar o administrador

Usa-se se o Matheus mudar de email ou se outra pessoa passar a gerir o painel.

1. Cria a conta nova em **Authentication → Users → Add user**, com **"Auto Confirm User"** ligado.
2. Corre este SQL num só passo (troca `NOVO_EMAIL` pelo email da conta nova):

```sql
begin;
delete from public.admins;
insert into public.admins (user_id)
  select id from auth.users where email = 'NOVO_EMAIL' and email_confirmed_at is not null;
-- tira os aparelhos do administrador antigo (deixam de receber notificações)
delete from public.push_subscriptions where user_id not in (select user_id from public.admins);
do $$ begin
  if (select count(*) from public.admins) <> 1 then raise exception 'Troca falhou'; end if;
end $$;
commit;
```

3. A pessoa nova entra no painel e ativa as notificações em **Configurações → Este aparelho**.

## 3. Se algo falhar

| Sintoma | Onde ver | O que fazer |
|---|---|---|
| Não chegam notificações | Painel → Configurações → "Enviar notificação de teste" | Se o teste falhar, ver os registos da função `send-push` (Supabase → Edge Functions → send-push → Logs). No iPhone, confirmar que a app está no ecrã principal e as notificações permitidas. |
| Nenhuma notificação foi enviada | Tabela `notifications` (`sent_at`) | Ver se a tarefa `notifications_tick` corre: `select * from cron.job_run_details order by start_time desc limit 10;` |
| Os clientes não conseguem marcar | Página `/marcar` | Ver o horário, os bloqueios e os feriados no painel. Se a mensagem for "demasiados pedidos", é o limite anti-abuso e passa sozinho. |
| O site não abre | Vercel → Deployments | Voltar ao deploy anterior ("Promote to Production"). |
| A base de dados está em baixo | Supabase → Project status | Esperar. Se o problema durar, pedir ajuda ao suporte da Supabase. |

## 4. Tarefas automáticas (pg_cron)

| Tarefa | Quando | O que faz |
|---|---|---|
| `notifications_tick` | a cada minuto | lembretes de 5 min e resumo do dia às 08:00 |
| `purge_notifications` | 03:00 | apaga notificações antigas |
| `anonymize_inactive_clients` | 03:30 | RGPD: anonimiza clientes sem marcações há 2 anos |
| purga dos registos de pedidos | diária | apaga os registos anti-abuso ao fim de 24 horas |
