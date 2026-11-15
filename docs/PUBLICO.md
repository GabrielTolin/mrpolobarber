# MR Polo Barber — Área pública

**Etapa 6 — Área pública (marcações online)** · Em curso desde 2026-11-13 (plano validado; design opção B)

A página onde os clientes marcam sozinhos, sem conta, e o link pessoal para ver e cancelar. Segue a [Especificação](ESPECIFICACAO.md) (2.1, 2.4–2.7, 2.10, 2.14) e a [Arquitetura](ARQUITETURA.md) (3.6–3.9). O painel (Etapa 5) já está feito e testado.

**Regras que vêm das etapas anteriores:**
- O cliente **não escolhe a categoria**: o preço sai do telemóvel (habitual só se registado pelo barbeiro) e **só aparece na revisão** (2.7).
- **Confirmação automática**, sem aprovação do barbeiro (2.1).
- **No máximo 2 marcações futuras por telemóvel**, número bloqueado não marca online (2.1, 1.6).
- **Sem email nem SMS**: link pessoal + "Lembrar neste dispositivo" + `.ics` (2.10).
- Cancelar pelo link **até 2 h antes** (1.5).
- O público **só usa funções controladas**, nunca tabelas, com **limite de pedidos** e anti-bot (3.7).
- As **notificações ao barbeiro** (nova marcação, cancelamento) ficam para a etapa das notificações.

## Subetapas propostas

| # | Subetapa | O que inclui | Base |
|---|---|---|---|
| 6.0 | **Design da página pública** | Aspeto da página do cliente no telemóvel, com a identidade do painel | Design |
| 6.1 | **Funções públicas (backend)** | Migration: `public_info`, `public_services`, `available_days`, `available_slots` aberta ao público, `quote_price`, **`create_booking`** (fila, revalidação, idempotência, telemóvel bloqueado, limite de 2, código do link guardado só em hash), `get_booking`, `cancel_booking`, **limite de pedidos** (`rate_limits`) e campo armadilha, limpeza dos registos (cron) · testes, incluindo **20 pedidos simultâneos** para o mesmo horário | 3.6, 3.7, 3.9 |
| 6.2 | **Fluxo de marcação** | Passos 1–6: serviço (sem preço) → dia (calendário com dias sem vagas desativados) → hora → dados (nome, telemóvel +351, observações, "Lembrar neste dispositivo", aviso de privacidade) → revisão com o preço | 2.1, 2.4, 2.7 |
| 6.3 | **Confirmação e "lembrar"** | Ecrã de sucesso: resumo, **link pessoal** (copiar), **"Adicionar ao calendário"** (.ics), WhatsApp · "Lembrar neste dispositivo" e **"As suas próximas marcações"** na página inicial · "Não sou eu / esquecer" | 2.1, 2.10, 3.9 |
| 6.4 | **Link pessoal** (`/m/:código`) | Ver a marcação · **cancelar até 2 h antes** · depois disso, "Contacte o barbeiro" · "Marcar novo horário" | 1.5, 2.6 |
| 6.5 | **Casos excecionais** | Horário ocupado entretanto (volta ao passo 4 sem perder os dados) · número bloqueado · limite de 2 · sem vagas · telemóvel inválido · demasiados pedidos | 2.1, 2.5 |
| 6.6 | **Privacidade** | Aviso no formulário + página de **política de privacidade** (com os dados em falta P-03 como marcadores, a preencher antes do lançamento) | 1.7, P-04 |
| 6.7 | **Testes e validação** | Critérios de aceitação da 2.1, 2.5, 2.6, 2.10 · teste no iPhone e noutro telemóvel · concorrência | — |

## Pergunta para começar: o design (6.0)

O handoff do Claude Design só cobre o **painel** (Início). Para a página pública há duas opções:
- **A — Fazes um mockup no Claude Design** (como fizeste para o painel), com o fluxo de marcação no telemóvel, e eu sigo-o com o conteúdo validado.
- **B — Desenho eu**, com o mesmo sistema visual do painel (preto, dourado, serifa, logótipo), pensado primeiro para o telemóvel. Mostro-te antes de avançar.

---

## 6.0 — Design da página pública ✅ *(concluída 2026-11-13)*

**Decisão (2026-11-13): opção B**, o Claude desenha com a mesma linha do painel, **incluindo o logótipo de fundo** no mesmo esquema (fixo, centrado, 8 %).

### Linha visual
- Fundo escuro do painel · **logótipo de fundo a 8 %** · cabeçalho preto com o **logótipo** (104 px) e a **risca do barber pole** por baixo · rodapé com "Política de privacidade".
- Coluna de **480 px no máximo**, pensada primeiro para o telemóvel.
- Cartões com fundo ligeiramente opaco (`bg/70`) para o texto ficar legível por cima do logótipo.
- Cada passo: **"Passo N de 5"** (eyebrow dourado) + título em serifa + **barra de progresso** de 5 segmentos + "‹ Voltar".

