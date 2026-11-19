# MR Polo Barber — Lançamento

**Etapa 8 — Lançamento do piloto com o Matheus** · Proposta de 2026-11-15 (por validar)

O sistema está feito (painel, área pública, notificações). Esta etapa põe-no **nas mãos do Matheus e dos clientes reais**, com os dados certos, sem restos de testes e com segurança.

**Antes de começar:** fechar a Etapa 7 com os 2 testes reais de segunda de manhã (resumo do dia às 08:00 e lembrete de 5 min) — ver [NOTIFICACOES.md](NOTIFICACOES.md) §7.6.

## O que falta (juntado de todas as etapas)

| Pendente | De onde vem | Quem dá a informação |
|---|---|---|
| Morada escrita, WhatsApp do barbeiro, nome da barbearia ("Mr. Polo Barber Shop") | P-02 | Gabriel / Matheus |
| Horário de sábado (hoje 09:00–13:00) · Carnaval (P-05) · preços de visitante (P-01) | Etapa 1, 6 | Matheus |
| Responsável RGPD (nome, NIF, morada, contacto) e prazo de conservação | P-03 | Gabriel / Matheus |
| Anonimização automática dos clientes inativos (a política de privacidade promete-a) | 6.6 | — |
| Conta do Matheus como administrador, no lugar da conta de teste do Gabriel | G-3 | Gabriel cria a conta |
| Procedimento escrito para repor a palavra-passe (`docs/OPERACAO.md`, prometido na 3.9) | 3.9 | — |
| Apagar as marcações, clientes e notificações de teste | 6, 7 | — |
| ~~Foto principal em maior resolução~~ ✅ 2026-11-19: `public/hero-matheus.webp` (896×1200, foto dada pelo Gabriel; substitui `hero-barbeiro.webp`) | 6.0 | Gabriel |

## Subetapas propostas

| # | Subetapa | O que inclui |
|---|---|---|
| 8.0 | **Dados da barbearia** | Nome, morada, WhatsApp (nas Configurações → aparecem no site, no WhatsApp do ecrã final e no link pessoal) · confirmar sábado, Carnaval e preços de visitante |
| 8.1 | **RGPD** | Preencher a política de privacidade (responsável, NIF, morada, contacto, prazo, data) · **anonimização automática** dos clientes inativos ao fim do prazo (tarefa agendada, testada) |
| 8.2 | **Conta do Matheus** | O Gabriel cria a conta dele na Supabase (email confirmado) · eu troco o administrador (SQL mostrado antes) · tirar os aparelhos de push do Gabriel (para não receber as notificações do Matheus) · `docs/OPERACAO.md` (repor palavra-passe, trocar administrador, o que fazer se algo falhar) |
| 8.3 | **Limpeza dos dados de teste** | **Cópia de segurança primeiro** · apagar marcações, clientes, histórico e notificações de teste · manter configurações, serviços, horários e feriados · verificação |
| 8.4 | **Instalação no iPhone do Matheus** | Instalar no ecrã principal · entrar · ativar notificações · notificação de teste · mostrar o essencial do painel (marcar, bloquear, faltas, notificações) |
| 8.5 | **Divulgação aos clientes** | Link e **QR** (já existem em Configurações) · mensagem pronta para o WhatsApp e para a bio do Instagram · sugestão para o salão (QR impresso) |
| 8.6 | **Verificação final e arranque** | Lista de verificação (Advisors da Supabase, segurança, push, cópias de segurança) · primeira semana: acompanhar as marcações e os registos da função de envio · como reportar problemas |

---

## Antes da 8.0 — Visitante × habitual (P-01) 🔶 *(2026-11-15)*

Decisão do Gabriel registada na [Especificação 2.7](ESPECIFICACAO.md) ("Alteração de 2026-11-15").

| Peça | Ficheiro | Estado |
|---|---|---|
| Função `check_regular` + `quote_price` devolve `regular` | migration `20261115190000_check_regular.sql` | ✅ aplicada 2026-11-15 (OK do Gabriel) |
| Janela "Visitante / 1.ª vez" · "Tenho cadastro" | `src/public/ui/EscolhaCliente.jsx` (aberta por `Inicio.jsx`) | ✅ |
| Telemóvel fixo no passo 4 (cadastro) · número sugerido (não encontrado) · "Preço de cliente habitual / de visitante" na revisão | `src/public/Marcar.jsx` | ✅ |

**Testado no browser (respostas simuladas da função nova):** janela abre ao carregar em "Marcar horário" · cadastro habitual → número fixo, 9 €, "Preço de cliente habitual" · número não registado → aviso → continuar como visitante com o número preenchido, 11 €, "Preço de visitante" · visitante → 11 € · habitual que escolhe visitante → 9 € habitual · build OK.

