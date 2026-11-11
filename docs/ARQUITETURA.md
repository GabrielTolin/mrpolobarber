# MR Polo Barber — Arquitetura e Base de Dados

**Etapa 3 — Arquitetura e banco de dados** · **Validada** a 2026-11-11

Define **como** o sistema é construído para cumprir o [Documento de Requisitos](REQUISITOS.md) (v1.2) e a [Especificação Funcional](ESPECIFICACAO.md) (validada). Não se programa antes de fechar esta etapa. Em caso de dúvida, prevalecem os requisitos e a especificação.

| Subetapa | Tema | Estado |
|---|---|---|
| 3.1 | Arquitetura geral do sistema | ✅ Validado |
| 3.2 | Organização da base de dados | ✅ Validado |
| 3.3 | Relacionamentos entre tabelas | ✅ Validado |
| 3.4 | Estrutura dos campos | ✅ Validado |
| 3.5 | Regras e integridade dos dados | ✅ Validado |
| 3.6 | Disponibilidade e concorrência | ✅ Validado |
| 3.7 | Segurança e permissões (RLS) | ✅ Validado |
| 3.8 | Automações e processos do backend | ✅ Validado |
| 3.9 | Autenticação e reconhecimento de clientes | ✅ Validado |
| 3.10 | Integrações e serviços externos | ✅ Validado |
| 3.11 | Revisão da arquitetura | ✅ Validado |

**Âmbito confirmado (2026-11-11), mantendo as decisões anteriores:**
- **3.9:** login do administrador; a palavra-passe é reposta pelo Gabriel no painel Supabase (2.2 / 2.14); "Lembrar neste dispositivo" e link pessoal (2.10). **Sem SMS e sem recuperação por email na v1** (P-10, P-11 futuros).
- **3.10:** Web Push e `pg_cron`. SMS e email ficam só listados como integrações futuras.

### Tecnologias

| Componente | Tecnologia |
|---|---|
| Frontend | React 19 + Vite 8 |
| Linguagem | JavaScript |
| Estilos | Tailwind CSS 4 |
| Rotas | React Router |
| Ícones | lucide-react |
| Backend / BaaS | Supabase |
| Base de dados | PostgreSQL 17 |
| Lógica no servidor | Funções PostgreSQL (RPC) + Supabase Edge Functions |
| Tarefas agendadas | `pg_cron` |
| Autenticação | Supabase Auth |
| Segurança | Supabase RLS |
| PWA | Manifest + Service Worker |
| Notificações | Notifications API + Web Push (VAPID) |
| Migrations | Supabase CLI (`supabase db push`), ficheiros versionados em `supabase/migrations/` |
| Deploy | Vercel |
| Versionamento | Git + GitHub |

---

## 3.1 — Arquitetura geral do sistema ✅

### Visão geral

```
                         ┌──────────────────────────────┐
  Cliente (telemóvel) ──▶│  Vercel — site estático       │◀── Barbeiro (PWA no iPhone)
                         │  React SPA (build do Vite)    │
                         │  /          área pública       │
                         │  /m/:token  link pessoal       │
                         │  /admin/*   painel (PWA)       │
                         └──────────────┬───────────────┘
                                        │ HTTPS (supabase-js, chave publicável)
                                        ▼
  ┌─────────────────────────────── Supabase ───────────────────────────────┐
  │                                                                         │
  │  Auth ── login do barbeiro (email + palavra-passe)                      │
  │                                                                         │
  │  PostgreSQL                                                             │
  │   ├─ tabelas (RLS ativo em todas)                                       │
  │   ├─ funções públicas (RPC, anon) ── serviços, horários, preço,         │
  │   │                                   marcar, ver/cancelar por token    │
  │   ├─ funções do painel (RPC, admin) ── marcação manual com avisos, etc. │
  │   ├─ triggers ── histórico de alterações, notificações                  │
  │   └─ pg_cron ── estados automáticos*, resumo do dia, limpeza 30 dias    │
  │                                                                         │
  │  Edge Functions (Deno) ── envio de Web Push (chave VAPID privada)       │
  └─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                     Serviço de push do navegador/Apple ──▶ iPhone do barbeiro

  * o mecanismo dos estados automáticos é decidido na 3.8
```

### Decisões

| # | Decisão | Porquê |
|---|---|---|
| 1 | **Uma só aplicação React** com duas áreas: pública (`/`, `/m/:token`) e painel (`/admin/*`) | Um só projeto, um só deploy e código partilhado (horários, formatação de preços). O painel só carrega depois do login |
| 2 | **Sem servidor próprio** (Node/Express). Toda a lógica de negócio vive no **PostgreSQL** (funções e triggers) e o que precisa de segredos vive em **Edge Functions** | Menos peças, menos custos, e as regras críticas (concorrência, preços, limites) ficam junto dos dados, impossíveis de contornar pelo navegador |
| 3 | **A página pública só fala com funções RPC** controladas (nunca com tabelas) | RN-06 / 2.14: o público nunca recebe dados de outros clientes |
| 4 | **O painel lê tabelas diretamente** (protegido por RLS de administrador) e usa **RPC para operações com regras** (marcação manual com avisos, edição por estado, falta) | Leituras simples e rápidas, com regras de negócio garantidas no servidor |
| 5 | **Edge Functions só para o push** (precisa da chave VAPID privada) | É o único sítio onde há um segredo |
| 6 | **Agendamentos com `pg_cron`** dentro do PostgreSQL | Não depende do PWA aberto (2.3 regra 8) |
| 7 | **Datas guardadas em UTC** (`timestamptz`); regras de negócio calculadas em **`Europe/Lisbon`** dentro das funções | Mudança de hora (2.4 regra 7) tratada num só sítio |
| 8 | **PWA instalável com `start_url = /admin`**. A área pública funciona como site normal (não precisa de ser instalada) | O PWA é para o barbeiro (1.1). O cliente só abre o link |
| 9 | **Vercel** serve o site estático com reescrita de rotas para a SPA e cabeçalhos de segurança (CSP, HSTS…), como no TS Hours | Já usado, grátis neste volume |

### Ambientes

- **Um só projeto Supabase** (`sxxbenaejbdgadrsavef`) durante o desenvolvimento e o piloto. É a mesma estratégia do TS Hours: sem custos extra, com disciplina total de migrations (nada feito à mão no painel da Supabase).
- Se for preciso separar desenvolvimento e produção, as migrations versionadas recriam a base de dados igual com um comando.
- Desenvolvimento local: `npm run dev` (porta 5174) ligado ao projeto Supabase. Para testar push e PWA no iPhone, é preciso HTTPS: deploy na Vercel ou túnel.

### Estrutura de pastas

```
mrpolobarber/
├─ docs/                     REQUISITOS · ESPECIFICACAO · ARQUITETURA
├─ public/                   ícones PWA, manifest, service worker
├─ src/
│  ├─ lib/                   supabase.js, datas/horas, telemóvel (E.164), preços
│  ├─ hooks/                 useAuth, useNotificacoes…
│  ├─ components/            componentes partilhados
│  ├─ public/                páginas da área pública (marcar, link pessoal)
│  └─ admin/                 layout + páginas do painel (dashboard, agenda…)
├─ supabase/
│  ├─ migrations/            SQL versionado (tabelas, RLS, funções, cron)
│  └─ functions/             Edge Functions (send-push)
├─ .env.local                VITE_SUPABASE_URL + chave publicável (não versionado)
└─ vercel.json               rewrites + cabeçalhos de segurança
```

### Fluxos principais (alto nível)

| Fluxo | Caminho |
|---|---|
| Cliente marca | SPA → `available_days` / `available_slots` → `quote_price` → `create_booking` (valida tudo e grava com proteção de concorrência) → trigger cria notificação → Edge Function envia push |
| Cliente cancela | `/m/:token` → `get_booking(token)` → `cancel_booking(token)` → trigger → notificação + push |
| Barbeiro marca manual | Painel → `admin_save_booking` (devolve avisos: fora do horário / conflito) → confirma → grava |
| Estados automáticos | `pg_cron` (ou cálculo pelo relógio, decidido na 3.8) |
| Resumo do dia | `pg_cron` 08:00 → cria notificação → Edge Function → push |