### Os 7 ecrãs (pré-visualização em `npm run dev` → `/design?ecra=1…7`, só em desenvolvimento)
| # | Ecrã | Conteúdo |
|---|---|---|
| 1 | **Serviço** | (Se houver) cartão **"As suas próximas marcações"** · lista dos serviços com nome e **duração, sem preço** · "O preço aparece no fim, antes de confirmar" |
| 2 | **Dia** | Calendário do mês (seg–dom), dias livres com contorno dourado, **dias sem vagas/fechados/passados apagados**, dia escolhido a dourado |
| 3 | **Hora** | Horários livres em botões, separados por **Manhã / Tarde** (inclui os de encaixe, ex.: 09:35) |
| 4 | **Dados** | Nome · telemóvel com **+351** · observações · **"Lembrar os meus dados neste dispositivo"** · aviso de privacidade com link · Continuar |
| 5 | **Revisão** | Cartão dourado: hora grande, dia, serviço · duração, **preço** (calculado pelo telemóvel), nome e telemóvel · **Confirmar marcação** · "Pode cancelar até 2 horas antes" |
| 6 | **Confirmada** | ✓ "Marcação confirmada · Até já, João!" · resumo · **link pessoal** com copiar · **Adicionar ao calendário** · **Falar com o barbeiro** (WhatsApp) |
| 7 | **Link pessoal** | "Olá, João" · resumo com o estado · **Cancelar marcação** · "Pode cancelar até … às …" · Falar com o barbeiro |

Componentes já reutilizáveis para as subetapas seguintes: `src/public/ui/` (`Passo`, `ListaServicos`, `Calendario`, `GrelhaHoras`, `ResumoMarcacao`) · `PublicLayout` atualizado · `DesignPreview` (só desenvolvimento; confirmado fora da build de produção).

**Fluxo de 7 ecrãs aprovado pelo Gabriel (2026-11-13): "Está ótimo assim".** A página de entrada (ecrã 0) também está validada → **6.0 concluída**.

### Ecrã 0 — Página de entrada (landing) ✅ *(validada "por enquanto", 2026-11-13)*
Pedida pelo Gabriel: **não um tutorial, mas uma "landing page" que promove a barbearia**. As referências que mostrou eram só ideias, não modelos.

**Histórico de decisões (2026-11-13):**
- 1.ª versão (passo a passo explicado): **recusada**, "não quero um tutorial".
- 2.ª versão (clássica, longa, com barbeiro, galeria e serviços): **recusada**. O topo não agradava e a página era demasiado longa.
- **Direção atual: a referência 2** (foto a ocupar o ecrã, título grande a dourado com brilho, destaques em baixo).
- **Na landing não há** cabeçalho com o logótipo pequeno, risca listrada nem caixinhas do passo a passo. As caixinhas só aparecem depois de "Marcar horário".
- **Primeiro telemóvel, depois ecrã grande.**
- **Validada "por enquanto"** pelo Gabriel, **sem o cartão "As suas próximas marcações"** na landing. Esse cartão (2.10) continua no **passo 1** do fluxo (ecrã 1).

Componente `src/public/ui/Entrada.jsx` (pré-visualização: `/design?ecra=0`). O `PublicLayout` fica "imersivo" na página de entrada (sem cabeçalho, risca nem rodapé próprios do layout).

| Bloco | Telemóvel | Ecrã grande |
|---|---|---|
| **Barra do topo** | Logótipo à esquerda · botão **Marcar** à direita | Igual |
| **Herói (ecrã inteiro)** | Foto de fundo (provisório: luz quente + logótipo) escurecida de baixo · etiqueta "Barbearia em Albufeira" · **"O seu estilo, feito ao detalhe."** a dourado com brilho · frase · **Marcar horário** · Como chegar → | Texto à esquerda, foto à direita (escurecida da esquerda) |
| **Destaques** (como os números da referência, mas com informação real) | Seg a Sáb 09:00–19:00 · Albufeira, Algarve · Na hora, confirmação online | Igual |
| **Horário e onde estamos** | Único bloco abaixo do herói: horário, nome, morada, Ver no mapa, WhatsApp | Lado a lado |
| Rodapé | Política de privacidade | Igual |

**Por preencher antes do lançamento:** a **foto principal** (o Gabriel vai arranjá-la) e a morada e o WhatsApp (P-02). Os textos do título e da frase podem ser afinados.

**Rotas previstas:** `/` = página de entrada · `/marcar` = fluxo (passos 1–5 + confirmação) · `/m/:código` = link pessoal.

---

## 6.1 — Funções públicas (backend) ✅ *(validada 2026-11-13)*

Migration `20261113150000_public_booking.sql` (SQL mostrado e aprovado pelo Gabriel antes de aplicar).

### Funções públicas (`anon` e `authenticated`)
| Função | Devolve | Limite de pedidos |
|---|---|---|
| `public_info()` | Nome, dono, morada, mapa, WhatsApp, privacidade, regras visíveis (dias à frente, prazo de cancelamento, limite por telemóvel) e horário semanal com pausas | 120/min por IP (todas as leituras juntas) |
| `public_services()` | Serviços ativos: id, nome, descrição, duração · **sem preços** | idem |
| `available_days(serviço, de, até)` | Dias com vagas (máx. 63 dias por pedido) | idem |
| `available_times(serviço, dia)` | Horas livres (`start_at` + `time_local`) | idem |
| `quote_price(serviço, telemóvel)` | `{ok, price_cents}` · habitual só se o barbeiro o marcou | 30/h por IP |
| `create_booking(serviço, início, nome, telemóvel, observações, chave, armadilha)` | Resumo + **código do link (uma vez)** | 5/h por IP e 3/h por telemóvel |
| `get_booking(código)` | Resumo com estado efetivo, `can_cancel`, `cancel_until` | 30/h por IP (com `cancel_booking`) |
| `cancel_booking(código)` | Resumo já cancelado | idem |

