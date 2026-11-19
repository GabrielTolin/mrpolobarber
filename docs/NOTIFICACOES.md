# MR Polo Barber — Notificações

**Etapa 7 — Notificações ao barbeiro** · ✅ **Concluída e validada a 2026-11-16** (iniciada a 2026-11-15)

O barbeiro passa a ser avisado no telemóvel, **mesmo com a app fechada**, do que não foi ele a fazer. Segue a [Especificação](ESPECIFICACAO.md) 2.9 e a [Arquitetura](ARQUITETURA.md) 3.8 (§2–4) e 3.10 (§1).

**Pedido do barbeiro (2026-11-15):** um aviso **5 minutos antes de cada cliente**. É o "Lembrete antes da marcação" da 2.9, que já tem definição no painel (5 a 120 min).

## O que já existe (das etapas anteriores)
- Tabelas `notifications` e `push_subscriptions`, com as regras de acesso (RLS).
- Preferências em Configurações → Notificações: nova marcação, cliente cancelou, resumo do dia (hora), lembrete (minutos).
- Service worker do PWA (`src/sw.js`) já preparado para o push: mostra a notificação, atualiza o **badge** do ícone e, ao tocar, abre o endereço indicado.
- Contador "N por ler" no Início do painel.

## Como funciona (resumo da 3.8)
```
acontecimento (marcação online, cancelamento pelo cliente, hora do resumo, X min antes)
   └─▶ nova linha em notifications  ← é isto que o painel lista (fonte de verdade)
          └─▶ a base de dados chama a Edge Function send-push (pg_net)
                 └─▶ envia o push a cada dispositivo ativado (iPhone, computador…)
                     com o nº de não lidas para o badge
```

## Subetapas propostas

| # | Subetapa | O que inclui | Base |
|---|---|---|---|
| 7.0 | **Chaves e segredos** | Gerar o par **VAPID** (pública → site e Vercel; privada → só nos segredos da Edge Function) · segredo partilhado base de dados ↔ função · nada disto no Git. Mostro-te cada passo antes | 3.10 §1, 3.7 §5 |
| 7.1 | **Motor no servidor** (migration) | Ativar `pg_net` · **nova marcação online** (com "⚠️ N faltas" se o cliente estiver sinalizado) · **cancelamento pelo cliente** · tarefa **resumo do dia** (à hora escolhida, só em dias de trabalho) · tarefa **lembretes** (cada minuto, sem repetir) · cada tipo respeita o interruptor das Configurações · **ações do barbeiro não notificam** · limpeza aos **30 dias** · chamada à Edge Function · testes SQL | 2.9, 3.8 §2–4 |
| 7.2 | **Envio do push** (Edge Function `send-push`) | Só aceita chamadas com o segredo partilhado · envia a todos os dispositivos · apaga dispositivos expirados · grava a hora do envio · leva o nº de não lidas · plano B: assinar com Web Crypto se a biblioteca falhar no Deno (lição do TS Hours) | 3.8 §3, 3.10 |
| 7.3 | **Ativar no telemóvel** | Em Configurações → Notificações: **"Ativar notificações neste dispositivo"** (pede permissão e grava o aparelho) · no iPhone, aviso para **instalar no ecrã principal** primeiro · **"Enviar notificação de teste"** · aviso no Início enquanto não estiverem ativas | 2.9 parte 2, 3.10 |
| 7.4 | **Página Notificações** (painel) | Lista dos últimos 30 dias, não lidas em destaque · tocar → abre a **marcação** (o resumo abre a **Agenda de hoje**) e marca como lida · **"Marcar todas como lidas"** · o **mesmo contador** no Início, na navegação e no **badge** do ícone | 2.9 parte 2 |
| 7.5 | **Lembrete de 5 minutos** | Ligar o lembrete com **5 min** (pedido do barbeiro) · texto: "Daqui a 5 min: João, Barba" · vale para todas as marcações ativas, online ou manuais | 2.9, pedido 2026-11-15 |
| 7.6 | **Testes e validação** | Critérios da 2.9 e da 3.10 · **push no iPhone com a app fechada** · tocar abre a marcação certa · badge atualiza ao ler · desligar um tipo deixa de enviar | — |