*(Nomes finais definidos na 3.6 e 3.7.)*

---

## 3.2 — Organização da base de dados ✅

**Convenção:** nomes de tabelas e colunas em **inglês, minúsculas, `snake_case`** (como no TS Hours), com textos e comentários em português. Todas as tabelas ficam no schema `public` com **RLS ativo**.

### Tabelas (14 + 1 interna)

| # | Tabela | Responsabilidade | Origem |
|---|---|---|---|
| | **Configuração** | | |
| 1 | `admins` | Quem é o administrador (liga ao utilizador do Supabase Auth). Serve para verificar que quem entra é **o** barbeiro e não basta ter conta | 2.14 regra 3 |
| 2 | `settings` | **Uma só linha** com os dados da barbearia (nome, morada, mapa, WhatsApp) e todas as regras configuráveis (antecedências, grelha, limites, tolerância, notificações) | 2.13 |
| | **Disponibilidade** | | |
| 3 | `weekly_hours` | Horário semanal: um registo por dia da semana (aberto/fechado, abertura, fecho) | 1.3 / 2.12 |
| 4 | `weekly_breaks` | Pausas do horário semanal (uma ou mais por dia, ex.: almoço) | 2.12 |
| 5 | `day_overrides` | Horário excecional de uma data concreta (outro horário, ou fechado) | 2.2 / 2.12 |
| 6 | `holidays` | Feriados (nacionais, móveis, 20/08), com ligar/desligar | 1.3 / 2.12 |
| 7 | `blocks` | Bloqueios: pontuais, folgas e férias (início, fim, motivo) | 1.8 / 2.12 |
| | **Negócio** | | |
| 8 | `services` | Serviços: nome, descrição, duração, preço habitual, preço visitante, ativo, ordem | 2.11 |
| 9 | `clients` | Fichas de cliente: nome, telemóvel (E.164, único), habitual, bloqueado online, notas | 1.7 / 2.10 |
| 10 | `appointments` | Marcações: cliente, início/fim, estado, preço e duração guardados, origem, link pessoal (token), nome escrito, observações, sobreposição intencional, detalhe do cancelamento | 2.1–2.7 |
| 11 | `appointment_services` | Serviço(s) de cada marcação, com preço e duração **guardados no momento**. Na v1 há sempre 1, mas fica preparado para vários | 1.4 / RN-05 |
| 12 | `appointment_events` | **Histórico** de cada marcação: criação, alterações (campo, antigo → novo), mudanças de estado, notas internas. Só se acrescenta, nunca se apaga | 2.6 |
| | **Notificações** | | |
| 13 | `notifications` | Notificações do painel (tipo, texto, marcação ligada, lida/não lida). Apagadas aos 30 dias | 2.9 |
| 14 | `push_subscriptions` | Dispositivos onde o barbeiro ativou o push (iPhone, computador…) | 2.9 |

### O que **não** vira tabela (e porquê)

| Necessidade | Solução | Porquê |
|---|---|---|
| Estados da marcação | Coluna `status` em `appointments` (tipo enumerado) | São só 5 valores fixos (2.3) |
| Categoria do cliente | Coluna `is_regular` em `clients` | Só há 2 categorias (2.7) |
| Proteção contra duplo clique | Coluna com chave única em `appointments` | Basta uma restrição de unicidade (2.5) |
| Limite de pedidos (anti-bot) | Tabela interna **`rate_limits`** (15.ª), definida na **3.7** | Sem acesso público nem do painel |
| Faltas e cancelamentos tardios do cliente | **Calculados** a partir de `appointments` | Evita contadores desatualizados |
| Dados "Lembrar neste dispositivo" | **No navegador do cliente**, não na base de dados | 2.10 regra 10 |

### Mapa simplificado

```
admins ──▶ auth.users

settings (1 linha)

weekly_hours ─┐
weekly_breaks ┤
day_overrides ┼──▶ cálculo de horários livres (3.6)
holidays ─────┤
blocks ───────┘

clients ──1:N──▶ appointments ──1:N──▶ appointment_services ──N:1──▶ services
                     │
                     ├──1:N──▶ appointment_events (histórico)
                     └──1:N──▶ notifications

push_subscriptions (dispositivos do barbeiro)
```

As relações em detalhe ficam na **3.3** e os campos na **3.4**.

---

## 3.3 — Relacionamentos entre tabelas ✅

**Princípio:** o histórico **nunca se perde**. Na prática quase nada se apaga: marcações, clientes com marcações e serviços usados ficam para sempre (desativam-se ou cancelam-se). As únicas exceções são as notificações (30 dias, 2.9) e os serviços sem marcações (2.11).

### Diagrama

```
auth.users ─1:1─ admins
     │
     └─1:N─ push_subscriptions

clients ─1:N─ appointments ─1:N─ appointment_services ─N:1─ services
                  │
                  ├─1:N─ appointment_events
                  └─1:N─ notifications (opcional)

weekly_hours ─1:N─ weekly_breaks
day_overrides · holidays · blocks · settings   (sem relações: lidos pelo cálculo de horários)
```

### Relações e o que acontece ao apagar

| Relação | Tipo | Obrigatória? | Ao apagar o "pai" | Porquê |
|---|---|---|---|---|
| `admins.user_id` → `auth.users` | 1:1 | Sim | Apaga o admin (CASCADE) | Sem utilizador não há administrador |
| `push_subscriptions.user_id` → `auth.users` | N:1 | Sim | Apaga as subscrições (CASCADE) | Dispositivos de um utilizador que já não existe |
| `appointments.client_id` → `clients` | N:1 | **Sim** | **Proibido** (RESTRICT) | Toda a marcação tem cliente (manual: só o nome basta, 1.8). Um cliente com histórico não se apaga |
| `appointment_services.appointment_id` → `appointments` | N:1 | Sim | CASCADE | Faz parte da marcação (as marcações não se apagam na prática) |
| `appointment_services.service_id` → `services` | N:1 | Sim | **Proibido** (RESTRICT) | "Serviço com marcações não se apaga, desativa-se" (2.11) |
| `appointment_events.appointment_id` → `appointments` | N:1 | Sim | CASCADE | O histórico pertence à marcação |
| `appointment_events.actor_id` → `auth.users` | N:1 | **Não** (vazio = cliente ou sistema) | SET NULL | Quem fez a alteração (2.6) |
| `notifications.appointment_id` → `appointments` | N:1 | **Não** (o resumo do dia não tem marcação) | SET NULL | Tocar abre a marcação (2.9) |
| `weekly_breaks.weekday` → `weekly_hours.weekday` | N:1 | Sim | CASCADE | Pausa de um dia da semana |

### Regras de relação importantes

1. **Um cliente pode ter muitas marcações, e uma marcação tem exatamente um cliente.** A marcação guarda também o **nome escrito** nesse momento, porque o nome não altera a ficha (RN-11).
2. **Uma marcação tem 1 ou mais serviços** (`appointment_services`). Na v1 há sempre 1. Cada linha guarda o **preço e a duração** desse momento (RN-05, 2.11), e o preço/duração totais ficam também na marcação para leitura rápida.
3. **Bloqueios não são marcações.** Ficam em `blocks`, sem cliente. O cálculo de horários e os avisos de conflito tratam marcações e bloqueios juntos (2.12).
4. **Horário excecional de um dia** (`day_overrides`) **substitui tudo** o que é desse dia da semana, incluindo as pausas. Se o barbeiro quiser uma pausa nesse dia, cria um bloqueio. É mais simples de configurar e de calcular.
5. **Feriados, bloqueios, horários e `settings`** não têm ligações a marcações. São lidos pelas funções de cálculo (3.6), e por isso mudá-los nunca altera marcações já existentes (2.13).
6. **Um único administrador:** `admins` tem no máximo 1 linha na v1 (preparado para mais no futuro, 2.14).

### Dados de clientes e RGPD (nota para o futuro)
Como os clientes com histórico não se apagam, cumprir o prazo de conservação (P-03) e pedidos de apagamento faz-se por **anonimização** (apagar nome, telemóvel e notas, mantendo as marcações para estatística). Fica para quando o prazo estiver definido.