**Códigos de erro** (`{ok: false, error}`): `INVALID_REQUEST` · `REJECTED` (armadilha) · `RATE_LIMITED` · `INVALID_PHONE` · `INVALID_NAME` · `INVALID_NOTES` · `SERVICE_UNAVAILABLE` · `TOO_LATE` · `SLOT_TAKEN` · `PHONE_BLOCKED` · `LIMIT_REACHED` (+ `limit`) · `NOT_FOUND` · `ALREADY_CANCELLED` · `TOO_LATE_TO_CANCEL`. As leituras, ao passar o limite, dão erro `RATE_LIMITED`.

### Decisões aprovadas (diferenças em relação à Arquitetura)
1. **`available_slots` continua só do painel** (tem `p_exclude`); o público usa **`available_times`**, com o mesmo cálculo e limite de pedidos.
2. **Código do link** = HMAC-SHA256 da chave do pedido com um **segredo interno** (`app_secrets`, ilegível para todos), em base64 para URL (43 caracteres). Continua imprevisível e guardado **só em hash**, e um pedido repetido recebe **o mesmo link**.
3. **Notificação ao barbeiro** fica para a etapa das notificações.

Outros pormenores: telemóvel normalizado como no site (`normalize_phone` = `normalizarTelefone`) · nome 2–80 caracteres, observações até 200 · IP e telemóvel nos limites **só em hash com o segredo** · tarefa `purge_rate_limits` (cron, de hora a hora, ao minuto 17) apaga registos com mais de 24 h.

### Testes (2026-11-13)
**Regras** (bloco desfeito no fim, 15 grupos): todos ✅. Leitura sem preços · preço visitante/habitual · criar (hash, ator "cliente", visitante novo) · repetido = mesmo código · ocupado, cedo demais, fora da grelha · bloqueado · limite de 2 (ficha intacta, RN-11) · armadilha · ver/código falso/alterado · cancelar fora/dentro do prazo, repetido, vaga liberta · limites 5/h IP, 3/h telemóvel, 30/h preço · IP não fica em claro · `anon` sem acesso a tabelas, segredo e funções internas.

**Concorrência** (pedidos reais em simultâneo, 07/12):
| Cenário | Resultado |
|---|---|
| **20 pedidos para o mesmo horário** | ✅ **1 marcação**, 19 × `SLOT_TAKEN` |
| 2 pedidos com a mesma chave | ✅ 1 marcação, **mesmo código** nos dois |
| 3 pedidos do mesmo telemóvel (limite 2) | ✅ 2 marcações + `LIMIT_REACHED` |

Dados do teste **apagados** com o OK do Gabriel (4 marcações, 3 clientes, contadores). Proteções contra apagar religadas e confirmadas.

**Pela API do site** (chave publicável): `public_services` responde sem preços · `select` direto a `appointments` → 401 · `available_slots` → recusada · `get_booking` com código inventado → `NOT_FOUND`.

**6.1 validada pelo Gabriel (2026-11-13).**

---

## 6.2 — Fluxo de marcação ✅ *(testada e validada pelo Gabriel, 2026-11-13)*

**Rotas:** `/` = página de entrada (`src/public/Inicio.jsx`, dados reais de `public_info`) · `/marcar` = fluxo (`src/public/Marcar.jsx`). Acesso ao backend só pelas funções públicas, em `src/public/publicApi.js` (com as mensagens de cada código de erro).

| Passo | O que faz |
|---|---|
| Entrada | Horário e destaques vindos dos **Horários do painel**; morada, mapa e WhatsApp das **Configurações** (aparecem quando estiverem preenchidos, P-02) · "Marcar horário" → `/marcar` |
| 1 · Serviço | `public_services` (sem preços) |
| 2 · Dia | Calendário com `available_days` mês a mês, até `max_days_ahead`; dias sem vagas apagados · mês sem vagas → aviso + "Falar com o barbeiro" |
| 3 · Hora | `available_times`, Manhã/Tarde · dia que entretanto ficou cheio → aviso |
| 4 · Dados | Nome, telemóvel (+351 ou com indicativo), observações (≤ 200), **campo armadilha** escondido, "Lembrar…" (a gravação no dispositivo é a 6.3), aviso de privacidade · validação no site e depois `quote_price` |
| 5 · Revisão | Resumo com o **preço** pelo telemóvel · "Confirmar marcação" → `create_booking` com chave de idempotência (proteção extra contra duplo clique) |
| Confirmada | O essencial: ✓, resumo, **link pessoal** com copiar, "Voltar ao início". O resto (`.ics`, WhatsApp, lembrar, próximas marcações) é a **6.3** |