## Decisões que proponho
1. **Contacto VAPID:** usar o endereço do site (`https://mrpolobarber.vercel.app`) em vez de um email. Os serviços de push (Apple, Google) aceitam-no, e assim não fica nenhum email pessoal nos segredos.
2. **Segredos na Supabase:** gero as chaves no teu PC e gravo-as com a CLI (`supabase secrets set`), depois do teu OK. A chave privada **nunca** vai para o Git nem para a Vercel. Na Vercel só entra a **pública** (`VITE_VAPID_PUBLIC_KEY`); essa variável és tu que a acrescentas, como da outra vez.
3. **Deploy da Edge Function** com a CLI (`supabase functions deploy send-push`), também com o teu OK.
4. **Lembrete e resumo** contam todas as marcações ativas (confirmadas e em curso), online ou manuais. Não contam as canceladas nem as faltas.

---

## 7.0 — Chaves e segredos ✅ *(feita em 2026-11-15)*

| Peça | Onde está | Quem a vê |
|---|---|---|
| **Chave VAPID pública** `BLSxi5E6…bosSpTE` (65 bytes) | `.env.local` (`VITE_VAPID_PUBLIC_KEY`, fora do Git) · **falta na Vercel** | Pública por natureza (vai no site) |
| **Chave VAPID privada** (32 bytes) | **Só** nos segredos da Edge Function (`VAPID_PRIVATE_KEY`) | Ninguém: não está no Git, na Vercel nem na conversa |
| Contacto VAPID | Segredo `VAPID_SUBJECT` = `https://mrpolobarber.vercel.app` (decisão 1: sem email) | — |
| **Segredo partilhado** base de dados ↔ `send-push` (32 bytes) | Segredo da função `PUSH_SHARED_SECRET` **e** cofre da base de dados (Vault, nome `send_push_secret`) | Só o servidor |

- Gerados no PC do Gabriel com um script Node (curva P-256), gravados em ficheiros **fora do projeto** e enviados à Supabase com a CLI (`supabase secrets set --env-file`, e o Vault por SQL a partir de ficheiro). Os valores secretos nunca foram mostrados.
- Confirmado: a função tem os 4 segredos (`PUSH_SHARED_SECRET`, `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`); o Vault tem `send_push_secret`. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são dados pela Supabase à função automaticamente.
- `.env.example` documenta a variável nova (sem valor).
- **Se um dia for preciso trocar as chaves:** gerar um par novo, voltar a gravar os segredos e a variável na Vercel, e **reativar as notificações em cada aparelho** (as subscrições antigas deixam de valer).

**Ação do Gabriel:** acrescentar na Vercel (Settings → Environment Variables, Production) `VITE_VAPID_PUBLIC_KEY` = `BLSxi5E6aEiKOhZcBZdh5vHfhFqKYKep5Tx4V90RNxOiCO18hm-BC2kvtVuq3Mx2ZrIBUl7G5_wlBkkdbosSpTE`. Só é preciso antes de testar no iPhone (7.3); o redeploy acontece no próximo push.

---

## 7.1 — Motor no servidor ✅ *(aplicado e testado em 2026-11-15)*

Migrations `20261115160000_notifications_engine.sql` e `20261115170000_daily_summary_dedupe.sql` (SQL mostrado e aprovado pelo Gabriel antes de cada uma).