---

## 3.4 — Estrutura dos campos ✅

### Convenções
- **Chaves:** `id uuid` gerado automaticamente (`gen_random_uuid()`), exceto onde a chave natural é melhor (dia da semana, data, utilizador).
- **Datas/horas com fuso:** `timestamptz` (guardado em UTC, 3.1). **Horas do horário:** `time`. **Datas:** `date`.
- **Dinheiro:** **cêntimos em `integer`** (ex.: 17,00 € = `1700`). Evita erros de arredondamento.
- **Durações:** minutos em `integer`.
- **Telemóvel:** `text` em formato **E.164** (`+351912345678`).
- **Valores fixos:** tipos enumerados (`enum`).
- **Auditoria:** `created_at` em todas as tabelas, `updated_at` (atualizado automaticamente) nas editáveis.
- Legenda: **Obr.** = obrigatório · *Opc.* = opcional.

### Tipos enumerados

| Tipo | Valores |
|---|---|
| `appointment_status` | `confirmed` · `in_progress` · `completed` · `cancelled` · `no_show` |
| `appointment_source` | `online` · `whatsapp` · `phone` · `walk_in` |
| `cancelled_by` | `client` · `barber` |
| `block_kind` | `slot` (pontual) · `day_off` (folga) · `vacation` (férias) |
| `holiday_kind` | `national` · `municipal` · `custom` |
| `event_actor` | `client` · `barber` · `system` |
| `event_type` | `created` · `updated` · `status_changed` · `note` |
| `notification_type` | `new_booking` · `client_cancelled` · `daily_summary` · `reminder` |

### 1. `admins`
| Campo | Tipo | | Notas |
|---|---|---|---|
| `user_id` | uuid | Obr. | Chave. → `auth.users` |
| `created_at` | timestamptz | Obr. | |

### 2. `settings` (uma só linha)
| Campo | Tipo | | Inicial | Origem |
|---|---|---|---|---|
| `id` | smallint | Obr. | `1` (só pode ser 1) | |
| `business_name` | text | Obr. | MR Polo Barber | 2.13 |
| `address` | text | *Opc.* | `[MORADA]` | P-02 |
| `map_url` | text | *Opc.* | `[LINK_MAPA]` | 2.13 |
| `whatsapp_phone` | text (E.164) | *Opc.* | `[WHATSAPP]` | 2.13 |
| `privacy_policy_url` | text | *Opc.* | — | P-04 |
| `allow_same_day` | boolean | Obr. | `true` | 1.4 |
| `min_notice_minutes` | integer | Obr. | `120` | 1.4 |
| `max_days_ahead` | integer | Obr. | `30` | 1.4 |
| `slot_step_minutes` | integer | Obr. | `15` | 2.4 |
| `buffer_minutes` | integer | Obr. | `0` | 1.4 |
| `max_services_per_booking` | integer | Obr. | `1` | 1.4 |
| `max_active_per_phone` | integer | Obr. | `2` | 2.1 |
| `cancel_notice_minutes` | integer | Obr. | `120` | 1.5 |
| `late_tolerance_minutes` | integer | Obr. | `10` | 1.6 |
| `no_show_flag_threshold` | integer | Obr. | `2` | 1.6 |
| `notify_new_booking` | boolean | Obr. | `true` | 2.9 |
| `notify_client_cancelled` | boolean | Obr. | `true` | 2.9 |
| `daily_summary_enabled` | boolean | Obr. | `true` | 2.9 |
| `daily_summary_time` | time | Obr. | `08:00` | 2.9 |
| `reminder_enabled` | boolean | Obr. | `false` | 2.9 |
| `reminder_minutes` | integer | Obr. | `15` | 2.9 |
| `updated_at` | timestamptz | Obr. | | |

### 3. `weekly_hours`
| Campo | Tipo | | Notas |
|---|---|---|---|
| `weekday` | smallint | Obr. | Chave. **1 = segunda … 7 = domingo** (ISO) |
| `is_open` | boolean | Obr. | Dom = `false` |
| `open_time` · `close_time` | time | *Opc.* | Obrigatórios se aberto |
| `updated_at` | timestamptz | Obr. | |

### 4. `weekly_breaks`
| Campo | Tipo | | Notas |
|---|---|---|---|
| `id` | uuid | Obr. | |
| `weekday` | smallint | Obr. | → `weekly_hours` |
| `start_time` · `end_time` | time | Obr. | Ex.: 13:00–14:00 |
| `label` | text | *Opc.* | Ex.: "Almoço" |

### 5. `day_overrides`
| Campo | Tipo | | Notas |
|---|---|---|---|
| `date` | date | Obr. | Chave (uma exceção por data) |
| `is_closed` | boolean | Obr. | `true` = fechado nesse dia |
| `open_time` · `close_time` | time | *Opc.* | Obrigatórios se não está fechado |
| `note` | text | *Opc.* | |
| `created_at` · `updated_at` | timestamptz | Obr. | |

### 6. `holidays`
| Campo | Tipo | | Notas |
|---|---|---|---|
| `date` | date | Obr. | Chave |
| `name` | text | Obr. | Ex.: "Dia do Município de Albufeira" |
| `kind` | `holiday_kind` | Obr. | |
| `is_active` | boolean | Obr. | `false` = o barbeiro abre nesse dia |
| `created_at` | timestamptz | Obr. | |

Os feriados (incluindo os móveis, calculados a partir da Páscoa) são **carregados para vários anos** (ex.: 2026–2030). A renovação decide-se na 3.8.

### 7. `blocks`
| Campo | Tipo | | Notas |
|---|---|---|---|
| `id` | uuid | Obr. | |
| `kind` | `block_kind` | Obr. | Pontual, folga ou férias |
| `start_at` · `end_at` | timestamptz | Obr. | Folga/férias = dias inteiros (00:00 → 00:00 do dia seguinte, hora de Lisboa) |
| `reason` | text | *Opc.* | |
| `created_by` | uuid | *Opc.* | → `auth.users` |
| `created_at` · `updated_at` | timestamptz | Obr. | |

### 8. `services`
| Campo | Tipo | | Notas |
|---|---|---|---|
| `id` | uuid | Obr. | |
| `name` | text | Obr. | |
| `description` | text | *Opc.* | |
| `duration_minutes` | integer | Obr. | Mín. 5 |
| `price_regular_cents` | integer | Obr. | Habitual |
| `price_visitor_cents` | integer | Obr. | Visitante (começa igual, 2.11) |
| `is_active` | boolean | Obr. | |
| `sort_order` | integer | Obr. | Ordem na página pública |
| `created_at` · `updated_at` | timestamptz | Obr. | |

### 9. `clients`
| Campo | Tipo | | Notas |
|---|---|---|---|
| `id` | uuid | Obr. | |
| `name` | text | Obr. | Nome da ficha (o nome escrito online não o altera, RN-11) |
| `phone_e164` | text | *Opc.* | **Único** quando preenchido. Obrigatório nos clientes criados online |
| `is_regular` | boolean | Obr. | Habitual/local. Inicial `false` (visitante) |
| `is_blocked` | boolean | Obr. | Bloqueado de marcar online |
| `notes` | text | *Opc.* | Notas internas do barbeiro |
| `created_via` | `appointment_source` | Obr. | `online` ou manual |
| `created_at` · `updated_at` | timestamptz | Obr. | |

As **faltas e cancelamentos tardios não são colunas**: são contados a partir das marcações (3.2).

