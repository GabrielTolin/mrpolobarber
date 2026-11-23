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

## Ajustes de 2026-11-23 (2.ª parte) ✅

**Regra do Gabriel:** tudo o que muda tem de chegar aos clientes **sem apagarem e voltarem a instalar o ícone**. Só o administrador pode reinstalar.

- **Contador nos Clientes:** "N clientes · M habituais", com os habituais em dourado (`pages/Clientes.jsx`).
- **Antecedência mínima de 30 min:** `min_notice_minutes = 30`, aplicado no servidor com o OK do Gabriel. Antes era 60, valor que o Matheus tinha posto. O cancelamento continua até 2 h antes.
- **Botão "Sou cliente" no login:** feito e **retirado** a pedido do Gabriel. O acesso ao login já tinha sido corrigido no commit `5c1a68f`.

### Lembrete aos clientes no dia da marcação ✅ *(decisão: uma notificação às 08:00)*

Migration `20261123120000_client_reminders.sql` e Edge Function `send-push`, aplicadas e publicadas com o OK do Gabriel.

| Peça | O que faz |
|---|---|
| `client_push_subscriptions` | Aparelhos dos clientes, ligados à **ficha** (cliente). Só o servidor lê. No máximo 5 por cliente |
| `client_push_messages` | Uma mensagem por marcação e tipo. Cada mensagem nova chama a `send-push` com `{ client_message_id }` |
| `subscribe_client_push(código, …)` / `unsubscribe_client_push(endpoint)` | Públicas, com limite de pedidos. O código da marcação prova quem é |
| `send_client_reminders()` | No tick de cada minuto, entre as 08:00 e as 08:10: marcações **confirmadas de hoje** de clientes com aparelho → "Hoje às 15:00: Cabelo e barba na Mr. Polo Barber Shop. Até já!". Não repete. Apaga as mensagens com mais de 30 dias e os aparelhos de clientes anonimizados |
| `settings.client_reminder_enabled` | Interruptor no painel: Configurações → Notificações → "Lembrete aos clientes às 08:00" |
| `src/public/ui/AtivarLembretes.jsx` | Cartão **"Lembrete no dia da marcação → Ativar lembrete"** no ecrã final e no link pessoal. No iPhone fora do ecrã principal, explica como instalar. Tem "Desativar" |
| Política de privacidade | Parágrafo sobre o endereço de notificações |

- **Para quem vale:** o aparelho fica ligado à ficha, por isso o cliente recebe o lembrete de **todas** as marcações, incluindo as feitas pelo barbeiro e as semanais. Marcações feitas no próprio dia depois das 08:00 não têm lembrete.
- **Testes no servidor** (desfeitos; as marcações de teste ficaram por cima das reais, como sobreposição intencional, e nada ficou gravado):
  1. Código errado → `NOT_FOUND`; endpoint sem https → `INVALID_REQUEST`; ativar → ok, e ativar de novo também.
  2. Às 07:59 → 0; às 08:05 → **2** (marcação online e marcação do barbeiro do mesmo cliente); repetir → 0; às 09:00 → 0.
  3. Um cliente sem aparelho não recebe mensagem.
  4. Uma marcação cancelada não recebe; com o interruptor desligado → 0.
  5. Desativar → ok.
  6. O anónimo só executa ativar e desativar; não lê as tabelas nem chama o envio. O cron está atualizado.
- **Falta testar num telemóvel real:** ativar a partir de uma marcação e receber às 08:00 do dia.

### Pedido de avaliação no Google ⏸️ *(começado a 2026-11-23; continua no dia seguinte)*

O Gabriel escolheu os **três caminhos**:
1. **push 2 h depois** de uma marcação concluída;
2. **cartão "Como foi o seu corte?"** da próxima vez que o cliente abrir a app;
3. **botão "Pedir avaliação"** por WhatsApp no painel;

e um link no rodapé. **Regra:** um pedido por cliente, no máximo outro passados 6 meses. Faltas e canceladas nunca recebem.