| Peça | O que faz |
|---|---|
| `pg_net` (0.20.4) | Ligado: a base de dados chama a Edge Function |
| Gatilho em `appointment_services` | **Nova marcação online** feita pelo **cliente** (`app.actor = client`) → "Nova marcação — João, Barba, seg 07/12 09:00" (+ "· ⚠️ N faltas" a partir do limite das Configurações). Marcações do barbeiro **não** notificam (a base de dados nem deixa o barbeiro criar com origem "Online") |
| Gatilho em `appointments` | **Cancelamento pelo cliente** → "João cancelou: Barba, seg 07/12 09:00. O horário ficou livre." O do barbeiro não notifica |
| `send_reminders()` (cron `notifications_tick`, cada minuto) | **Lembrete** X min antes (Configurações; pedido: 5) → "Daqui a 5 min: João, Barba". Só confirmadas, nunca repete, ignora marcações criadas já dentro da janela |
| `send_daily_summary()` (mesmo cron) | **Resumo do dia** nos 10 min a seguir à hora escolhida, só em dias de trabalho, uma vez por dia → "Hoje: 7 marcações, a 1.ª às 09:30" / "Hoje ainda não há marcações." |
| `purge_notifications()` (cron 03:00) | Apaga notificações com mais de 30 dias |
| Gatilho em `notifications` → `request_push()` | Cada notificação nova pede o push à Edge Function `send-push` (pg_net, com o segredo do Vault no cabeçalho `x-push-secret`). **Nunca faz falhar quem criou a notificação**: se o pedido falhar, só fica um aviso no registo |

Cada tipo respeita o interruptor das Configurações. Datas no formato "seg 07/12 09:00" (hora de Lisboa).

**Testes (bloco desfeito no fim):** ✅ online → 1 notificação · ✅ ⚠️ 1 falta · ✅ barbeiro marca → 0 · ✅ barbeiro cancela → 0 · ✅ cliente cancela → 1 · ✅ interruptores desligados → 0 · ✅ lembrete "Daqui a 4 min", 2.ª volta 0, criada em cima da hora ignorada, desligado 0 · ✅ resumo segunda 08:02 sim, repetir não, domingo não, 09:00 não, desligado não · ✅ cada notificação → pedido à `send-push` com segredo · ✅ público continua só com as 8 funções.

**Correção durante os testes:** o "já enviado hoje" do resumo passou a usar o dia real (2.ª migration). Em produção o comportamento é igual; ficou certo também com a tarefa atrasada perto da meia-noite.

**Até à 7.2:** a tarefa já corre a cada minuto; os pedidos de push ainda não têm função publicada para os receber (as notificações ficam guardadas na mesma). Lembrete desligado nas Configurações; resumo do dia ligado às 08:00.

**Nota do Gabriel (2026-11-15):** o lembrete de 5 min tem de servir para as marcações **online e as feitas pelo barbeiro**. ✅ Já é assim: `send_reminders()` olha para **todas** as marcações confirmadas, qualquer que seja a origem (o teste da 7.1 foi com uma marcação de origem WhatsApp). Única exceção: uma marcação criada já dentro dos 5 min (ex.: cliente que entra pela porta) não gera aviso, porque o barbeiro acabou de a fazer.

---

## 7.2 — Envio do push (Edge Function `send-push`) ✅ *(publicada e testada em 2026-11-15)*

Ficheiros: `supabase/functions/send-push/index.ts` e `webpush.ts`.

- **Sem bibliotecas de push:** a Arquitetura previa uma biblioteca com "plano B" em Web Crypto (lição do TS Hours). Adotado o **plano B logo à partida**: cifra RFC 8291 (`aes128gcm`: ECDH P-256 + HKDF + AES-128-GCM) e assinatura VAPID RFC 8292 (JWT ES256) com a Web Crypto, que o Deno já tem. Só depende de `@supabase/supabase-js` (oficial).
- **Segurança:** só aceita `POST` com o segredo partilhado (`x-push-secret`, comparação em tempo constante); publicada **sem verificação de JWT** (quem chama é a base de dados, autenticada pelo segredo); lê com a `service_role`, que só existe no servidor.
- **O que faz:** lê a notificação → conta as não lidas (badge) → envia a cada aparelho de `push_subscriptions` → apaga os expirados (404/410) → grava `push_sent_at` e `last_used_at`.
- **Ao tocar** abre a marcação na agenda (`/admin/agenda?data=AAAA-MM-DD&m=<id>`); o resumo do dia abre a agenda de hoje; o resto, a página de notificações.