**Comportamento:**
- O passo vai no endereço (`?passo=N`): o "voltar" do telemóvel volta um passo, sem perder os dados. Abrir um passo diretamente sem os anteriores → passo 1.
- Horário ocupado entretanto (`SLOT_TAKEN`/`TOO_LATE`) → volta à **hora** com aviso, mantendo os dados (2.1, 2.5). Serviço desativado → volta ao serviço. Bloqueado / limite / demasiados pedidos → mensagem + "Falar com o barbeiro".
- Depois de confirmada, o "voltar" não repete a marcação (e a chave de idempotência garante-o no servidor).

**Verificado no browser (telemóvel):** entrada com horário real · serviço → dia (dias reais, hoje e sábado incluídos, domingo apagado) → horas (última da manhã 12:30 para 25 min) → dados (validação de campos vazios) → revisão com preço 9 € · voltar mantém os dados · `?passo=4` direto → passo 1 · consola sem erros · build de produção OK, sem a pré-visualização `/design`.

**Não testado por mim:** carregar em **"Confirmar marcação"** (cria uma marcação real) → fica para o teste do Gabriel.

**Nota:** o nome na secção "Onde estamos" vem de Configurações → Barbearia (hoje "MR Polo Barber").

---

## 6.3 — Confirmação e "lembrar" 🔶 *(implementada em 2026-11-15; à espera do teu teste)*

Segue a Especificação 2.10 (regras 6–10) e a Arquitetura 3.9 §2. **Nada disto vai para o servidor.**

| Peça | Ficheiro | O que faz |
|---|---|---|
| Memória do dispositivo | `src/public/lembrar.js` | `mpb.cliente` = `{nome, telefone}` · `mpb.marcacoes` = `[{codigo, inicio, fim, servico}]` (máx. 10). Todo o acesso protegido: com armazenamento bloqueado/navegação privada, marca-se na mesma, só não se lembra |
| Calendário | `src/public/ics.js` | Ficheiro `.ics` gerado no telemóvel: serviço + nome da barbearia, hora, morada (quando houver), link pessoal na descrição e **lembrete 1 h antes** (avisa o calendário do cliente, sem SMS nem email). Formato RFC 5545 (CRLF, linhas dobradas a 75 bytes) |
| Próximas marcações | `src/public/ui/ProximasMarcacoes.jsx` | Cartão no **passo 1** (decisão da 6.0). Cada marcação guardada é **confirmada no servidor** (`get_booking`): hora/serviço atualizados se o barbeiro mudou, "Cancelada" se foi cancelada; passadas, concluídas, faltas e códigos inexistentes **saem sozinhas**. "Ver →" abre o link pessoal (`/m/…`, página da 6.4) |
| Fluxo | `src/public/Marcar.jsx` | Passo 4 **pré-preenchido** com o nome e o telemóvel lembrados + "Dados lembrados neste dispositivo · Não sou eu / esquecer". Ao confirmar: com "Lembrar" ligado guarda o cliente e o link; desligado não guarda nada (e esquece o cliente) |
| Ecrã de sucesso | `Confirmada` em `Marcar.jsx` | ✓ + resumo + **link pessoal** (copiar) + **Adicionar ao calendário** + **Falar com o barbeiro** (WhatsApp com "Olá! Marquei Barba para ter., 17/11 às 10:00.", só aparece quando o WhatsApp estiver nas Configurações, P-02) + Voltar ao início |

**"Não sou eu / esquecer os meus dados"** (2.10 regra 9): no cartão das próximas marcações e no passo 4. Apaga `mpb.cliente` e `mpb.marcacoes`.

**Verificado (2026-11-15):** `.ics` correto (21 linhas CRLF, link dobrado, nenhuma linha > 75 bytes) · no browser (telemóvel): marcação guardada com código inventado e outra já passada → retiradas, cartão escondido, memória limpa · passo 4 pré-preenchido ("Gabriel Teste" / "933 000 999") · "Não sou eu" esvazia os campos e apaga a memória · consola sem erros · build OK.

**Fica para o teu teste** (precisa de uma marcação real): ecrã de sucesso com "Adicionar ao calendário" (no iPhone deve abrir o Calendário), o cartão "A sua próxima marcação" ao voltar a `/marcar`, e os dados preenchidos na marcação seguinte.

### Ajuste à página de entrada (2026-11-15, pedido do Gabriel)
- **Foto do Matheus** (enviada pelo Gabriel) em `public/hero-barbeiro.webp` (640 × 641, 45 KB). **Telemóvel:** foto a ocupar o ecrã, escurecida em cima (a parede é branca, para o logótipo e os botões se verem) e em baixo (texto). **Ecrã grande:** foto num quadro à direita com contorno dourado (esticada a toda a largura ficaria desfocada, porque tem só 640 px); o título encolhe um pouco para não lhe tocar (verificado a 1024 px e 1440 px).
- **Instagram provisório** (`@[instagram]`, a ligar a instagram.com): ícone ao lado do "Marcar" na barra do topo e linha no bloco "Onde estamos". Definido em `src/public/Inicio.jsx` (`INSTAGRAM`). O Gabriel vai confirmar o perfil e reorganizar o resto da página; depois o Instagram pode passar para as Configurações (precisa de uma coluna nova em `settings`).
- Se houver uma versão da foto com mais resolução (≥ 1200 px), fica mais nítida no telemóvel.