### 10. `appointments`
| Campo | Tipo | | Notas |
|---|---|---|---|
| `id` | uuid | Obr. | |
| `client_id` | uuid | Obr. | → `clients` |
| `client_name` | text | Obr. | Nome escrito nesta marcação (RN-11) |
| `start_at` · `end_at` | timestamptz | Obr. | `end_at` guardado (2.11: mudar a duração do serviço não mexe nela) |
| `status` | `appointment_status` | Obr. | Começa `confirmed`. Mecanismo automático na 3.8 |
| `source` | `appointment_source` | Obr. | |
| `total_price_cents` | integer | Obr. | Preço fixado (RN-05) |
| `total_duration_minutes` | integer | Obr. | |
| `client_notes` | text | *Opc.* | Observações do cliente (até 200 caracteres) |
| `is_intentional_overlap` | boolean | Obr. | Sobreposição manual confirmada (2.2) |
| `manage_token_hash` | text | *Opc.* | **Hash** do código do link pessoal (ver nota). Só nas marcações online |
| `idempotency_key` | uuid | *Opc.* | **Único**. Evita duplo clique (2.5) |
| `cancelled_by` | `cancelled_by` | *Opc.* | Só se cancelada |
| `cancelled_late` | boolean | Obr. | `false` por defeito (2.3) |
| `cancelled_at` | timestamptz | *Opc.* | |
| `created_by` | uuid | *Opc.* | → `auth.users` (vazio = cliente online) |
| `created_at` · `updated_at` | timestamptz | Obr. | |

**Nota sobre o link pessoal:** a base de dados guarda **só o hash** (uma impressão digital) do código, e não o código em si. Se alguém um dia tivesse acesso à base de dados, não conseguiria usar os links dos clientes. O código completo só existe no link que o cliente recebe.

### 11. `appointment_services`
| Campo | Tipo | | Notas |
|---|---|---|---|
| `id` | uuid | Obr. | |
| `appointment_id` | uuid | Obr. | → `appointments` |
| `service_id` | uuid | Obr. | → `services` |
| `service_name` | text | Obr. | Nome do serviço nesse momento |
| `price_cents` | integer | Obr. | Preço aplicado |
| `duration_minutes` | integer | Obr. | Duração aplicada |
| `position` | smallint | Obr. | Ordem (sempre 1 na v1) |

### 12. `appointment_events`
| Campo | Tipo | | Notas |
|---|---|---|---|
| `id` | uuid | Obr. | |
| `appointment_id` | uuid | Obr. | → `appointments` |
| `actor` | `event_actor` | Obr. | Cliente, barbeiro ou sistema |
| `actor_id` | uuid | *Opc.* | → `auth.users` |
| `type` | `event_type` | Obr. | |
| `field` | text | *Opc.* | Ex.: `start_at`, `total_price_cents` |
| `old_value` · `new_value` | text | *Opc.* | |
| `note` | text | *Opc.* | Notas internas (2.6) |
| `created_at` | timestamptz | Obr. | |

### 13. `notifications`
| Campo | Tipo | | Notas |
|---|---|---|---|
| `id` | uuid | Obr. | |
| `type` | `notification_type` | Obr. | |
| `title` · `body` | text | Obr. | Texto já pronto (2.9) |
| `appointment_id` | uuid | *Opc.* | → `appointments` |
| `read_at` | timestamptz | *Opc.* | Vazio = não lida |
| `push_sent_at` | timestamptz | *Opc.* | Quando o push foi enviado |
| `created_at` | timestamptz | Obr. | Apagada aos 30 dias |

### 14. `push_subscriptions`
| Campo | Tipo | | Notas |
|---|---|---|---|
| `id` | uuid | Obr. | |
| `user_id` | uuid | Obr. | → `auth.users` |
| `endpoint` | text | Obr. | **Único**. Endereço do serviço de push do dispositivo |
| `p256dh` · `auth` | text | Obr. | Chaves do dispositivo (Web Push) |
| `user_agent` | text | *Opc.* | Para identificar o dispositivo ("iPhone") |
| `created_at` | timestamptz | Obr. | |
| `last_used_at` | timestamptz | *Opc.* | |

### 15. `rate_limits` (interna, 3.7)
| Campo | Tipo | | Notas |
|---|---|---|---|
| `key` | text | Obr. | Ex.: `create_booking:ip:<hash>` ou `create_booking:phone:<hash>` |
| `window_start` | timestamptz | Obr. | Início da janela de tempo |
| `count` | integer | Obr. | Pedidos nessa janela |

Chave composta (`key`, `window_start`). Apagados ao fim de 24 h (3.8).

As **restrições** (valores únicos, verificações como `fim > início`, limites das configurações) são detalhadas na **3.5**.

---

## 3.5 — Regras e integridade dos dados ✅

**Princípio:** as regras que protegem os dados vivem **na própria base de dados** (restrições e triggers), e não só no ecrã. Mesmo que houvesse um erro no site, a base de dados recusava dados inválidos.

As regras de **disponibilidade e sobreposição** ficam na **3.6**, e as **permissões** (quem pode ler/escrever) na **3.7**.

### 1. Chaves e valores únicos

| Tabela | Regra |
|---|---|
| `settings` | Chave `id`, que **só pode ser 1** (uma só linha) |
| `weekly_hours` | Chave `weekday`, **entre 1 e 7** |
| `day_overrides` · `holidays` | Chave `date` (uma exceção / um feriado por data) |
| `admins` | Chave `user_id` |
| `clients` | `phone_e164` **único** quando preenchido (2.10) |
| `appointments` | `idempotency_key` **único** (duplo clique, 2.5) · `manage_token_hash` **único** |
| `push_subscriptions` | `endpoint` **único** |

### 2. Verificações (CHECK)

| Tabela | Verificação |
|---|---|
| `weekly_hours` | Se aberto → abertura e fecho preenchidos e **fecho > abertura** |
| `weekly_breaks` | **Fim > início** |
| `day_overrides` | Fechado, **ou** abertura e fecho preenchidos com fecho > abertura |
| `blocks` | **Fim > início** |
| `services` | Nome não vazio · duração **5–480 min** · preços **≥ 0** |
| `clients` | Nome não vazio · telemóvel no formato E.164 (`+` e 7 a 15 dígitos) |
| `appointments` | **Fim > início** · **fim = início + duração** · preço ≥ 0 · observações **≤ 200** caracteres |
| `appointments` | **Coerência do cancelamento:** estado `cancelled` ⇔ `cancelled_by` e `cancelled_at` preenchidos · `cancelled_late` só pode ser verdadeiro numa cancelada |
| `appointments` | Marcação `online` ⇒ tem `manage_token_hash` (link pessoal) |
| `appointment_services` | Preço ≥ 0 · duração ≥ 5 |

**Limites das configurações** (`settings`, 2.13):

| Configuração | Limite |
|---|---|
| Antecedência mínima | 0 – 48 h |
| Antecedência máxima | 1 – 180 dias |
| Grelha de horários | 5 – 60 min |
| Intervalo entre marcações | 0 – 60 min |
| Serviços por marcação | 1 – 5 |
| Máx. de marcações por telemóvel | 1 – 10 |
| Prazo para o cliente cancelar | 0 – 48 h |
| Tolerância de atraso | 0 – 30 min |
| Faltas para sinalizar | 1 – 10 |
| Antecedência do lembrete | 5 – 120 min |

### 3. Regras de estado (trigger em `appointments`)

Garantem a 2.3 e a 2.6 **no servidor**:

| Regra | Origem |
|---|---|
| Uma marcação nova começa sempre `confirmed` | 2.3 regra 1 |
| Só são permitidas as transições do ciclo de vida: `confirmed → in_progress → completed`, `confirmed/in_progress → cancelled`, `in_progress → no_show` | 2.3 |
| `no_show` só a partir de **início + tolerância** e **antes do fim** | 2.3 regra 5 |
| `cancelled` e `no_show` são **finais**: não mudam mais | 2.3 regra 6 |
| `completed` também não muda de estado | 2.3 |
| **Edição por estado:** `confirmed` → tudo · `in_progress` → só serviço, preço e observações · `completed`/`cancelled`/`no_show` → nada (as notas internas vão para o histórico) | 2.6 opção A |

### 4. Preservação do histórico

| Regra | Como |
|---|---|
| **Marcações nunca se apagam** | Trigger que recusa `DELETE` em `appointments` |
| **O histórico só cresce** | `appointment_events` não aceita `UPDATE` nem `DELETE` |
| **Histórico automático** | Trigger em `appointments`: cada alteração grava um evento (campo, antigo → novo, quem, quando). Cada mudança de estado também (2.6) |
| **Cliente com marcações não se apaga** | FK `RESTRICT` (3.3). Um cliente sem marcações (criado por engano) pode ser apagado |
| **Serviço usado não se apaga** | FK `RESTRICT` (3.3, 2.11) |
| **Preço e duração fixados** | Ficam em `appointments` e `appointment_services`. Mudar o serviço ou os preços não lhes toca (RN-05, 2.11) |
| **A linha de `settings` não se apaga** | Trigger que recusa `DELETE` |
| **`updated_at` automático** | Trigger em todas as tabelas editáveis |