**Teste no PC (2026-11-15)**, contra a implementação de referência `http_ece` 1.2.0 e o `crypto` do Node: ✅ decifra mensagens de 1, 130 (com acentos e ⚠️) e 3000 caracteres · ✅ cada cifra é diferente (salt e chave novos) · ✅ JWT ES256 com `aud` = origem do serviço de push, `sub` = site, validade 12 h · ✅ assinatura válida · ✅ cabeçalho `k` = chave pública.

**Publicação (com o OK do Gabriel):** `supabase functions deploy send-push --no-verify-jwt`. Depois: testar que recusa sem segredo (401) e que responde com o segredo (0 aparelhos até à 7.3).

**Publicada (2026-11-15, com o OK do Gabriel):** `supabase functions deploy send-push --no-verify-jwt --use-api`.

| Teste à função publicada | Resultado |
|---|---|
| `GET` | ✅ 405 |
| `POST` sem segredo · com segredo errado | ✅ 401 `unauthorized` |
| `POST` com segredo, sem `notification_id` | ✅ 400 |
| `POST` com segredo, notificação inexistente | ✅ 404 `not_found` |
| **Base de dados → função** (notificação "Teste do sistema" criada com `notify()`) | ✅ o `pg_net` chamou a função sozinho e recebeu **200** `{"ok":true,"aparelhos":0,"enviados":0,…}` (ainda não há aparelhos: a 7.3 é que os regista). Notificação de teste apagada a seguir (0 notificações na base de dados) |

O push no telemóvel só se vê depois da 7.3 (ativar o aparelho). Antes disso: **o Gabriel acrescenta `VITE_VAPID_PUBLIC_KEY` na Vercel** (ver 7.0).

---

## 7.3 — Ativar no telemóvel ✅ *(testada pelo Gabriel no iPhone, 2026-11-15)*

| Peça | Ficheiro | O que faz |
|---|---|---|
| Lógica do aparelho | `src/admin/push.js` (`usePush`) | Estados: **instalar** (iPhone fora do ecrã principal) · **sem suporte** · **bloqueadas** · **desativadas** · **ativas**. Ativar = toque → permissão → subscrição no service worker (chave pública VAPID) → grava em `push_subscriptions` (só as do próprio, RLS). Desativar = apaga e cancela a subscrição. Se o aparelho está subscrito mas a linha desapareceu, volta a gravá-la sozinho |
| Cartão "Notificações neste dispositivo" | `configuracoes/SeccaoDispositivo.jsx` (em Configurações, por cima das preferências) | Instruções do iPhone (Partilhar → Adicionar ao ecrã principal → abrir pelo ícone) · **Ativar notificações** · **Enviar notificação de teste** · **Desativar neste dispositivo** · nº de dispositivos ativados · mensagens para permissão negada/ignorada |
| Aviso no Início | `inicio/AvisoNotificacoes.jsx` | Enquanto não estiverem ativas neste telemóvel: "Ative as notificações…" (ou instruções / bloqueadas) → leva ao cartão (`#notificacoes-dispositivo`) |
| Notificação de teste | migration `20261115180000_test_notification.sql` | Tipo novo `test` + `admin_send_test_notification()` (só administrador): segue o caminho normal (lista + push) |
| Service worker | `src/sw.js` | Passa a usar `tag` (o mesmo acontecimento não aparece duplicado) |

Texto das preferências atualizado ("Vale para todos os dispositivos com notificações ativas…").