### Pedido do barbeiro: aviso 5 minutos antes de cada cliente
- **Já está previsto** (Especificação 2.9, Arquitetura 3.8 §2 "Lembrete"): a definição existe no painel, em Configurações → Notificações → "Lembrete antes de cada marcação" (de 5 a 120 minutos; desligado por defeito, 15 min).
- **Falta o envio**, que é da **etapa das notificações**: tarefa `reminders` (cron a cada minuto) → notificação → push para o telemóvel (Edge Function `send-push`, Web Push). No iPhone, o push só funciona com o painel **instalado no ecrã principal** (PWA) e com as notificações autorizadas.
- Quando essa etapa estiver feita: ligar o lembrete e pôr **5 minutos**.

---

## 6.4 — Link pessoal `/m/:código` 🔶 *(implementado em 2026-11-15; à espera do teu teste)*

`src/public/LinkPessoal.jsx` (ecrã 7 aprovado na 6.0). Usa só `get_booking` e `cancel_booking` (6.1).

| Situação | O que o cliente vê |
|---|---|
| **Confirmada, dentro do prazo** | "Olá, João" · resumo (cartão dourado) · **Confirmada** · **Cancelar marcação** · "Pode cancelar até quarta, 18/11, às 08:00." · Falar com o barbeiro · "Marcar outro horário" |
| Ao carregar em Cancelar | Confirmação: "Cancelar esta marcação? O horário fica livre para outra pessoa. Não é possível desfazer." · **Manter** / **Sim, cancelar** |
| **Confirmada, a menos de 2 h** | Sem botão de cancelar · "Já não é possível cancelar online (faltam menos de 2 horas). Se não puder vir, avise o barbeiro." · WhatsApp |
| **Cancelada** (pelo cliente / **pelo barbeiro**) | Estado a vermelho · **Marcar novo horário** |
| Em curso · Concluída · Falta | Estado correspondente (calculado pela hora, 3.8) |
| **Código inventado ou incompleto** | "Link não encontrado — Confirme se o copiou inteiro." · Marcar horário |
| Demasiados pedidos / sem rede | Mensagem correspondente |

- Se o prazo passar enquanto a página está aberta, o servidor recusa (`TOO_LATE_TO_CANCEL`) e a página mostra o estado atualizado.
- O código não sai para outros sites: a Vercel já envia `Referrer-Policy: strict-origin-when-cross-origin`, e os links externos têm `rel="noreferrer"`.
- "Falar com o barbeiro" leva uma mensagem pronta ("É sobre a minha marcação de Barba para qua., 18/11 às 10:00") e só aparece com o WhatsApp nas Configurações (P-02).

**Verificado (2026-11-15, telemóvel):** código inventado → "Link não encontrado" (resposta real do servidor). Com respostas **simuladas no browser** (sem tocar na base de dados): confirmada com botão e prazo · confirmação → cancelada + "Marcar novo horário" · dentro das 2 h → aviso sem botão · cancelada pelo barbeiro → "Cancelada pelo barbeiro". Consola sem erros.

**Fica para o teu teste:** abrir o link de uma marcação real (pelo ecrã de sucesso ou pelo "Ver →" do cartão no passo 1) e cancelá-la; confirmar no painel que fica **cancelada pelo cliente** e que o horário volta a aparecer livre.

---

## Alteração de horário (2026-11-15, pedido do barbeiro)

**Segunda a sexta: 09:00–12:00 · almoço 12:00–14:00 · 14:00–19:00** (o almoço era 13:00–14:00).

- **Base de dados:** migration `20261115120000_almoco_12h.sql` (só as pausas "Almoço" 13:00–14:00 de seg–sex). O painel (Horários) e a área pública leem daqui, por isso mudam sozinhos. **Aplicada a 2026-11-15** com o OK do Gabriel e confirmada (seg–sex 12:00–14:00); a página de entrada já mostra 09:00–12:00 · 14:00–19:00.
- **Código:** nova pausa no painel sugere 12:00–14:00 (`HorarioSemanal.jsx`) · exemplo da pré-visualização `/design` e comentário em `publicApi.js`.
- **Documentos:** REQUISITOS (§5), ESPECIFICAÇÃO (2.4 exemplos recalculados e 2.12 valores iniciais), ARQUITETURA (exemplo de coluna).
- **Sábado** (09:00–13:00) e **domingo** (fechado) **não mudaram** — a confirmar com o Gabriel.
- Marcações futuras afetadas: **nenhuma** (a única é 18/11 às 10:00).