### 5. Normalização

- **Telemóvel:** as funções convertem sempre para E.164 antes de gravar (`912 345 678` → `+351912345678`), e a verificação recusa formatos inválidos (2.7 critério).
- **Textos:** nomes e motivos sem espaços a mais no início e no fim.
- **Datas de folga/férias:** convertidas para dias inteiros em hora de Lisboa (3.4).

---

## 3.6 — Disponibilidade e concorrência ✅

Implementa tecnicamente a 2.4 (cálculo de horários), a 2.5 (reservas simultâneas) e as sobreposições manuais da 2.2, 2.6 e 2.12.

### 1. O que "ocupa" a agenda

Uma função interna única, usada por **todas** as outras, define a ocupação:
- marcações com estado `confirmed` ou `in_progress` (incluindo as **sobreposições intencionais**);
- todos os `blocks`;
- cada ocupação alargada pelo **intervalo entre marcações** (`buffer_minutes`, 0 por defeito).

`completed`, `cancelled` e `no_show` **não ocupam** (2.4 passo 3).

### 2. Cálculo de horários (funções de leitura, públicas)

| Função | Devolve | Usada em |
|---|---|---|
| `available_days(service_id, from, to)` | Os dias com pelo menos 1 horário livre | Calendário (2.1 passo 3) |
| `available_slots(service_id, date)` | As horas de início livres nesse dia | Escolha da hora (2.1 passo 4) |

Ambas seguem **exatamente os 7 passos da 2.4**, dentro do PostgreSQL:
1. Dia elegível (dentro de `max_days_ahead`, não feriado ativo, não domingo/fechado, próprio dia só se permitido).
2. Janelas de trabalho: `day_overrides` se existir (substitui tudo, 3.3), senão `weekly_hours` menos `weekly_breaks`.
3. Janelas livres = janelas de trabalho menos ocupações (ponto 1).
4. Candidatos = início de cada janela livre (**encaixe**) + pontos da grelha de `slot_step_minutes` alinhados ao relógio.
5. Ficam os que cabem inteiros e começam depois de `agora + min_notice_minutes`.

**Fuso horário:** as horas locais são convertidas com `AT TIME ZONE 'Europe/Lisbon'`. Nos dois dias de mudança de hora, as horas que não existem ou se repetem caem de madrugada, fora do horário, por isso não afetam a barbearia.

### 3. Proteção contra reservas simultâneas

São usadas **três camadas**, porque nenhuma sozinha cobre tudo (sobreposições manuais permitidas, bloqueios noutra tabela, limite por telemóvel):

| Camada | O que faz | Porquê |
|---|---|---|
| **1. Fila única da agenda** (`pg_advisory_xact_lock`) | Todas as operações que mexem na agenda (marcar online, marcar/editar manual, criar bloqueio, cancelar) entram **uma de cada vez** | Com um só barbeiro o volume é baixíssimo, por isso a fila não se nota. É a forma mais simples de garantir que "verificar e gravar" acontece sem ninguém pelo meio |
| **2. Revalidação dentro da fila** | Já com a vez, a função **verifica tudo de novo** (2.5 regra 3): disponibilidade, antecedência, bloqueios, feriados, telemóvel bloqueado, limite de 2 por telemóvel | O que o cliente viu no ecrã pode já não ser verdade |
| **3. Rede de segurança na base de dados** (*exclusion constraint*) | Impede fisicamente duas marcações ativas sobrepostas, **exceto as marcadas como sobreposição intencional** | Se um dia houver um erro de programação nas funções, a base de dados recusa na mesma |

A restrição da camada 3 é **parcial**: aplica-se a marcações `confirmed`/`in_progress` com `is_intentional_overlap = false`. É assim que convivem a proteção absoluta das marcações online e a liberdade do barbeiro (2.2, lembrete da 2.5).

### 4. Funções de escrita

**`create_booking`** (pública, cliente):
1. Normaliza o telemóvel. Se a `idempotency_key` já existe, **devolve a marcação já criada** (duplo clique, 2.5).
2. Entra na fila da agenda.
3. Revalida tudo (camada 2).
4. Cria o cliente se o número é novo (visitante), **sem alterar a ficha** se já existe (RN-11).
5. Calcula o preço pelo telemóvel (2.7), grava a marcação, o serviço, o evento de histórico e a notificação.
6. Gera o **código do link pessoal**, guarda só o hash e **devolve o código uma única vez** ao cliente.

Se falhar, devolve um **código de erro** que o site traduz para as mensagens da 2.1:

| Código | Mensagem ao cliente |
|---|---|
| `SLOT_TAKEN` | "Esse horário acabou de ser ocupado, escolha outro" (volta ao passo 4, mantém os dados) |
| `TOO_LATE` | Igual (passou a antecedência mínima) |
| `PHONE_BLOCKED` | "Não é possível marcar online. Contacte o barbeiro" + WhatsApp |
| `LIMIT_REACHED` | "Já tem 2 marcações agendadas…" + WhatsApp |
| `INVALID_PHONE` | Erro no campo |
| `SERVICE_UNAVAILABLE` | O serviço foi desativado entretanto |

**`admin_save_booking`** (painel, criar e editar) e **`admin_save_block`** (painel) usam o padrão **"verificar, avisar, confirmar"**:
1. 1.ª chamada sem confirmação → a função **não grava** e devolve os **avisos**: fora do horário, conflitos (com a lista das marcações/bloqueios em causa) e, nos bloqueios, as marcações afetadas (2.12).
2. O painel mostra os avisos e o barbeiro confirma.
3. 2.ª chamada com confirmação → entra na fila, verifica de novo e grava. Se houver conflito confirmado, marca `is_intentional_overlap = true` (2.2). Nos bloqueios, as marcações mantidas ficam como sobreposição intencional (2.12 regra 5).

Sem avisos, grava logo à 1.ª chamada.

**`cancel_booking(token)`** (pública) e as funções de cancelamento/falta do painel também entram na fila, para que uma vaga libertada e uma nova reserva não se cruzem.

### Critérios técnicos de aceitação
- [ ] `available_slots` devolve exatamente os horários dos exemplos da 2.4.
- [ ] 20 pedidos `create_booking` simultâneos para o mesmo horário → exatamente 1 marcação.
- [ ] 2 pedidos com a mesma `idempotency_key` → 1 marcação, e os dois recebem a mesma resposta.
- [ ] 3 pedidos simultâneos do mesmo telemóvel com limite 2 → no máximo 2 marcações.
- [ ] Uma sobreposição manual confirmada grava, e o horário continua ocupado em `available_slots`.
- [ ] Inserir à mão (fora das funções) duas marcações ativas sobrepostas sem a marca de intencional → a base de dados recusa.
- [ ] Um bloqueio criado durante uma reserva em curso: ou o bloqueio ou a reserva fica primeiro, nunca os dois sobrepostos sem aviso.

---

## 3.7 — Segurança e permissões (RLS) ✅

Implementa a 2.14. Há **três tipos de quem acede**:

| Quem | Papel no Supabase | Como acede |
|---|---|---|
| **Cliente** (público, sem conta) | `anon` | **Só por funções públicas** (RPC). Nenhum acesso a tabelas |
| **Barbeiro** | `authenticated` **e** registado em `admins` | Lê tabelas (RLS de administrador) + funções do painel |
| **Sistema** (cron, triggers, Edge Function) | Funções `SECURITY DEFINER` / `service_role` | Só no servidor |

Uma conta `authenticated` que **não esteja em `admins`** não vê nem faz nada (2.14 regra 3).