**Verificado (2026-11-15, browser de testes em tamanho de telemóvel, `/admin?preview`):** "bloqueadas" (o browser de testes bloqueia notificações) · com a permissão simulada: "Ativar notificações" · com um iPhone simulado fora do ecrã principal: os 3 passos de instalação · aviso no Início · lint e build OK · a chave pública só entra no código do painel; nenhum segredo no site.

**Não dá para testar aqui:** pedir a permissão a sério e receber o push (o browser de testes bloqueia) → **teste do Gabriel no iPhone**.

### Para o teste no iPhone
1. **Eu:** aplicar a migration da notificação de teste (com o teu OK).
2. **Tu:** Vercel → `VITE_VAPID_PUBLIC_KEY` (ver 7.0) → commit + push (o deploy leva a chave).
3. No iPhone: abrir `mrpolobarber.vercel.app/admin` no Safari → Partilhar → Adicionar ao ecrã principal → abrir pelo ícone → entrar.
4. Configurações → **Ativar notificações** → Permitir.
5. **Enviar notificação de teste** → fechar a app → deve chegar "Notificação de teste" e o número no ícone.

**1.º teste do Gabriel (2026-11-15): "não achei para mandar notificação de teste".** Diagnóstico: o código novo já estava publicado, mas **sem a chave pública** (`VITE_VAPID_PUBLIC_KEY` não estava na Vercel no momento do build) → o painel considerava as notificações "não suportadas" e não mostrava o botão Ativar (nem o de teste, que só aparece depois de ativar). Nenhum aparelho registado. A migration da notificação de teste também ainda não estava aplicada.
- Correção: novo estado **"sem chave"** com a mensagem certa ("falta a chave pública na Vercel… é preciso publicar de novo"), em vez de "este navegador não permite".
- Falta: Gabriel acrescenta a variável na Vercel e publica de novo; aplicar a migration (com OK).
- **Migration `20261115180000_test_notification.sql` aplicada (2026-11-15, OK do Gabriel).** Tipos de notificação: `new_booking, client_cancelled, daily_summary, reminder, test`. `admin_send_test_notification()`: executável por `authenticated`, não por `anon`; teste (desfeito): utilizador que não é administrador → "Sem permissão"; administrador → cria "Notificação de teste".

**2.º teste do Gabriel (2026-11-15): "Chegou".** Confirmado no servidor: 1 aparelho registado (serviço `web.push.apple.com`); 3 "Notificação de teste" enviadas, cada uma com resposta 200 da função (`aparelhos: 1, enviados: 1, falhas: []`) e `push_sent_at` gravado. **Primeiro push real no iPhone ✅** — a cadeia completa funciona: notificação → `pg_net` → `send-push` → Apple → iPhone.

---

## 7.4 — Página Notificações ✅ *(testada pelo Gabriel no iPhone, 2026-11-15)*

| Peça | Ficheiro | O que faz |
|---|---|---|
| Contador único | `src/admin/naoLidas.js` | Nº de não lidas **partilhado** pela navegação, Início, página e **número no ícone** (`setAppBadge`/`clearAppBadge`). Atualiza ao abrir o painel, ao voltar à app, quando chega um push (aviso do service worker) e de minuto a minuto |
| Página | `src/admin/pages/Notificacoes.jsx` (substitui o marcador provisório; `Paginas.jsx` apagado) | Lista dos últimos 30 dias por dia (Hoje, Ontem, datas), ícone por tipo, hora; **não lidas em destaque** (contorno dourado + ponto) · tocar → marca **só essa** como lida e abre a **marcação** na agenda (o resumo do dia abre a agenda de hoje; o teste não leva a lado nenhum) · **"Marcar todas como lidas"** · cabeçalho "N por ler" / "Tudo lido" |
| Navegação | `AdminLayout.jsx` | Número dourado em "Notificações" (menu lateral e barra inferior) |
| Início | `Inicio.jsx` | "N por ler" usa o mesmo contador; cada pendência é clicável (marca como lida e abre a marcação) |
| Push → lida | `src/sw.js` + `AdminLayout.jsx` | Ao **tocar no push**, abre com `?n=<id>`; o painel marca essa notificação como lida e limpa o endereço (2.9: "automático ao abrir") — sem precisar de republicar a função |