### Instagram e localização (2026-11-15)
- **Localização:** gravada nas Configurações (`settings.map_url` = `https://maps.app.goo.gl/eAQQyidVFEzDUZq7A`, sem o parâmetro de rastreio da partilha). O barbeiro pode mudá-la no painel (Configurações → Barbearia).
- **Instagram:** `@mathybarber` → `https://www.instagram.com/mathybarber/` (sem o parâmetro de rastreio). Fica em `src/public/Inicio.jsx` (`INSTAGRAM`); não há ainda campo nas Configurações.
- **Botões clicáveis** (pedido do Gabriel): no topo, por baixo de "Marcar horário", **Como chegar** (Google Maps) e **Instagram** lado a lado; no fundo, **Ver no mapa**, **@mathybarber** e (quando houver) **WhatsApp**; mantém-se o ícone do Instagram ao lado do "Marcar" na barra do topo. Tudo abre numa janela nova. Verificado a 375 px (o topo continua a caber no primeiro ecrã) e a 1440 px; consola sem erros.
- **Ainda em falta (P-02):** morada escrita e WhatsApp nas Configurações; nome da barbearia ainda "MR Polo Barber".
- **Texto do topo (2026-11-15, escolha do Gabriel):** título **"Mr. Polo Barber Shop"** (era "O seu estilo, feito ao detalhe.") e por baixo só **"Marque online em 1 minuto e fica confirmado na hora."** (saiu "Corte, barba e cuidado masculino com o Matheus."). Linhas equilibradas no telemóvel.

---

## 6.5 — Casos excecionais ✅ *(validada 2026-11-15)*

Base: Especificação 2.1 (casos excecionais e critérios) e Arquitetura 3.6 §4. A 6.2 já tratava quase tudo; aqui foi **comparado caso a caso, corrigido e testado**.

### Correções
1. **"Sem vagas nos próximos 30 dias"** (faltava): o passo do dia pede agora **todos os dias até ao limite de uma vez** (em blocos de 60 dias, o máximo do servidor). Sem nenhum → o calendário é trocado por **"Sem vagas nos próximos dias"** + botão **Falar com o barbeiro** (quando o WhatsApp estiver nas Configurações; sem ele, sugere outro serviço). Com vagas, o calendário **abre no 1.º mês que tem vagas**.
2. **Textos iguais aos da especificação:** "Não é possível marcar online. Contacte o barbeiro." · **"Já tem 2 marcações agendadas. Para mais, contacte o barbeiro."** (o número vem do servidor, segue a definição do painel).

### Resultado (testado no browser, telemóvel, 2026-11-15)
Fluxo com os **dados reais** até à revisão e **só a resposta de erro simulada** no browser (nenhuma marcação criada):

| Caso (2.1) | Resultado |
|---|---|
| Horário ocupado entre a hora e a confirmação | ✅ "Esse horário acabou de ser ocupado. Escolha outro." → volta à **hora**; ao escolher outra, **nome e telemóvel mantêm-se** e o aviso desaparece |
| Antecedência passou enquanto escolhia | ✅ "Esse horário já não está disponível. Escolha outro." → volta à hora |
| Telemóvel bloqueado | ✅ Na revisão: "Não é possível marcar online. Contacte o barbeiro." (+ WhatsApp quando existir). Não grava |
| Já com 2 marcações futuras | ✅ "Já tem 2 marcações agendadas. Para mais, contacte o barbeiro." (+ WhatsApp) |
| Sem vagas nos próximos 30 dias | ✅ Mensagem em vez do calendário |
| Telemóvel inválido (`123`, `91234567`) | ✅ Erro no campo, não avança, **nem chega a ir ao servidor** · `+44 7700 900123` e `00351 912 345 678` passam |
| Demasiados pedidos | ✅ "Demasiadas tentativas. Tente mais tarde ou contacte o barbeiro." |
| Sem rede ao confirmar | ✅ "Sem ligação…" · a nova tentativa leva **a mesma chave** (2 tentativas → mesma chave), por isso nunca duplica |

**Do lado do servidor** estes casos já foram provados na 6.1 (testes SQL e concorrência real): `SLOT_TAKEN`, `TOO_LATE`, `PHONE_BLOCKED`, `LIMIT_REACHED` (incl. 3 pedidos simultâneos do mesmo telemóvel), `RATE_LIMITED`, 20 pedidos simultâneos → 1 marcação.

**Critério ainda em aberto da 2.1:** "O barbeiro recebe a notificação da nova marcação" → etapa das notificações.

**6.5 validada pelo Gabriel (2026-11-15).**

---

## 6.6 — Privacidade ✅ *(validada 2026-11-15)*

- **Página `/privacidade`** (`src/public/Privacidade.jsx`), com o layout público (logótipo, risca, rodapé). Já ligada no rodapé de todas as páginas, na página de entrada e no aviso do passo 4.
- No **passo 4** o link abre **noutro separador**, para o cliente não perder o que já escreveu.
- **O texto descreve o que o sistema faz de facto** (Arquitetura 3.7–3.9):