- **Falta o link certo.** O que foi enviado (`maps.app.goo.gl/X5CUF7…`) abre a **página** da barbearia no Maps, não o formulário. O link certo obtém-se no Perfil da Empresa → "Pedir avaliações" (`https://g.page/r/…/review`) e o link fica num campo novo nas Configurações → Barbearia.
- **Trabalho já escrito, guardado fora do repositório**, em `Desktop\mrpolobarber-backups\2026-11-23_avaliacoes-por-acabar\`:
  - `20261123140000_review_requests.sql` (não aplicada): `settings.review_url`, `clients.review_requested_at`, `send_review_requests()` no tick, `review_check(códigos)` e `public_info` com `review_url`;
  - `avaliacoes.patch`: memória do telemóvel (`mpb.para-avaliar`), `verificarAvaliacao`, o campo nas Configurações, os dados do painel e o service worker a abrir links de outros sites.
- **Ainda por escrever:** o cartão na página inicial, o botão no detalhe da marcação, o link no rodapé, os testes e a política de privacidade.

---

## Ajustes antes da 8.4 ✅ *(2026-11-23, pedido do Gabriel)*

**Regras** (migration `20261123100000_agenda_1_ano_4_marcacoes.sql`, aplicada com o OK do Gabriel):
- **A agenda pública abre 1 ano à frente:** `max_days_ahead` passou de 30 para **365**. O máximo permitido passou de 180 para 366, na base de dados e nas Configurações.
- **Até 4 marcações futuras por telemóvel:** `max_active_per_phone` passou de 2 para **4**, para o cliente poder marcar também para o filho no próprio nome. As marcações semanais continuam a não contar.
- **Verificado:**
  - no servidor, há vagas até daqui a 365 dias e nenhuma depois;
  - no calendário público, avança mês a mês de novembro de 2026 a **novembro de 2027** e para aí.
- **Textos:** os que diziam "30 dias" ou "2 marcações" foram tirados, porque agora são números configuráveis.

**Instalar a página pública abria o painel.** Havia um só manifesto, com `start_url: /admin`, e um cliente que adicionasse a página pública ao ecrã principal ficava com o painel. Agora há dois:

| Página | Manifesto | Abre em |
|---|---|---|
| `index.html` (/, /marcar, /m/…, /privacidade) | `public/manifest-publico.webmanifest`: "Mr. Polo Barber Shop", id `/` | `/` |
| `admin.html` (/admin…) | `public/manifest-painel.webmanifest`: "Mr. Polo Barber Shop — Painel", id `/admin` | `/admin` |

- **Vite:** `manifest: false` no plugin do PWA e duas páginas de entrada (`index.html` e `admin.html`, com o mesmo código da app).
- **Vercel:** `/admin` e `/admin/…` são servidos pelo `admin.html`, e o resto pelo `index.html`.
- **Service worker:** nas navegações para `/admin…` devolve o `admin.html`, e nas outras o `index.html`.
- **Verificado com a versão de produção local** (`npm run preview`, com o service worker ativo):
  - `/` e `/marcar` usam o manifesto público;
  - `/admin` e `/admin/agenda` usam o manifesto do painel;
  - o build está OK.
- **Quem já instalou a página pública antes desta correção** fica com o ícone antigo, que abre o painel. É preciso **apagar o ícone e voltar a adicioná-lo**. O Matheus ainda não instalou, por isso não é afetado.

---

## 8.4 — Instalação no iPhone do Matheus ✅ *(feita a 2026-11-19; verificada no servidor a 2026-11-23)*

**Verificado no servidor (2026-11-23):**
- 1 aparelho registado: conta `mathybarber01@gmail.com`, iPhone com iOS 18.7, a 19/11 às 16:16.
- 2 notificações de teste, enviadas em 1 segundo (19/11, 16:16 e 16:19).
- Dados que o Matheus já pôs no painel:
  - **36 clientes habituais**;
  - **preços de visitante** (Cabelo e barba 20/23 €, Máquina 17/20 €, Barba 9/10 €; Tesoura e Criança iguais);
  - um serviço novo, **"Raspar + barba"** (15/18 €).
- **Produção depois do push de 2026-11-23:** `/` e `/marcar` usam o manifesto público; `/admin` e `/admin/agenda` usam o do painel.
- **O ícone do Matheus** foi instalado a partir do `/admin` antes da correção dos manifestos e abre no painel, como deve.

**O guia usado:**

**Antes:** o iPhone tem de estar com iOS **16.4 ou mais recente** (Definições → Geral → Informações), senão não há notificações. O site em produção já tem a versão final: foto nova e ícone "Mr. Polo" (verificado a 2026-11-19).

**1. Instalar (no Safari, não no Chrome)**
1. Abrir **https://mrpolobarber.vercel.app/admin** no Safari.
2. Tocar em **Partilhar** (quadrado com seta) → **Adicionar ao ecrã principal** → o nome aparece "Mr. Polo" → **Adicionar**.
3. Fechar o Safari e abrir **pelo ícone** no ecrã principal. A partir daqui, usa-se sempre o ícone.

**2. Entrar e proteger a conta**
1. Entrar com `mathybarber01@gmail.com` e a palavra-passe.
2. **Configurações → Conta → Mudar palavra-passe**, para uma que só o Matheus saiba (a atual ficou escrita no chat).

**3. Notificações**
1. **Configurações → Notificações neste dispositivo → Ativar notificações** → **Permitir**.
2. **Enviar notificação de teste**: tem de chegar em segundos, mesmo com a app fechada.
3. Se não chegar: Definições do iPhone → Notificações → **Mr. Polo** → Permitir notificações.

**4. Dados que só o Matheus sabe (pendentes da 8.0)**
- **Serviços e preços:** o **preço de visitante** de cada serviço. Hoje está igual ao de habitual.
- **Clientes:** ligar **"Habitual"** nos clientes da casa, com o telemóvel certo. Só esses pagam o preço de habitual e podem pedir a marcação semanal.
- **Horários:** confirmar o sábado e o Carnaval.

**5. Mostrar o essencial (10 minutos)**

| No painel | O quê |
|---|---|
| Início | Marcações de hoje, próxima marcação, **pedidos de marcação semanal** (Aprovar/Recusar), pendências |
| Agenda | **+ Nova marcação** (WhatsApp, telefone, presencial) · tocar numa marcação → editar, cancelar, **registar falta** (só depois de 10 min), avisar por WhatsApp · 🔁 = semanal |
| Horários e bloqueios | Folgas e férias: bloquear antes de faltar, para ninguém marcar |
| Clientes | Ficha: Habitual, bloquear online, notas internas, **marcação semanal** (criar/parar) |
| Notificações | Marcações novas, cancelamentos, resumo das 08:00, lembretes 5 min antes |

**6. Verificação (Claude, no servidor)**
- 1 aparelho registado em `push_subscriptions`.
- A notificação de teste foi criada e enviada (`push_sent_at` preenchido).

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