**Verificado (2026-11-15, browser em tamanho de telemóvel, notificações simuladas):** lista agrupada (Hoje/Ontem) com 3 por ler · número **3** na navegação · tocar na "Nova marcação" → pedido só para essa (`id=in.(n1)`), ficam 2 · "Marcar todas como lidas" → "Tudo lido", sem número · aberto com `?n=` → lida e endereço limpo · contador e lista sempre iguais · lint e build OK.

**Para o teu teste no iPhone (depois do push):** o ícone mostra **3** (as notificações de teste) → abrir Notificações → tocar numa → fica lida, o número passa a 2 → "Marcar todas como lidas" → o número desaparece do ícone. Enviar outra notificação de teste e **tocar no push** → abre o painel e essa já aparece lida.

---

## 7.5 — Lembrete de 5 minutos ✅ *(testado pelo Gabriel no iPhone, 2026-11-16)*

**Pedido do barbeiro:** aviso 5 minutos antes de cada cliente, nas marcações **online e nas feitas por ele**.

- `settings`: `reminder_enabled = true`, `reminder_minutes = 5` (gravado a 2026-11-15; aparece em Configurações → Notificações e pode ser mudado lá, de 5 a 120 min).
- Mantêm-se: nova marcação ✅ · cancelamento pelo cliente ✅ · resumo do dia ✅ às 08:00.
- Texto: **"Próximo cliente — Daqui a 5 min: João, Barba"**; ao tocar abre a marcação na agenda.
- Regras (testadas na 7.1): só marcações **confirmadas**, de **qualquer origem**; um aviso por marcação; não avisa uma marcação criada já dentro dos 5 min (o barbeiro acabou de a fazer).
- Como a tarefa corre de minuto a minuto, o aviso chega entre **5 e 4 minutos** antes da hora.

### Teste real (Gabriel, no iPhone)
1. Painel → Agenda → **Nova marcação** para ti, com início **daqui a 10 minutos** (fora do horário → confirmar o aviso).
2. Fechar a app e esperar: por volta dos **5 min antes** chega "Próximo cliente — Daqui a 5 min: …".
3. Tocar no push → abre a marcação na agenda (já lida em Notificações).
4. Depois, cancelar essa marcação no painel (o cancelamento do barbeiro não gera notificação).

**Teste do Gabriel (2026-11-15):** ainda não feito — ao domingo a lista "Horários livres" do formulário fica vazia e pareceu não haver horário. Nota: no painel pode-se **escrever qualquer hora** no campo "Hora" (a lista é só sugestão); fora do horário aparece o aviso e confirma-se. Fica para **segunda 16/11 de manhã**. Confirmado no servidor: a tarefa `notifications_tick` corre a cada minuto sem erros; o push recebido às 15:37 era uma "Notificação de teste".

---

## 7.6 — Testes e validação ✅ *(concluída 2026-11-16)*

### Matriz de critérios
✅ provado · 📱 teste real do Gabriel · ⏳ segunda 16/11 de manhã