| Secção | Conteúdo |
|---|---|
| Quem é o responsável | Nome, NIF, morada, contacto → **marcadores (P-03)** |
| Que dados usamos | Nome, telemóvel, observações · dados da marcação · histórico (faltas, cancelamentos, notas) · IP e telemóvel **só cifrados e apagados em 24 h** · sem email, SMS, publicidade nem cookies de estatística |
| Para que os usamos | Gerir a marcação (RGPD art. 6.º, 1, b) · proteger o site contra abusos (interesse legítimo, art. 6.º, 1, f) · sem decisões automáticas |
| O que fica no seu telemóvel | "Lembrar neste dispositivo": nome, telemóvel e links **só no aparelho** · "Não sou eu / esquecer" apaga |
| Quem tem acesso | Só o barbeiro · subcontratantes **Supabase** (UE, Irlanda) e **Vercel** · Google Maps, Instagram e WhatsApp só se o cliente os abrir |
| Durante quanto tempo | Clientes inativos: **marcador do prazo (proposta 2 anos)** → nome, telemóvel e notas apagados, marcações anonimizadas · registos de segurança 24 h |
| Os seus direitos | Ver, corrigir, apagar, limitar, opor-se, cópia digital · resposta até 1 mês · reclamação à **CNPD** |
| Alterações | Nova versão publicada na página, com data |

**Marcadores por preencher antes do lançamento** (aparecem destacados a laranja na página): `[DATA]` · `[NOME DO RESPONSÁVEL]` · `[NIF]` · `[MORADA]` · `[EMAIL OU TELEFONE]` · `[PRAZO — proposta: 2 anos]`.

**Pendentes ligados a isto (antes do lançamento):**
- P-03: dados do responsável e prazo de conservação (Gabriel / barbeiro).
- **Anonimização automática** dos clientes inativos ao fim do prazo (a política promete-a; a Arquitetura já a previa "para quando o prazo estiver definido") → tarefa agendada a criar quando o prazo for decidido.
- **Revisão do texto** por quem acompanhe a parte legal do negócio: o texto segue o RGPD e o que o sistema faz, mas não substitui aconselhamento jurídico.

**Verificado (2026-11-15):** página no telemóvel sem deslocamento lateral, 6 marcadores visíveis, consola sem erros · a Vercel já reencaminha qualquer endereço para a app (`rewrites`), por isso `/privacidade` abre diretamente · build OK.

**6.6 validada pelo Gabriel (2026-11-15).**

---

## 6.7 — Testes e validação 🔶 *(feita em 2026-11-15; falta o teu teste no iPhone)*

### Teste de ponta a ponta (dados reais, browser em tamanho de telemóvel)
Entrada → "Marcar horário" → Barba → 23/11 → 10:00 → nome "TESTE-6.7 Ponta" + telemóvel → revisão (9 €) → **"Confirmar" com duplo clique** → ecrã de sucesso → `.ics` → voltar a `/marcar` → cartão "A sua próxima marcação" → passo 4 já preenchido → link pessoal → **cancelar** → verificado na base de dados.

### Matriz de critérios de aceitação
✅ verificado nesta etapa · ✅ (6.x) verificado na subetapa indicada · 📱 teste do Gabriel no iPhone · ⏳ fica para outra etapa

**2.1 — Marcação pelo cliente**
| Critério | Estado | Prova |
|---|---|---|
| Marcação completa sem conta, no telemóvel | ✅ | Ponta a ponta acima · 📱 falta no iPhone real |
| Nenhum preço antes da revisão | ✅ (6.1/6.2) | `public_services` sem preços; preço só no passo 5 |
| Habitual vê preço habitual, desconhecido vê visitante | ✅ (6.1) | T4 (11 € vs 9 €) |
| Só horários que cabem inteiros (almoço, fecho) e com 2 h de antecedência | ✅ (6.1/6.2) | Última da manhã 11:30 para 25 min com almoço às 12:00; `TOO_LATE` |
| Domingos, feriados e dias bloqueados não selecionáveis | ✅ (6.2) | Calendário com dias reais (domingo apagado) |
| Dois clientes ao mesmo tempo → só um fica, o outro volta à hora sem perder dados | ✅ (6.1 + 6.5) | 20 simultâneos → 1; ecrã volta à hora com nome/telemóvel |
| Número bloqueado não marca | ✅ (6.1 + 6.5) | `PHONE_BLOCKED` + mensagem |
| 3.ª marcação futura recusada | ✅ (6.1 + 6.5) | `LIMIT_REACHED` (também com 3 pedidos simultâneos) |
| Ecrã final com link pessoal e `.ics` válido | ✅ | Link mostrado; `.ics` `text/calendar`, UTC, lembrete 1 h, linhas dobradas |
| O barbeiro recebe a notificação | ⏳ | Etapa das notificações |
| A página pública nunca mostra dados de outros | ✅ | `quote_price` devolve só `ok,price_cents`; código alterado → `NOT_FOUND` |

**2.5 — Reservas simultâneas**
| Critério | Estado | Prova |
|---|---|---|
| Ver/escolher um horário não o tira aos outros | ✅ | Não há reservas temporárias: só `create_booking` ocupa |
| 2 pedidos simultâneos → 1 marcação | ✅ (6.1) | 20 simultâneos → 1 |
| Recusado volta à hora sem perder dados | ✅ (6.5) | |
| Duplo clique → 1 marcação | ✅ | Ponta a ponta: 2 cliques → **1 pedido**; servidor idempotente (6.1) |
| Bloqueio criado depois de ver os horários impede a confirmação | ✅ | Teste B → `SLOT_TAKEN` |
| Sobreposição manual do barbeiro nunca abre vaga no público | ✅ | Teste C: aviso, grava como intencional, sem vaga |
| Limite de 2 resiste a pedidos simultâneos | ✅ (6.1) | 3 simultâneos → 2 |

