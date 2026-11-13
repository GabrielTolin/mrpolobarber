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

## 6.1 — Funções públicas (backend) 🔶 *(aplicada e testada em 2026-11-13; à espera da tua validação)*

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