### 1. Regras base
1. **RLS ativo em todas as tabelas**, sem exceção.
2. **Nenhuma política para `anon`**: o público não lê nem escreve nenhuma tabela.
3. Função auxiliar **`is_admin()`**: verifica se `auth.uid()` está em `admins`. Todas as políticas do painel usam-na.
4. **Por defeito, ninguém executa funções.** O PostgreSQL deixa qualquer um executar funções novas, por isso isso é retirado (`revoke execute … from public`) e cada função recebe só a permissão de que precisa.
5. Todas as funções `SECURITY DEFINER` têm `search_path` fixo (proteção contra sequestro de nomes), como no TS Hours.

### 2. Permissões do barbeiro nas tabelas

| Tabela | Ler | Criar | Alterar | Apagar | Notas |
|---|---|---|---|---|---|
| `admins` | Só a própria linha | — | — | — | Definido pelo Gabriel por SQL |
| `settings` | ✅ | — | ✅ | — | Uma só linha (3.5) |
| `weekly_hours` · `weekly_breaks` · `holidays` | ✅ | ✅ | ✅ | ✅ | Configuração simples |
| `day_overrides` | ✅ | ✅ | ✅ | ✅ | |
| `services` | ✅ | ✅ | ✅ | ✅* | *Só se nunca foi usado (FK, 3.3) |
| `clients` | ✅ | ✅ | ✅ | ✅* | *Só se não tem marcações (FK, 3.3) |
| `blocks` | ✅ | **função** | **função** | **função** | Passam pela fila e pelos avisos (3.6) |
| `appointments` · `appointment_services` | ✅ | **função** | **função** | — | Toda a escrita passa pelas funções da 3.6 (fila, regras, avisos) |
| `appointment_events` | ✅ | **função** | — | — | Escrito por triggers. Notas por função |
| `notifications` | ✅ | — | Só `read_at` | — | Criadas pelo sistema, apagadas pelo cron (30 dias) |
| `push_subscriptions` | Só as próprias | Só as próprias | — | Só as próprias | |

**Porquê "função" nas marcações e bloqueios:** se o painel escrevesse diretamente na tabela, saltava a fila da agenda e os avisos de conflito. Assim, mesmo o barbeiro passa sempre pelas regras.

### 3. Funções públicas (`anon`)

| Função | Devolve | Nunca devolve |
|---|---|---|
| `public_info()` | Nome, morada, mapa, WhatsApp, link da privacidade, horário semanal | Configurações internas, notas |
| `public_services()` | Serviços ativos: nome, descrição, duração, ordem | **Preços** (2.1) |
| `available_days()` · `available_slots()` | Dias e horas livres | Quem ocupa os horários |
| `quote_price(service, phone)` | O preço para esse telemóvel | Nome, histórico, faltas (efeito aceite na 1.7) |
| `create_booking(…)` | Resumo da marcação + código do link pessoal | Dados de outros clientes |
| `get_booking(token)` | Só a marcação desse código: serviço, data, hora, preço, estado, se ainda pode cancelar | Qualquer outra marcação |
| `cancel_booking(token)` | Resultado | — |

As **funções do painel** (`admin_save_booking`, `admin_save_block`, `admin_cancel`, `admin_no_show`, `admin_add_note`…) só podem ser executadas por `authenticated` e **verificam `is_admin()` logo no início**.

### 4. Limite de pedidos e anti-bot (2.1, 2.14)

| Pedido | Limite (por IP) | Extra |
|---|---|---|
| `create_booking` | 5 por hora | Também **3 por hora por telemóvel** |
| `quote_price` | 30 por hora | Dificulta "testar" muitos números para descobrir habituais |
| `get_booking` · `cancel_booking` | 30 por hora | Dificulta tentar códigos ao calhas |
| `available_*` · `public_*` | 120 por minuto | Só contra abusos |

- Pequena tabela interna **`rate_limits`** (contadores por janela de tempo). Sem acesso público.
- O **IP é guardado só como hash** e os registos são apagados ao fim de 24 h (é um dado pessoal, RGPD).
- **Campo armadilha** escondido no formulário: se vier preenchido, é um bot e a marcação não é criada.
- Ao passar o limite, a função devolve `RATE_LIMITED` e o site mostra "Demasiadas tentativas. Tente mais tarde ou contacte o barbeiro".

### 5. Chaves e segredos
- O site usa **só a chave publicável** (`sb_publishable_…`), protegida por estas regras.
- A **`service_role`** e a **chave VAPID privada** existem **só** como segredos da Edge Function de push.
- `.env.local` não é versionado (já no `.gitignore`).
- Depois de cada migration corre-se o **verificador de segurança da Supabase** (advisors), como no TS Hours.

### Critérios técnicos de aceitação
- [ ] Com a chave publicável e sem sessão, qualquer `select` direto a qualquer tabela devolve vazio ou é recusado.
- [ ] Um utilizador autenticado que não está em `admins` não lê nenhuma tabela e não executa nenhuma função do painel.
- [ ] O barbeiro não consegue gravar diretamente em `appointments` nem em `blocks`: só pelas funções.
- [ ] `public_services()` não devolve preços.
- [ ] `get_booking` com um código inventado ou alterado não devolve nada.
- [ ] A 6.ª marcação na mesma hora vinda do mesmo IP é recusada com `RATE_LIMITED`.
- [ ] Os advisors de segurança não mostram avisos novos (além dos esperados das funções definer).

---

## 3.8 — Automações e processos do backend ✅

Tudo corre **no servidor**, sem depender do PWA aberto (2.3 regra 8). Extensões da Supabase usadas: **`pg_cron`** (tarefas agendadas), **`pg_net`** (chamar a Edge Function a partir da base de dados) e **`pgcrypto`** (códigos aleatórios e hash do link pessoal).

### 1. Estados automáticos (decisão pendente da 2.3)

**Proposta: `pg_cron` a cada minuto + regras decididas pela hora.**

| Peça | O que faz |
|---|---|
| Tarefa `advance_statuses` (cada minuto) | `confirmed` → `in_progress` quando `agora ≥ início`; `in_progress` → `completed` quando `agora ≥ fim`. Cada mudança grava um evento com ator `system` (histórico, 2.6) |
| **Regras pela hora, não pelo estado guardado** | As funções que dependem do momento (pode registar falta? pode cancelar? pode editar?) calculam pela **hora atual e pela hora da marcação**. Assim, um atraso de até 1 minuto do cron **nunca** muda uma decisão |
| Ecrãs | O painel mostra o estado "efetivo" (calculado pela hora), por isso nunca aparece "Confirmada" numa marcação que já começou |

**Porquê assim, e não só calcular pela hora:** o estado fica **guardado de verdade** (histórico, filtros, contagens simples) e a precisão ao segundo vem das regras pela hora. Fica o melhor das duas abordagens com uma só tarefa simples.

### 2. Notificações (2.9)

| Acontecimento | Mecanismo | Condição |
|---|---|---|
| **Nova marcação online** | Trigger ao criar uma marcação `online` → cria a notificação | `notify_new_booking` ligado. Acrescenta "⚠️ N faltas" se o cliente tiver ≥ `no_show_flag_threshold` faltas |
| **Cancelamento pelo cliente** | Trigger quando passa a `cancelled` com `cancelled_by = client` | `notify_client_cancelled` ligado |
| **Resumo do dia** | Tarefa `daily_summary` (cada minuto): à hora `daily_summary_time` (Lisboa), uma vez por dia | `daily_summary_enabled` ligado. Só nos dias de trabalho. Texto: "Hoje: N marcações, a 1.ª às HH:MM" ou "Hoje ainda não há marcações" |
| **Lembrete** | Tarefa `reminders` (cada minuto): marcações que começam daqui a `reminder_minutes` e ainda sem lembrete | `reminder_enabled` ligado (desligado por defeito). Não repete (verifica se já existe a notificação dessa marcação) |
| Ações do barbeiro | **Não geram notificação** (1.9 / 2.9) | — |

### 3. Envio de push

```
nova linha em notifications
   └─▶ trigger → pg_net: chamada HTTP à Edge Function send-push
                         (com um segredo partilhado no cabeçalho)
          └─▶ send-push: lê os dispositivos em push_subscriptions
                ├─ envia Web Push a cada um (título, texto, link, nº de não lidas)
                ├─ dispositivo expirado (resposta 404/410) → apaga a subscrição
                └─ grava push_sent_at
```

