# MR Polo Barber — Notificações

**Etapa 7 — Notificações ao barbeiro** · Em curso desde 2026-11-15 (plano e as 4 decisões validados pelo Gabriel)

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

## 7.3 — Ativar no telemóvel 🔶 *(feita em 2026-11-15; falta aplicar 1 migration e o teu teste no iPhone)*

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