**Teste no servidor (desfeito no fim):** `check_regular` → habitual `true` · visitante registado `false` · desconhecido `false` · bloqueado `false` · inválido `INVALID_PHONE` · `quote_price` habitual 9 € `regular=true` / visitante 11 € `regular=false` · o público passa a ter 9 funções (+ `check_regular`).

**Falta:** **preços de visitante dos 5 serviços** (o Matheus define; podem ser postos em Serviços e preços ou eu gravo-os) · o barbeiro ligar "Habitual" nas fichas dos clientes habituais.
- **Decisão (2026-11-15):** os **preços de visitante** são postos pelo **Matheus** no painel (Serviços e preços → cada serviço → "Preço visitante"), assim como o interruptor **"Habitual"** nas fichas dos clientes habituais.

---

## Cortes clicáveis na marcação ✅ *(2026-11-19)*

Foi um pedido do Gabriel. No passo 4 ("Os seus dados"), por cima das Observações, aparece **"Que corte quer? (opcional)"** com 20 cartões:
Buzz Cut, Low Fade, Mid Fade, High Fade, Skin Fade, Taper Fade, Low Taper, Mid Taper, Burst Fade, Drop Fade, French Crop, Textured Crop, Mullet, Burst Mullet, Modern Mullet, Edgar Cut, Fluffy Hair, Slick Back, Side Part, Pompadour.

- **Como funciona:** um toque escolhe o corte e outro toque tira-o. Podem escolher-se **até 3**; os outros cartões ficam apagados. Se não escolher nenhum, a marcação segue normal.
- **O que o barbeiro recebe:** os cortes juntam-se às observações numa só nota (`client_notes`), por exemplo "Corte: Mid Fade, French Crop · é para o meu filho". A nota aparece na revisão (passo 5) e no detalhe da marcação no painel. A notificação push de marcação nova não mostra as observações.
- **Limite:** o máximo de 200 caracteres conta com a nota toda. A base de dados não mudou.
- **Onde está no código:** `src/public/Marcar.jsx` (`CORTES`, `MAX_CORTES`, `notaFinal`).
- **Verificado no browser, a 375 px, até ao passo 5 (sem confirmar a marcação):**
  - escolher e tirar funcionam;
  - com 3 escolhidos, os outros 17 ficam desligados;
  - a revisão mostra a nota junta;
  - nada sai do ecrã;
  - o build está OK.

---

## 8.3 — Limpeza dos dados de teste ✅ *(2026-11-19)*

