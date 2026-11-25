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
| `notifications_tick` | a cada minuto | lembretes de 5 min ao barbeiro, resumo do dia às 08:00, lembrete aos clientes às 08:00 |
| `purge_notifications` | 03:00 | apaga notificações antigas |
| `anonymize_inactive_clients` | 03:30 | RGPD: anonimiza clientes sem marcações há 2 anos |
| purga dos registos de pedidos | diária | apaga os registos anti-abuso ao fim de 24 horas |
| `weekly_series_generate` | 03:45 | mantém as 4 semanas das marcações semanais |
| `ensure_holidays` | 1 de dezembro | feriados dos 2 anos seguintes |
| **Cópia noturna** (GitHub Actions, fora da Supabase) | 02:30 UTC | ver §5 |

## 5. Cópias de segurança (cópia noturna no GitHub)

O plano gratuito da Supabase **não guarda cópias**. A tarefa `.github/workflows/copia-noturna.yml` faz, todas as noites às 02:30 UTC:
- a cópia completa da base de dados (papéis, estrutura e dados);
- a **cifra com AES-256**, porque o repositório é público;
- o envio para o GitHub como *artifact*, guardado **30 dias**.

Nos registos não aparece nenhum dado.

### Configurar (uma vez, pelo Gabriel)
1. **Ligação à base de dados.** Na Supabase, botão **Connect** → **Session pooler** → copiar a URI e trocar `[YOUR-PASSWORD]` pela palavra-passe da base de dados. Se não a souberes, repõe-se em Project Settings → Database. O site e as funções não usam esta palavra-passe.
2. **Palavra-passe da cifra.** Escolher uma com **16 caracteres ou mais** e guardá-la no gestor de palavras-passe. **Sem ela, as cópias não servem para nada.**
3. **Segredos no GitHub.** Em `github.com/GabrielTolin/mrpolobarber` → Settings → Secrets and variables → Actions → **New repository secret**:
   - `SUPABASE_DB_URL`: a URI do passo 1;
   - `BACKUP_PASSPHRASE`: a palavra-passe do passo 2.
4. **Commit e push** do ficheiro da tarefa.
5. **Testar.** Actions → **Cópia noturna da base de dados** → **Run workflow**. Tem de ficar verde, com um *artifact* `mrpolobarber-AAAA-MM-DD`.

### Ver se está a correr
- **Actions → Cópia noturna da base de dados:** uma execução verde por noite.
- **Se ficar vermelha,** o GitHub envia um email. As causas mais comuns são um segredo em falta ou a palavra-passe da base de dados ter mudado; nesse caso, atualizar o `SUPABASE_DB_URL`.

### Restaurar (com cuidado; de preferência com ajuda)
1. **Descarregar.** Actions → a execução do dia → **Artifacts** → descarregar e descompactar. Fica `mrpolobarber-AAAA-MM-DD.tar.gz.gpg`.
2. **Decifrar** (no Git Bash):
   ```bash
   gpg -d mrpolobarber-AAAA-MM-DD.tar.gz.gpg > copia.tar.gz && mkdir copia && tar -xzf copia.tar.gz -C copia
   ```
3. **Repor num projeto Supabase NOVO**, nunca por cima da produção sem antes fazer uma cópia dela:
   ```bash
   psql --single-transaction --variable ON_ERROR_STOP=1 --file copia/roles.sql --file copia/schema.sql --command 'SET session_replication_role = replica' --file copia/data.sql --dbname "<URI do projeto novo>"
   ```
4. **Apontar o site para o projeto novo.** Mudar as variáveis `VITE_SUPABASE_*` na Vercel, voltar a publicar a Edge Function `send-push` e os segredos dela, e criar outra vez o segredo `send_push_secret` no Vault.

**Cópias manuais** (feitas pelo Claude, em JSON, fora do repositório): `Desktop\mrpolobarber-backups\`. Têm dados pessoais; guardar em lugar privado.