- **O push leva o número de não lidas**, e o service worker atualiza o **badge do ícone** (2.9).
- Se o push falhar, a notificação **continua no painel** (fonte de verdade, 2.9).
- A função só aceita chamadas com o segredo partilhado (ninguém de fora a pode usar para enviar pushes).

### 4. Limpezas

| Tarefa | Quando | O que faz |
|---|---|---|
| `purge_notifications` | Diariamente, 03:00 | Apaga notificações com mais de **30 dias** (2.9) |
| `purge_rate_limits` | De hora a hora | Apaga registos de limite de pedidos com mais de **24 h** (3.7) |

### 5. Feriados

- A migration inicial carrega **2026–2030**: nacionais fixos, **móveis** (Sexta-feira Santa, Páscoa, Corpo de Deus, calculados a partir da Páscoa) e o **municipal de Albufeira (20/08)**. O Carnaval fica **desligado** por defeito (P-05).
- Tarefa `ensure_holidays` (1 de dezembro de cada ano): garante que os **2 anos seguintes** estão carregados. Nunca mexe em feriados que o barbeiro desligou ou acrescentou.

### 6. O que fica por triggers (já definido na 3.5)
- `updated_at` automático.
- Histórico de alterações (`appointment_events`).
- Regras de estado e de edição por estado.
- Bloqueio de `DELETE` em marcações, histórico e `settings`.

### 7. Faltas
- **Não há automação**: a falta é sempre manual (2.3).
- A **sinalização ⚠️** não é guardada: é **calculada** (nº de marcações `no_show` do cliente ≥ limite), por isso fica sempre certa, mesmo se o barbeiro mudar o limite.

### Resumo das tarefas agendadas

| Tarefa | Frequência |
|---|---|
| `advance_statuses` | Cada minuto |
| `daily_summary` | Cada minuto (dispara 1× por dia à hora configurada) |
| `reminders` | Cada minuto (só se ligado) |
| `purge_notifications` | Diária, 03:00 |
| `purge_rate_limits` | De hora a hora |
| `ensure_holidays` | Anual, 1 de dezembro |

### Critérios técnicos de aceitação
- [ ] Sem nenhuma app aberta, uma marcação passa a `in_progress` e a `completed` no minuto certo, com evento `system` no histórico.
- [ ] "Registar falta" decide pela hora real: funciona logo aos 10 min, mesmo que o cron ainda não tenha corrido.
- [ ] Uma marcação online cria 1 notificação e 1 push. Uma marcação manual não cria nenhum.
- [ ] O resumo do dia chega uma só vez, à hora configurada, e não chega em dias fechados.
- [ ] Um dispositivo de push expirado é apagado automaticamente.
- [ ] Ao fim de 30 dias as notificações desaparecem, e as marcações ficam intactas.
- [ ] Os feriados de 2026–2030 existem, incluindo os móveis e o 20/08.

---

## 3.9 — Autenticação e reconhecimento de clientes ✅

Âmbito como decidido (2.2, 2.10, 2.14): **sem SMS e sem recuperação por email na v1.**

### 1. Administrador (barbeiro)

**Configuração do Supabase Auth** (feita uma vez pelo Gabriel no painel da Supabase):

| Definição | Valor | Porquê |
|---|---|---|
| Email + palavra-passe | Ligado | 2.14 |
| **Permitir novos registos** (*Allow new users to sign up*) | **Desligado** | Ninguém consegue criar conta pelo site (2.14 regra 2) |
| Fornecedores sociais (Google…), telefone, links mágicos | Desligados | Não são usados |
| Palavra-passe mínima | 8 caracteres | |
| **Alteração segura da palavra-passe** (pede código por email) | **Desligada** | Não há email (2.14). Mudar a palavra-passe no painel exige estar autenticado |
| Site URL / Redirect URLs | `https://mrpolobarber.vercel.app` (+ `http://localhost:5174` em desenvolvimento) | |

**Criação da conta do barbeiro** (uma vez):
1. O Gabriel cria o utilizador no painel da Supabase (Authentication → Add user), com **email já confirmado**.
2. Insere-o em `admins` (uma linha de SQL, que fica documentada no projeto).

**Sessão no PWA:**
- O `supabase-js` guarda a sessão no dispositivo e **renova-a sozinho**. O barbeiro só volta a pôr a palavra-passe se terminar sessão (2.2).
- No iPhone, o PWA instalado tem armazenamento próprio. Por isso o **login é feito dentro do PWA** e não no Safari.

**Proteção das rotas `/admin/*`:**
1. Sem sessão → ecrã de login.
2. Com sessão, mas **sem ser administrador** (`is_admin()` falso) → "Sem acesso" + terminar sessão.
3. Administrador → painel.

**Mudar a palavra-passe:** em Configurações → Conta, com a nova palavra-passe repetida (2.14 regra 5).

**Repor a palavra-passe esquecida (piloto):** o Gabriel faz no painel da Supabase. Fica um **procedimento escrito** no projeto (`docs/OPERACAO.md`, criado na implementação), com os passos exatos.

O Supabase Auth já tem **limite de tentativas de login** próprio.

### 2. Clientes (sem conta)

**Link pessoal (2.1, 2.6, 2.14):**

| Aspeto | Definição |
|---|---|
| Código | **32 bytes aleatórios** (`pgcrypto`), em texto seguro para URL (~43 caracteres) |
| Guardado | **Só o hash SHA-256** em `appointments.manage_token_hash` (3.4) |
| Endereço | `mrpolobarber.vercel.app/m/<código>` |
| Devolvido | **Uma única vez**, na resposta de `create_booking` |
| Validade | Enquanto a marcação existir: **ver** sempre; **cancelar** só dentro do prazo (2 h antes) |
| Tentativas | Limite de 30 por hora por IP (3.7) |

**"Lembrar neste dispositivo" (2.10):**

| Chave no navegador | Conteúdo |
|---|---|
| `mpb.cliente` | Nome e telemóvel |
| `mpb.marcacoes` | Lista de `{código, data/hora, serviço}` das marcações feitas neste dispositivo |

- Só é guardado se a opção estiver ligada (ligada por defeito).
- **"As suas próximas marcações":** ao abrir a página, o site pede o estado atual de cada código guardado (`get_booking`). Assim, uma marcação cancelada pelo barbeiro aparece como cancelada. As marcações passadas são retiradas da lista sozinhas.
- **"Não sou eu / esquecer"** apaga as duas chaves.
- Todo o acesso ao armazenamento é protegido (navegação privada ou armazenamento bloqueado → a página funciona na mesma, só não lembra nada).
- **Nada disto vai para o servidor** (2.10 regra 10).

### 3. Preparado para o futuro (não implementado)
- **SMS (P-10):** quando entrar, acrescenta-se à ficha do cliente a data de verificação do número e um passo de código antes de `create_booking`. A estrutura atual não impede nada disto.
- **Recuperação por email (P-11):** basta configurar um servidor de email no Supabase Auth e acrescentar o ecrã "Esqueci-me". Não há alterações à base de dados.

### Critérios técnicos de aceitação
- [ ] Criar conta pelo Supabase Auth a partir do site é recusado (registos desligados).
- [ ] O barbeiro faz login no PWA e, ao reabrir no dia seguinte, continua com sessão.
- [ ] Uma conta autenticada que não está em `admins` vê "Sem acesso".
- [ ] O barbeiro muda a palavra-passe no painel sem precisar de email.
- [ ] O procedimento de reposição da palavra-passe pelo Gabriel funciona e está escrito.
- [ ] A base de dados não contém nenhum código de link pessoal em claro.
- [ ] Com o armazenamento do navegador bloqueado, é possível marcar na mesma.

---

## 3.10 — Integrações e serviços externos ✅

**Princípio:** o mínimo de serviços externos possível. Na v1 só há **um serviço externo com configuração** (Web Push), e **nenhum custo extra**.

### 1. Web Push (notificações no iPhone)