**2.6 — Alterar e cancelar** (parte que toca a área pública)
| Critério | Estado | Prova |
|---|---|---|
| Link pessoal sem editar, só cancelar dentro do prazo | ✅ (6.4) | |
| Depois de cancelar, "Marcar novo horário" | ✅ | Ponta a ponta |
| Barbeiro muda a hora: antiga livre, nova ocupada | ✅ | Teste A |
| Link mostra a nova hora e o prazo conta a partir dela | ✅ | Teste A: 09:00 → 11:00, cancelar até 09:00 |
| Mudar Habitual não altera marcações existentes | ✅ | Teste D: continua 9 € |
| Cada alteração no histórico | ✅ | Ponta a ponta: "cliente: criada → cancelada" |
| (restantes critérios da 2.6 são do painel) | ✅ (Etapa 5) | |

**2.10 — Lembrar no dispositivo**
| Critério | Estado | Prova |
|---|---|---|
| Número novo cria o cliente; existente liga à ficha certa; nome escrito não altera a ficha | ✅ (6.1) | T5, T10 |
| Nunca mostra o nome/dados de outra pessoa pelo número | ✅ | Teste E |
| Com "Lembrar", nome e telemóvel preenchidos na visita seguinte | ✅ | Ponta a ponta |
| "As suas próximas marcações" com acesso ao cancelamento | ✅ | Ponta a ponta: cartão → link → cancelar |
| "Não sou eu / esquecer" apaga | ✅ (6.3) | |
| Noutro dispositivo, campos vazios | ✅ | Armazenamento vazio/bloqueado → campos vazios |
| Sem SMS | ✅ | Não existe nenhum envio |

**3.6 / 3.7 / 3.9 — Técnicos**
| Critério | Estado | Prova |
|---|---|---|
| Base de dados sem códigos em claro | ✅ | Ponta a ponta: só o hash |
| Com o armazenamento bloqueado, marca-se na mesma | ✅ | Marcação real feita com o armazenamento bloqueado (ver correção abaixo) |
| Público sem acesso a tabelas | ✅ | 16/16 tabelas → 401 |
| Público só executa as funções públicas | ✅ | Exatamente as 8 |
| RLS em todas as tabelas · funções privilegiadas com `search_path` fixo | ✅ | 16/16 · 0 sem `search_path` |
| Registos de contas desligados | ✅ | `disable_signup = true` |
| Limite de pedidos | ✅ (6.1) | 5/h IP, 3/h telemóvel, 30/h preço |
| Advisors de segurança da Supabase | 📱 | O conector não vê esta conta: ver no painel da Supabase (Advisors → Security) |

Também: lint OK · build OK · `npm audit` (produção) **0 vulnerabilidades**.

### Correções feitas na 6.7
1. **Cliente Supabase próprio da área pública** (`src/lib/supabasePublico.js`, sem sessão nem armazenamento). Ao simular o armazenamento bloqueado a meio da visita, os pedidos falhavam porque o cliente do painel lê a sessão do navegador antes de cada pedido. Num bloqueio real (desde o início) a biblioteca já usa memória, mas assim a área pública deixa de depender da sessão do painel para tudo.
2. **"Também fica guardado neste dispositivo"** só aparece quando a gravação resulta mesmo (com o armazenamento bloqueado já não aparece).

### 📱 Teste do Gabriel no iPhone (e noutro telemóvel)
Em `https://mrpolobarber.vercel.app` **depois do push**:
1. Página de entrada: foto, título, botões **Como chegar** (abre o Maps) e **Instagram** (abre @mathybarber).
2. Marcar um horário até ao fim; no ecrã final, **Adicionar ao calendário** → deve abrir o Calendário do iPhone com o evento e o alerta 1 h antes.
3. Copiar o link pessoal e abri-lo; **cancelar**.
4. Voltar a `/marcar`: cartão "A sua próxima marcação" (com "Cancelada") e dados preenchidos no passo 4.
5. "Não sou eu / esquecer" → campos vazios.
6. No painel: a marcação aparece como **Online**, cancelada **pelo cliente**.
7. Repetir 2–4 noutro telemóvel (Android ou outro navegador).
8. Painel da Supabase → **Advisors → Security**: sem avisos novos.

### Dados de teste criados nesta etapa
2 marcações online (23/11 10:00 "TESTE-6.7 Ponta", já cancelada; 24/11 10:30 "TESTE-6.7 Sem memoria") e os 2 clientes respetivos (+351933670001, +351933670002). A limpeza só corre com o OK do Gabriel.
**Limpeza (2026-11-15, com o OK do Gabriel):** as 2 marcações e os 2 clientes "TESTE-6.7", e os contadores de pedidos, foram apagados. Confirmado: 0 dados de teste da 6.7, proteções contra apagar religadas. Ficam as 3 marcações de teste do Gabriel (para a limpeza antes do lançamento).