- **Cópia de segurança antes de mexer:** um JSON por tabela e a lista de contas, em `Desktop\mrpolobarber-backups\2026-11-19_antes-limpeza-8.3\`, fora do repositório.
- **Apagado:** tudo era do Gabriel. O SQL foi mostrado antes e o Gabriel deu o OK. Foi tudo num só passo, com uma verificação no fim que desfazia tudo se algo falhasse:
  - 5 marcações, com os 5 serviços e os 12 registos do histórico;
  - 1 cliente;
  - 9 notificações;
  - 10 registos anti-abuso;
  - as contas `gabrieltolin@…` e `tolinsgabriel@…`.
- **As proteções do histórico** (`appointment_events_append_only` e `appointments_no_delete`) só estiveram desligadas dentro dessa transação.
- **Verificado depois:**
  - marcações, histórico, clientes e notificações a 0;
  - só existe a conta `mathybarber01@gmail.com`, que é a administradora;
  - as proteções estão ligadas;
  - mantiveram-se os 5 serviços, os 75 feriados, os 7 dias de horário e as configurações ("Mr. Polo Barber Shop").

---

## 8.2 — Conta do Matheus ✅ *(2026-11-19)*

- **Conta do Matheus:** o Gabriel criou-a no painel da Supabase (`mathybarber01@gmail.com`, email confirmado). A palavra-passe não está registada em lado nenhum do projeto.
- **Troca do administrador:** feita num só passo, com o SQL mostrado antes e o OK do Gabriel. Saiu o Gabriel e entrou o Matheus; foram apagados os 2 aparelhos de push do Gabriel.
- **Verificação:** fica 1 administrador (`mathybarber01@gmail.com`) e 0 aparelhos de push.
- **Guia de operação:** [OPERACAO.md](OPERACAO.md) explica como repor a palavra-passe, trocar o administrador, o que fazer se algo falhar e quais são as tarefas automáticas.
- **Contas do Gabriel:** apagadas na 8.3, depois da limpeza dos dados de teste.

---

## 8.0 — Dados da barbearia 🔶 *(nome, morada e WhatsApp gravados a 2026-11-19)*

**2026-11-19.** O Gabriel deu os dados e pediu para os gravar. Ficou feito o seguinte:
- **Gravado em `settings`:**
  - nome: "Mr. Polo Barber Shop";
  - morada: "R. Vasco da Gama, Edifício Calipto, Loja 1D, 8200-294 Albufeira";
  - WhatsApp: +351 932 798 223.
- **Link do mapa:** confirmado; aponta para "Mr.Polo Barbershop" na mesma rua. No Google a loja aparece como "Loja 1 C", mas a certa é a **1D**: confirmado pelo Gabriel a 2026-11-19. Fica gravada a 1D.
- **Instagram:** `@mathybarber` já estava certo, fixo em `Inicio.jsx`.
- **Página inicial:** os atalhos do topo passaram a ser **Mapa · Instagram · WhatsApp**, em três colunas. Antes só lá estavam o Mapa e o Instagram; o bloco "Onde estamos" já tinha os três.
- **Resto das páginas:** o marcar, o ecrã final, o link pessoal, o "não encontrado" e a privacidade já liam os dados das Configurações e ficaram completos sem mexer no código.
- **Nome antigo trocado onde estava escrito à mão:**
  - título e descrição da página;
  - nome da app instalada ("Mr. Polo Barber Shop — Painel" e, no ícone, "Mr. Polo");
  - título por omissão das notificações e o nome por omissão no ecrã final;
  - texto de ajuda das notificações bloqueadas.
- **Verificação:**
  - no browser, a 375 px: links certos e sem nada a sair do ecrã;
  - a `/privacidade` ficou sem marcadores;
  - o build está OK.

Tudo isto se faz em **Configurações → Barbearia** (e Horários), sem programação:
| O quê | Onde | Estado |
|---|---|---|
| Nome: **Mr. Polo Barber Shop** | Configurações → Barbearia | ✅ 2026-11-19 |
| Morada escrita | Configurações → Barbearia | ✅ 2026-11-19 (Loja 1D confirmada) |
| WhatsApp do barbeiro (faz aparecer os botões "Falar com o barbeiro") | Configurações → Barbearia | ✅ 2026-11-19 |
| Link do mapa | Configurações → Barbearia | ✅ (gravado a 2026-11-15) |
| Sábado (hoje 09:00–13:00) e Carnaval | Horários | ⏳ confirmar |
| Preços de visitante · clientes "Habitual" | Serviços e preços · Clientes | ⏳ (Matheus) |

---

## 8.1 — RGPD ✅ *(anonimização 2026-11-15; política simplificada 2026-11-16 — completa-se com a 8.0)*

**Prazo de conservação: 2 anos sem marcações** (decisão do Gabriel, 2026-11-15).

Migration `20261115200000_anonymize_inactive.sql` (SQL mostrado e aprovado antes):
- `clients.anonymized_at` · regra `clients_check` passa a aceitar cliente online sem telemóvel **se anonimizado**.
- `anonymize_inactive_clients()` — **tarefa diária às 03:30**: clientes criados há mais de 2 anos e **sem marcações nos últimos 2 anos (nem futuras)** → ficha: "Cliente anonimizado", sem telemóvel, notas, habitual e bloqueio · marcações: nome "Cliente anonimizado", sem observações · histórico: apaga valores antigos/novos de nome e observações e as notas internas · junta a nota "Dados do cliente anonimizados (RGPD)". As marcações ficam para estatística.
- Proteções mantidas: `appointments_guard` e o novo `appointment_events_guard` só deixam passar a anonimização (`app.anonimizar = on`) e **só nesses campos**; apagar histórico continua proibido.

**Testes (desfeitos no fim):** ✅ cliente antigo anonimizado na ficha, marcação e histórico — o nome e as observações **não ficam em lado nenhum** · ✅ cliente com marcação há 1 ano intacto · ✅ 2.ª volta = 0 · ✅ anonimização a tentar mudar o preço → recusada · ✅ editar/apagar histórico fora da anonimização → recusado · ✅ cron `30 3 * * *` · ✅ bateria da 7.1 repetida sem diferenças (sem regressões).

**Política de privacidade:** o prazo passou a "**2 anos**" (marcador retirado).

**Simplificação (decisão do Gabriel, 2026-11-16):** a política deixa de ter dados escritos à mão. Em "Quem é o responsável", `/privacidade` lê das **Configurações → Barbearia** (`public_info`):
- o nome do negócio, que é o responsável;
- a morada;
- o WhatsApp, que é o contacto, mais "pessoalmente na barbearia".

**Tirados:** o NIF (não é obrigatório na informação ao cliente) e o marcador da data (data da política: **16 de novembro de 2026**).

Enquanto a morada ou o WhatsApp estiverem vazios no painel, aparece o marcador "[MORADA / WHATSAPP (Configurações → Barbearia)]". Foi verificado no browser com os dados reais: hoje mostra os dois marcadores e o nome "MR Polo Barber". O build está OK.

**Falta:** só a **8.0**. Quando o nome ("Mr. Polo Barber Shop"), a morada e o WhatsApp estiverem gravados no painel, a política fica completa sem mais alterações. Se a barbearia for uma empresa, o "Nome" nas Configurações deve ser o nome da empresa (ou é preciso acrescentá-lo à política). Antes do lançamento, convém alguém do negócio rever o texto.