| Peça | Definição |
|---|---|
| **Chaves VAPID** | Um par gerado uma vez. A **pública** vai para o site (`VITE_VAPID_PUBLIC_KEY`, não é segredo). A **privada** e o contacto (`mailto:`) ficam **só nos segredos da Edge Function** |
| **Service worker próprio** | O PWA usa `vite-plugin-pwa` em modo **`injectManifest`** (service worker escrito por nós, e não gerado), porque precisa de tratar o push. É diferente do TS Hours, que usava o modo gerado |
| Evento `push` | Mostra a notificação (título, texto) e atualiza o **badge** com o nº de não lidas (`setAppBadge`) |
| Evento `notificationclick` | Abre o PWA no link da notificação (detalhe da marcação ou agenda de hoje, 2.9) |
| **Ativar** | Botão "Ativar notificações" (tem de ser um toque do utilizador, exigência do iPhone) → pede permissão → cria a subscrição → grava em `push_subscriptions` |
| Requisitos no iPhone | PWA **instalado no ecrã principal**, `display: standalone` no manifest, iOS 16.4+ (o do barbeiro é recente), **HTTPS** |
| **Envio** | Edge Function `send-push` (3.8). Biblioteca de Web Push compatível com Deno |

**Risco conhecido e plano B:** no TS Hours, o SDK do Stripe falhou no Deno da Supabase. Se a biblioteca de Web Push também falhar, a Edge Function passa a **assinar e cifrar as mensagens diretamente com Web Crypto**, sem biblioteca, tal como fizemos com o Stripe. É mais trabalho, mas funciona sempre.

### 2. Supabase

| Integração | Uso |
|---|---|
| `pg_cron` | Tarefas agendadas (3.8) |
| `pg_net` | A base de dados chama a Edge Function `send-push` (3.8) |
| `pgcrypto` | Códigos aleatórios e hash do link pessoal (3.9) |
| Edge Function `send-push` | Única Edge Function da v1. Segredos: chave VAPID privada, contacto VAPID, segredo partilhado com a base de dados, `service_role` |
| Supabase CLI | Migrations (`db push`) e deploy da Edge Function |

### 3. Vercel

- Site estático (build do Vite) com reescrita de rotas para a SPA.
- **Variáveis de ambiente:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publicável), `VITE_VAPID_PUBLIC_KEY`. Nenhum segredo.
- **Cabeçalhos de segurança** como no TS Hours (CSP, HSTS, X-Frame-Options…). A CSP só autoriza ligações ao domínio da Supabase deste projeto.

### 4. Funcionalidades que parecem integrações, mas não são

Tudo isto é feito **no próprio site**, sem serviços externos nem custos:

| Funcionalidade | Como |
|---|---|
| "Adicionar ao calendário" | Ficheiro `.ics` gerado no navegador |
| Botões de WhatsApp | Links `wa.me/<número>?text=…` (abrem o WhatsApp do próprio utilizador) |
| "Ver no mapa" | Link para o Google Maps (só um endereço, sem mapa embutido) |
| Código QR do link | Gerado no navegador (biblioteca pequena) |
| Tipos de letra | Servidos pelo próprio site (RGPD: sem pedidos à Google), como no TS Hours |
| Estatísticas de visitas | **Nenhuma** na v1 (menos dados pessoais, sem aviso de cookies) |

### 5. Integrações futuras (não entram na v1)

| Integração | Para quê | Referência |
|---|---|---|
| SMS (ex.: Twilio) | Confirmação do número do cliente | P-10 |
| Email (Resend com domínio, ou Gmail SMTP) | Recuperar palavra-passe; avisos ao cliente | P-11, P-09 |
| Google Calendar | Sincronizar a agenda | P-07 |
| Domínio próprio | Endereço `.pt` e email profissional | P-06 |

### Critérios técnicos de aceitação
- [ ] No iPhone do barbeiro, com o PWA instalado, "Ativar notificações" pede permissão e grava o dispositivo.
- [ ] Uma marcação online faz chegar um push ao iPhone com o PWA fechado.
- [ ] Tocar no push abre a marcação certa.
- [ ] O badge do ícone mostra o nº de não lidas e atualiza ao ler.
- [ ] A chave VAPID privada e a `service_role` não aparecem no código do site nem no repositório.
- [ ] O `.ics`, os links de WhatsApp, o mapa e o QR funcionam sem nenhum serviço externo pago.

---

## 3.11 — Revisão da arquitetura ✅

### 1. Verificação de coerência

As subetapas 3.1–3.10 foram revistas contra o REQUISITOS (v1.2) e a ESPECIFICACAO (validada). **Nenhuma contradição.** Alinhamentos feitos:

| Onde | Correção |
|---|---|
| 3.1, fluxos | Nomes provisórios das funções substituídos pelos finais (`available_slots`, `quote_price`, `create_booking`, `get_booking`, `cancel_booking`, `admin_save_booking`) |
| 3.2 / 3.4 | Acrescentada a tabela interna **`rate_limits`** (15.ª), que nasceu na 3.7 |
| 3.6 | `cancel_booking_by_token` passa a `cancel_booking(token)`, como na 3.7 |

**Cobertura das decisões técnicas pendentes da Etapa 2:**

| Pendente da Etapa 2 | Resolvido em |
|---|---|
| Proteção de concorrência com sobreposições manuais (2.2, 2.5) | 3.6 (fila + revalidação + restrição parcial) |
| Mecanismo dos estados automáticos (2.3) | 3.8 (cron a cada minuto + regras pela hora) |
| Push e resumo diário (1.9, 2.9) | 3.8 + 3.10 |
| Funções públicas controladas (2.14) | 3.7 |
| Histórico de alterações (2.6) | 3.5 (trigger) |

### 2. Dependências e configuração manual

O que **o Gabriel** faz no painel da Supabase (não pode ser feito por migration):

| # | Tarefa | Quando |
|---|---|---|
| G-1 | Auth: desligar registos, desligar "alteração segura da palavra-passe", Site URL e Redirect URLs (3.9) | Antes da 1.ª migration de funções |
| G-2 | Ativar extensões `pg_cron` e `pg_net` se o painel o exigir (a migration tenta ativá-las) | Antes da migration de automações |
| G-3 | Criar o utilizador do barbeiro (email confirmado) e correr o SQL de `admins` (3.9) | Antes de testar o painel |
| G-4 | Segredos da Edge Function: chave VAPID privada, contacto VAPID, segredo partilhado (as chaves geram-se na implementação) | Antes de testar o push |
| G-5 | Projeto e variáveis na Vercel | Antes do 1.º deploy |

### 3. Ordem de implementação proposta (Etapa 4)

**Migrations** (em `supabase/migrations/`, aplicadas com `supabase db push`, uma de cada vez e verificadas):

| # | Migration | Conteúdo |
|---|---|---|
| 0001 | `extensions_enums_tables` | Extensões, 8 enums, 15 tabelas, chaves e FKs (3.2–3.4) |
| 0002 | `integrity` | CHECKs, únicos, triggers de `updated_at`, histórico, estado e bloqueio de DELETE (3.5) |
| 0003 | `rls_grants` | RLS, `is_admin()`, políticas, revogação de `execute` (3.7) |
| 0004 | `availability` | Ocupação, `available_days`, `available_slots` (3.6) |
| 0005 | `booking_functions` | `quote_price`, `create_booking`, `get_booking`, `cancel_booking`, funções do painel, restrição parcial, rate limit (3.6–3.7) |
| 0006 | `automations` | Triggers de notificações, `pg_net` → push, tarefas `pg_cron` (3.8) |
| 0007 | `seed` | `settings`, horário semanal e almoço, os 5 serviços, feriados 2026–2030 |

A seguir: **Edge Function `send-push`** e, depois, o **frontend**: área pública → painel → PWA e push.

Depois de cada migration: **advisors de segurança** e os **critérios técnicos de aceitação** da subetapa correspondente.

### 4. Pendentes que se mantêm

| # | Pendente | Bloqueia |
|---|---|---|
| P-02 | Morada, link do mapa, WhatsApp | Lançamento |
| P-03 | Responsável RGPD e prazo | Lançamento |
| P-04 | Política de privacidade | Lançamento |
| P-01 · P-05 | Preços visitante · Carnaval | Nada (editáveis no painel) |

### 5. Validação

- [x] Gabriel valida a Arquitetura (3.1–3.11) — 2026-11-11
- [x] Etapa 3 fechada → **Etapa 4 — Implementação**