**2.9 — Notificações**
| Critério | Estado | Prova |
|---|---|---|
| Marcação online gera notificação interna e push | ✅ | 7.1 T1 (interna) · 7.2/7.3 (push chega ao iPhone pela mesma cadeia) |
| Cliente sinalizado → "⚠️" | ✅ | 7.1 T2: "· ⚠️ 1 falta" |
| Cancelamento pelo cliente → interna e push | ✅ | 7.1 T4 |
| Resumo do dia à hora configurada, **sem a app aberta** | ⏳ | Lógica ✅ (7.1 T7). Real: **segunda 16/11 às 08:00** deve chegar "Resumo do dia — Hoje: …" |
| Ações do barbeiro **não** notificam, mas ficam no histórico | ✅ | 7.1 T3/T4 (0 notificações); histórico já provado na Etapa 5/6.7 |
| Desligar um tipo → deixa de chegar | ✅ | 7.1 T5 e lembrete desligado → 0 |
| Tocar numa notificação abre a marcação | ✅ 📱 | 7.4 (testado pelo Gabriel) |
| Contador igual no Início, navegação e badge | ✅ 📱 | 7.4 (contador único; testado no iPhone) |
| Com o push desativado, as notificações continuam na lista | ✅ | A notificação é criada antes e independentemente do envio (7.2: com 0 aparelhos a função responde e a notificação fica) |
| **Lembrete 5 min antes** (pedido do barbeiro) | ⏳ | Lógica ✅ (7.1 T6). Real: segunda de manhã, marcação daqui a 10 min |

**3.10 — Web Push**
| Critério | Estado | Prova |
|---|---|---|
| "Ativar notificações" no iPhone (PWA) pede permissão e grava o aparelho | ✅ 📱 | 7.3: 1 aparelho (`web.push.apple.com`) |
| Push chega com o PWA fechado | ✅ 📱 | 7.3: "Chegou" (3 envios, 0 falhas) |
| Tocar no push abre a marcação certa | ✅ 📱 | 7.4 |
| Badge mostra as não lidas e atualiza ao ler | ✅ 📱 | 7.4 |
| Chave privada VAPID e `service_role` fora do site e do repositório | ✅ | Procura (2026-11-15): 0 ocorrências da chave privada e do segredo partilhado nos ficheiros do projeto e em **todo o histórico do Git**; no site publicado (~700 KB de código) 0 da chave privada, do segredo, de `service_role` e de `sb_secret_`; só a chave **pública** (esperado) |

**Segurança (2026-11-15):** público continua só com as **8 funções públicas** · das funções novas, só `admin_send_test_notification` é executável com sessão (e verifica se é administrador); gatilhos, lembretes, resumo, limpeza e envio só correm no servidor · 0 funções privilegiadas sem `search_path` fixo · todas as tabelas com RLS · `send-push`: sem segredo → 401.

### Testes reais de segunda-feira 16/11 de manhã (Gabriel)
1. **08:00 — Resumo do dia** chega sozinho (app fechada): "Resumo do dia — Hoje: …". ✔ = critério 2.9 "resumo à hora configurada sem a app aberta".
2. **Lembrete de 5 min:** Agenda → Nova marcação → escrever uma hora **10 min à frente** no campo "Hora" (a lista de horários livres é só sugestão) → gravar → fechar a app → por volta de 5 min antes chega "Próximo cliente — Daqui a 5 min: …" → tocar abre a marcação → cancelar a marcação de teste.
3. Dizer-me o resultado: confirmo no servidor (notificação criada, hora do envio, resposta da Apple). Com estes dois ✅, a **Etapa 7 fecha**.

### Testes reais de segunda 16/11 ✅ (Gabriel, iPhone; confirmados no servidor)
| Teste | Resultado no servidor |
|---|---|
| **Resumo do dia às 08:00**, app fechada | Criado 08:00:00, enviado 08:00:08 — "Hoje ainda não há marcações." |
| **Lembrete 5 min** (marcação manual WhatsApp às 09:45) | Criado 09:40:00, enviado 09:40:04 — "Daqui a 5 min: Gabriel Tolin, Cabelo e barba" |

Com isto, todos os critérios da 2.9 e da 3.10 estão ✅.

---

✅ **ETAPA 7 FECHADA (2026-11-16).** "Etapa pode fechar" (Gabriel).
