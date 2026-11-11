# MR Polo Barber — Especificação Funcional

**Etapa 2 — Definição funcional** · **Validada** a 2026-11-10

Descreve **como** o sistema se comporta para cumprir o [Documento de Requisitos](REQUISITOS.md) (Etapa 1, v1.2 validada). Em caso de dúvida, os requisitos prevalecem, e qualquer mudança é registada nos dois documentos.

| Subetapa | Tema | Estado |
|---|---|---|
| 2.1 | Fluxo completo do cliente | ✅ Fechado |
| 2.2 | Fluxo do painel administrativo | ✅ Fechado |
| 2.3 | Estados e ciclo de vida das marcações | ✅ Fechado |
| 2.4 | Regras de disponibilidade e cálculo de horários | ✅ Fechado |
| 2.5 | Conflitos e reservas simultâneas | ✅ Fechado |
| 2.6 | Alterações e cancelamentos | ✅ Fechado |
| 2.7 | Categorias de clientes e preços | ✅ Fechado |
| 2.8 | Dashboard e navegação | ✅ Fechado |
| 2.9 | Notificações e pendências | ✅ Fechado |
| 2.10 | Gestão de clientes | ✅ Fechado |
| 2.11 | Serviços e preços | ✅ Fechado |
| 2.12 | Horários, pausas e folgas | ✅ Fechado |
| 2.13 | Configurações gerais da barbearia | ✅ Fechado |
| 2.14 | Segurança e acesso administrativo | ✅ Fechado |
| 2.15 | Revisão final e validação funcional | ✅ Validado |

---

## 2.1 — Fluxo completo do cliente ✅

### Fluxo principal

| # | Passo | Comportamento |
|---|---|---|
| 1 | Abre o link | `mrpolobarber.vercel.app`. Cabeçalho com nome, morada e horário da barbearia. Se houver, mostra "As suas próximas marcações" deste dispositivo (2.10) |
| 2 | Escolhe o serviço | Lista com nome, descrição e duração. **Sem preço** |
| 3 | Escolhe a data | Calendário até 30 dias. Domingos, feriados, dias bloqueados e dias sem vagas aparecem desativados |
| 4 | Escolhe o horário | Só horários onde o serviço cabe inteiro, de 15 em 15 min **+ encaixe** (2.4), respeitando a antecedência mínima (2 h). Permite voltar e mudar de dia |
| 5 | Preenche os dados | Nome, telemóvel (+351 por defeito), observações opcionais, "Lembrar neste dispositivo" (2.10), aviso de privacidade com link. Se lembrados, aparecem preenchidos |
| 6 | Revê a marcação | Serviço, data, hora, duração e **preço calculado pelo telemóvel** (habitual se registado pelo barbeiro, senão visitante) |
| 7 | Confirma | A marcação é gravada como **Confirmada**, sem aprovação do barbeiro |
| 8 | Ecrã de sucesso | Resumo + **link pessoal** (botão copiar) + **"Adicionar ao calendário"** (.ics) + contacto WhatsApp |
| 9 | Barbeiro notificado | Push + pendência no painel. Aviso ⚠️ se o cliente estiver sinalizado por faltas |

### Decisões

- **Confirmação automática:** a marcação fica confirmada logo, sem aprovação do barbeiro. A disponibilidade é garantida pela base de dados (RN-01).
- **Categoria não é escolhida pelo cliente:** é automática pelo telemóvel (RN-04).
- **Preço só no passo 6**, depois do telemóvel.
- **Proteção contra marcações falsas:**
  - no máximo **2 marcações futuras ativas por telemóvel** (configurável no painel);
  - proteção anti-bot invisível no formulário (ex.: campo armadilha e limite de pedidos).

### Casos excecionais

| Situação | Comportamento |
|---|---|
| Horário ocupado por outro cliente entre o passo 4 e o 7 | "Esse horário acabou de ser ocupado, escolha outro." Volta ao passo 4 e **mantém os dados preenchidos** |
| A antecedência mínima passou enquanto escolhia | Igual ao anterior |
| Telemóvel bloqueado pelo barbeiro | No passo 6: "Não é possível marcar online. Contacte o barbeiro" + botão WhatsApp. Não grava |
| Telemóvel já com 2 marcações futuras ativas | No passo 6: "Já tem 2 marcações agendadas. Para mais, contacte o barbeiro" + botão WhatsApp. Não grava |
| Sem vagas nos próximos 30 dias | Mensagem + botão WhatsApp |
| Telemóvel inválido | Erro no campo, não avança |

### Critérios de aceitação

- [ ] Um cliente sem conta completa uma marcação do passo 1 ao 8 no telemóvel.
- [ ] Nenhum preço aparece antes do passo 6.
- [ ] Um número registado como habitual vê o preço habitual; um número desconhecido vê o preço visitante.
- [ ] Só aparecem horários onde o serviço cabe inteiro (não atravessa o almoço nem o fecho) e com pelo menos 2 h de antecedência.
- [ ] Domingos, feriados e dias bloqueados não são selecionáveis.
- [ ] Dois clientes a confirmar o mesmo horário em simultâneo: só um fica com ele, e o outro recebe a mensagem e volta ao passo 4 sem perder dados.
- [ ] Um número bloqueado não consegue marcar.
- [ ] Um número com 2 marcações futuras ativas não consegue fazer uma 3.ª.
- [ ] O ecrã final mostra o link pessoal e gera um .ics válido.
- [ ] O barbeiro recebe a notificação da nova marcação.
- [ ] A página pública nunca mostra dados de outros clientes.

---

## 2.2 — Fluxo do painel administrativo ✅

Decisões desta subetapa que alteraram a Etapa 1 (registadas no REQUISITOS.md v1.1): **sobreposições manuais com aviso** (RN-01/RN-07) e **avanço automático de estados** (RN-09). O cancelamento pelo cliente **mantém-se** como validado (link pessoal, até 2 h antes).

### Acesso
- Endereço: `mrpolobarber.vercel.app/admin`, também instalável como PWA.
- Login com email + palavra-passe (Supabase Auth). **Sem registo público**: a conta do barbeiro é criada pelo Gabriel.
- A sessão mantém-se ativa (refresh automático) até ele terminar sessão.
- **Recuperar palavra-passe (piloto):** o Gabriel repõe-na pelo painel da Supabase. O "Esqueci-me" com email próprio (SMTP/Resend) fica para mais tarde.
- Qualquer rota `/admin/*` sem sessão redireciona para o login.

### Áreas e rotas

| Área | Rota | O que permite |
|---|---|---|
| Dashboard | `/admin` | Marcações de hoje, próxima marcação, pendências, cancelamentos recentes, total do dia, acesso rápido à agenda, não lidas |
| Agenda | `/admin/agenda` | Vista diária (principal no telemóvel) e semanal. Livres/ocupados, detalhe da marcação (cliente, serviço, preço), criar, editar, cancelar, registar falta, avisar por WhatsApp |
| Clientes | `/admin/clientes` | Lista e pesquisa (nome/telemóvel), criar, editar. Ficha: nome, telemóvel, **Habitual (sim/não)**, bloqueado online, observações internas, histórico, faltas e cancelamentos tardios |
| Serviços e preços | `/admin/servicos` | Criar, editar, desativar. Preço habitual, preço visitante, duração. Alterações não mexem em marcações existentes |
| Horários e bloqueios | `/admin/horarios` | Horário semanal, **horário excecional de um dia**, bloqueios (horas/dia/vários dias: férias, folgas), feriados |
| Notificações | `/admin/notificacoes` | Lista, marcar como lida (uma ou todas), contador de não lidas |
| Configurações | `/admin/configuracoes` | Regras de marcação (secção 6 dos requisitos), limite por telemóvel, tolerância, faltas para sinalizar, notificações |

A forma da navegação no telemóvel (barra inferior, menu) fica para a **2.8**.

### Nova marcação manual
1. "Nova marcação" (na agenda, ou ao tocar num horário livre, que já preenche a data e a hora).
2. Escolhe um cliente existente (pesquisa) ou cria um novo (só o nome é obrigatório).
3. Confirma ou ajusta o interruptor **Habitual** do cliente, que define o preço.
4. Escolhe o serviço. O preço é sugerido e pode ser ajustado.
5. Escolhe a data e a hora (qualquer hora, sem as restrições públicas).
6. Escolhe a origem (WhatsApp / Telefone / Presencial).
7. Guardar → o sistema valida e mostra os **avisos** aplicáveis:
   - "Fora do horário de funcionamento. Guardar mesmo assim?"
   - "Conflito com: 10:00 João Silva — Corte. Guardar mesmo assim?"
8. Ao confirmar, a marcação entra na agenda como **Confirmada** e não gera notificação. Se tiver sobreposição, fica marcada como **sobreposição intencional** e aparece destacada na agenda.

### Estados automáticos
- Confirmada → **Em andamento** (na hora de início) → **Concluída** (na hora de fim), **sem ação do barbeiro**.
- **Falta:** só pelo barbeiro, manualmente, **durante o horário da marcação** (da hora de início + tolerância de 10 min até à hora de fim). É o que entra no registo de faltas do cliente. Prazo fechado na **2.3**.

### Critérios de aceitação
- [ ] Sem sessão, qualquer `/admin/*` leva ao login. Não existe página de registo.
- [ ] Depois do login, o barbeiro cai no dashboard e a sessão persiste ao fechar e reabrir o PWA.
- [ ] O barbeiro cria uma marcação manual para um cliente novo só com o nome.
- [ ] Uma marcação manual fora do horário mostra o aviso e grava depois de confirmar.
- [ ] Uma marcação manual em conflito mostra o aviso com a marcação em causa, grava depois de confirmar e aparece destacada.
- [ ] Uma sobreposição manual nunca abre esse horário na página pública: a página pública continua a vê-lo como ocupado.
- [ ] Alterar o preço de um serviço não muda o preço de marcações já existentes.
- [ ] Um bloqueio retira os horários correspondentes da página pública.
- [ ] Um horário excecional de um dia substitui o horário semanal só nesse dia.
- [ ] As marcações passam sozinhas a Em andamento e a Concluída.
- [ ] O botão "Registar falta" só aparece depois da hora de início + tolerância.

---

## 2.3 — Estados e ciclo de vida das marcações ✅

**Princípio:** esta subetapa respeita todas as decisões já tomadas (Etapa 1 v1.1, 2.1 e 2.2). Nada é sobreposto.

### Estados

O sistema tem **5 estados**:

| Estado | Código | Funcionamento |
|---|---|---|
| Confirmada | `confirmed` | Criada automaticamente após a reserva (online ou manual) |
| Em andamento | `in_progress` | O sistema muda automaticamente quando chega a hora de início |
| Concluída | `completed` | O sistema muda automaticamente quando termina a duração prevista |
| Cancelada | `cancelled` | O barbeiro muda manualmente, **ou o cliente cancela pelo link pessoal até 2 h antes** |
| Falta | `no_show` | O barbeiro muda manualmente quando o cliente não aparece |

### Ciclo de vida

```
                 automático                 automático
 confirmed ───(hora de início)──▶ in_progress ───(hora de fim)──▶ completed
     │                               │
     │  barbeiro ou cliente*         │  barbeiro
     ▼                               ▼
 cancelled                cancelled / no_show**

  *  cliente: só pelo link pessoal e só até 2 h antes do início
  ** no_show: só durante o atendimento, da hora de início + tolerância (10 min) até à hora de fim
```

### Regras definitivas

1. Toda a marcação começa como `confirmed`.
2. Na hora de início passa automaticamente a `in_progress`.
3. Na hora de fim passa automaticamente a `completed`.
4. O barbeiro pode mudar manualmente para `cancelled` enquanto a marcação está `confirmed` ou `in_progress`.
5. O barbeiro pode mudar manualmente para `no_show` **só enquanto a marcação está `in_progress`**, a partir da **hora de início + tolerância** (10 min, configurável) e até à hora de fim. Se o cliente não aparece, o barbeiro está livre nesse horário e regista a falta na hora (decisão de 2026-11-10). Depois de `completed` já não é possível.
6. `cancelled` e `no_show` são **estados finais** e nunca avançam automaticamente.
7. O cliente não altera o estado da marcação, **exceto cancelar pelo link pessoal até 2 h antes** do início (decisão da 1.5, mantida na 2.2).
8. As mudanças automáticas acontecem **no backend**, sem depender de o PWA estar aberto. O mecanismo escolhe-se na Etapa 3.
9. Só `no_show` conta para o **registo de faltas** do cliente e para a sinalização ⚠️ à 2.ª falta (1.6).

### Detalhe guardado no cancelamento

Um só estado `cancelled`, mas com o detalhe necessário para o histórico do cliente (1.6):

| Campo | Valores | Para que serve |
|---|---|---|
| Quem cancelou | `client` / `barber` | Distinguir no histórico e nas notificações (só o cancelamento pelo cliente notifica o barbeiro) |
| Cancelamento tardio | sim / não | Marcado pelo barbeiro quando o cliente avisa depois do prazo de 2 h. Fica no histórico e **não conta como falta** |
| Data/hora | timestamp | Saber quando foi cancelado |

### Critérios de aceitação

- [ ] Uma marcação criada, online ou manual, fica `confirmed`.
- [ ] Sem nenhuma app aberta, a marcação passa a `in_progress` na hora de início e a `completed` na hora de fim.
- [ ] O barbeiro cancela uma marcação `confirmed` ou `in_progress`, que fica `cancelled` com quem = barbeiro.
- [ ] O cliente cancela pelo link até 2 h antes, e fica `cancelled` com quem = cliente e notificação ao barbeiro. Depois do prazo, o link não deixa cancelar e mostra o WhatsApp.
- [ ] O barbeiro marca um cancelamento como tardio, que aparece no histórico e não soma às faltas.
- [ ] "Registar falta" não aparece antes da hora de início + 10 min.
- [ ] "Registar falta" está disponível em `in_progress` (do início + 10 min até ao fim) e **não** está disponível em `completed`.
- [ ] Uma marcação `cancelled` ou `no_show` nunca muda sozinha de estado.
- [ ] Só as marcações `no_show` contam para as faltas do cliente.

---

## 2.4 — Regras de disponibilidade e cálculo de horários ✅

**Decisão (2026-11-10): modelo híbrido.** Mantém-se a grelha de **15 min** da 1.4 e acrescenta-se o **horário de encaixe**: o fim exato de cada marcação ou bloqueio também é oferecido como início. Assim não ficam buracos mortos com serviços de 25, 35, 45 ou 50 min.

### Regras
1. **Sem intervalos automáticos** entre atendimentos (intervalo = 0 min, configurável, 1.4).
2. Os horários são calculados **conforme a duração do serviço escolhido**, e o serviço tem de caber inteiro (RN-02).
3. **Marcações públicas nunca se sobrepõem** a marcações ou bloqueios ativos (RN-01).
4. São respeitados horário semanal, horário excecional do dia, almoço, bloqueios, feriados e domingo fechado (1.3 / RN-03).
5. A disponibilidade é **validada de novo na confirmação** da reserva (2.1). O tratamento de corridas fica na 2.5.
6. **Grelha de 15 min** alinhada ao relógio (:00, :15, :30, :45) **+ encaixe** no fim de cada marcação ou bloqueio.
7. Horas sempre em **hora de Portugal** (`Europe/Lisbon`, com mudança de hora verão/inverno).

### Cálculo passo a passo (para um dia e um serviço)

1. **O dia é elegível?** Está entre hoje e hoje + 30 dias; não é domingo nem dia fechado; não é feriado; não está bloqueado o dia inteiro. Hoje só se "marcar no próprio dia" estiver ligado.
2. **Janelas de trabalho do dia:** horário excecional do dia, se existir, senão o horário semanal, **menos** a pausa de almoço.
   - Ex.: terça → 09:00–13:00 e 14:00–19:00.
3. **Ocupações do dia:** marcações `confirmed` e `in_progress` (incluindo sobreposições manuais) e bloqueios, alargados pelo intervalo entre marcações (0 min).
   - `cancelled`, `no_show` e `completed` passadas não ocupam.
4. **Janelas livres** = janelas de trabalho menos ocupações.
5. **Candidatos** em cada janela livre:
   - o **início da janela** (abertura, fim do almoço ou **fim de uma marcação/bloqueio** — o encaixe);
   - todos os pontos da grelha de 15 min dentro da janela.
6. **Filtrar:** ficam só os candidatos em que `início + duração ≤ fim da janela` e `início ≥ agora + antecedência mínima (2 h)`.
7. Ordenar e tirar repetidos. Se não sobra nenhum, o dia aparece como **sem vagas** no calendário.

### Exemplos (com os serviços reais)

**Terça vazia, Corte na tesoura (50 min)**
- Manhã: 09:00, 09:15, … , **12:00** (12:00 + 50 = 12:50 ≤ 13:00; 12:15 terminaria às 13:05, por isso não aparece).
- Tarde: 14:00, 14:15, … , **18:00** (18:15 terminaria às 19:05).

**Terça com uma marcação das 09:00 às 09:35 (Corte com máquina), cliente quer Barba (25 min)**
- Janela livre 09:35–13:00 → **09:35** (encaixe), 09:45, 10:00, 10:15, …, **12:30** (12:30 + 25 = 12:55; 12:45 terminaria às 13:10).

**Sábado, marcação 11:00–11:45 (Cabelo e barba), cliente quer Corte de criança (35 min)**
- Janela 09:00–11:00 → 09:00 … **10:15** (10:15 + 35 = 10:50; 10:30 terminaria às 11:05).
- Janela 11:45–13:00 → **11:45** (encaixe), 12:00, 12:15 (12:15 + 35 = 12:50). 12:30 não aparece (13:05).

**Hoje às 10:20, antecedência 2 h**
- Só aparecem horários a partir das **12:20**: o primeiro da grelha é 12:30, a não ser que um encaixe caia entre 12:20 e 12:30.

### Critérios de aceitação
- [ ] Num dia vazio aparecem horários de 15 em 15 min, desde a abertura até à última hora em que o serviço cabe inteiro, em cada janela.
- [ ] O fim exato de uma marcação (ex.: 09:35) aparece como horário disponível.
- [ ] Nenhum horário mostrado atravessa o almoço ou passa do fecho.
- [ ] Nenhum horário mostrado coincide com uma marcação ativa, uma sobreposição manual ou um bloqueio.
- [ ] Domingos, feriados (incluindo 20/08) e dias bloqueados não têm horários.
- [ ] Um horário excecional de um dia substitui o horário semanal nesse dia.
- [ ] Não aparecem horários antes de agora + 2 h nem depois de hoje + 30 dias.
- [ ] Uma marcação cancelada ou com falta liberta o horário.
- [ ] Mudar o intervalo entre marcações ou a grelha no painel altera os horários calculados.
- [ ] Na mudança de hora (março/outubro) os horários continuam certos.

---

## 2.5 — Conflitos e reservas simultâneas ✅

Sem contradições com decisões anteriores. As regras 5 e 6 foram completadas com o que já estava decidido na 2.1 e na 2.2.

### Regras
1. **Selecionar um horário não o bloqueia** (não há reserva temporária).
2. O horário só fica ocupado **depois da confirmação** da marcação.
3. No momento da confirmação, o sistema **valida de novo** todas as regras da 2.4 (disponibilidade, antecedência, bloqueios, feriados) e da 2.1 (número bloqueado, limite de 2 marcações futuras por telemóvel).
4. Se outro cliente reservou primeiro, a segunda tentativa é **recusada**.
5. O cliente recebe "Esse horário acabou de ser ocupado, escolha outro", **volta à escolha de horário e mantém os dados preenchidos** (2.1).
6. O barbeiro continua autorizado a criar **sobreposições manuais**, sempre com **aviso de conflito e confirmação** (2.2 / RN-01).
7. A validação definitiva é feita **no backend**, com proteção contra reservas simultâneas. Nunca depende só do que o navegador mostrou.

### Situações de concorrência

| Situação | Resultado |
|---|---|
| Dois clientes confirmam o mesmo horário ao mesmo tempo | Só o primeiro grava. O segundo recebe a mensagem da regra 5 |
| Horários sobrepostos parcialmente (ex.: A às 10:00 com 45 min, B às 10:30) | Igual: quem confirmar em segundo lugar é recusado |
| O cliente carrega duas vezes em "Confirmar" (duplo clique / rede lenta) | Fica **uma só** marcação (o botão desativa ao submeter e o backend ignora o pedido repetido) |
| O barbeiro cria um bloqueio, ou uma marcação manual, enquanto um cliente está a escolher esse horário | A confirmação do cliente é recusada (regra 3) |
| Um cliente confirma primeiro e depois o barbeiro marca manualmente o mesmo horário | O barbeiro vê o **aviso de conflito** e decide (regra 6) |
| A antecedência mínima passa enquanto o cliente preenche os dados | Recusado na confirmação, e o cliente escolhe outro horário |
| O mesmo telemóvel tenta duas marcações em simultâneo e fica acima do limite de 2 | Só grava até ao limite |

**Nota técnica:** a implementação da proteção de concorrência em PostgreSQL/Supabase (função de reserva com bloqueio, restrição na base de dados, idempotência) é definida na **Etapa 3**. Lembrete: como as sobreposições manuais são permitidas, a proteção não pode ser uma restrição absoluta sobre todas as marcações (ver 2.2).

### Critérios de aceitação
- [ ] Abrir ou selecionar um horário não o tira da lista dos outros clientes.
- [ ] Dois pedidos simultâneos para o mesmo horário (ou sobrepostos) resultam em exatamente 1 marcação.
- [ ] O cliente recusado vê a mensagem, volta à escolha de horário e não perde nome nem telemóvel.
- [ ] Um duplo clique em "Confirmar" cria só 1 marcação.
- [ ] Um bloqueio criado depois de o cliente ver os horários impede a confirmação nesse período.
- [ ] O barbeiro consegue gravar uma sobreposição manual depois do aviso, e essa sobreposição nunca abre vaga na página pública.
- [ ] O limite de 2 marcações futuras por telemóvel resiste a pedidos simultâneos.

---

## 2.6 — Alterações e cancelamentos ✅

Coerente com a 1.5 (o cliente não altera na v1) e com a 2.3 (estados).

### Cliente
1. **Não edita** uma marcação existente.
2. Para mudar, **cancela pelo link pessoal** (até 2 h antes) e **faz uma nova reserva**.
3. Depois de cancelar, o ecrã mostra o botão **"Marcar novo horário"**, que leva ao início do fluxo.
4. Pode marcar o novo horário **antes** de cancelar o antigo, dentro do limite de 2 marcações futuras por telemóvel.

### Barbeiro: o que pode alterar

| Campo | Regras |
|---|---|
| Data / hora | Mesmas regras da marcação manual (2.2): aviso fora do horário e **aviso de conflito**, e ele decide |
| Serviço | A duração muda. Se passar a sobrepor a marcação seguinte → aviso de conflito. O preço é sugerido pelo novo serviço e pode ser ajustado |
| Cliente | A marcação passa para o histórico do novo cliente |
| Preço | Editável na marcação. Não mexe nos preços dos serviços |
| Categoria | **Não é campo da marcação**: vive na ficha do cliente (interruptor Habitual) e afeta só marcações futuras |
| Observações | Editáveis |

### Em que estados pode editar (opção A)

| Estado | Pode editar |
|---|---|
| `confirmed` | Tudo |
| `in_progress` | Só **serviço, preço e observações** (ex.: o cliente decide fazer também a barba) |
| `completed` · `cancelled` · `no_show` | **Nada.** Só acrescentar **notas internas**. São registos do que aconteceu |

Não há exceção para corrigir o preço depois de `completed`: o preço ajusta-se durante o atendimento.

### Depois de alterar
- **Avisar o cliente:** depois de mudar data ou hora aparece **"Avisar por WhatsApp"** com a mensagem pré-escrita ("Olá [nome], a sua marcação passou para [dia] às [hora]…"). Não há avisos automáticos (1.5).
- **Link pessoal:** continua válido e mostra os dados atualizados. O prazo de 2 h para cancelar conta a partir da **nova** hora.
- **Página pública:** o horário antigo fica livre e o novo fica ocupado logo.
- **Histórico de alterações:** cada alteração é registada com o **campo, valor antigo → valor novo, data/hora** e quem alterou. Fica visível no detalhe da marcação.

### Critérios de aceitação
- [ ] O link pessoal do cliente não tem nenhuma opção de editar, só cancelar (dentro do prazo).
- [ ] Depois de cancelar, o cliente vê "Marcar novo horário".
- [ ] O barbeiro muda a hora de uma marcação `confirmed`: o horário antigo fica livre na página pública e o novo fica ocupado.
- [ ] Mudar para uma hora com conflito, ou fora do horário, mostra o aviso.
- [ ] Trocar para um serviço mais longo que invade a marcação seguinte mostra o aviso de conflito.
- [ ] Em `in_progress` só se editam serviço, preço e observações.
- [ ] Em `completed`, `cancelled` e `no_show` não se edita nada, só se acrescentam notas internas.
- [ ] Mudar o interruptor Habitual na ficha do cliente não altera o preço de marcações já existentes.
- [ ] Depois de mudar data/hora aparece "Avisar por WhatsApp" com a mensagem correta.
- [ ] O link pessoal mostra a nova data/hora, e o prazo de cancelamento conta a partir dela.
- [ ] Cada alteração aparece no histórico da marcação (antigo → novo, quando, quem).

---

## 2.7 — Categorias de clientes e preços ✅

Confirma as decisões já tomadas (1.2, 1.7 / RN-04 / RN-05 / RN-06, 2.1 e 2.6). A proposta original (o cliente escolhe a categoria) foi **rejeitada** por contradizê-las.

### Regras
1. Duas categorias: **Habitual/local** e **Visitante**.
2. **A categoria pertence ao cliente** (ficha) e é definida **só pelo barbeiro**, com o interruptor "Habitual" no painel.
3. **O cliente não escolhe a categoria.** Online, o sistema identifica-o pelo telemóvel: número **registado como habitual** → preço habitual; qualquer outro número (novo ou não habitual) → preço **visitante**.
4. A lista de serviços aparece **sem preços**. O preço só aparece **na revisão, depois do telemóvel**, e o cliente vê-o antes de confirmar.
5. O preço aplicado **fica guardado na marcação**. Alterações futuras na tabela de preços ou na categoria do cliente não mexem em marcações existentes.
6. O barbeiro pode **ajustar o preço** de uma marcação (dentro das regras de estado da 2.6). Para mudar a categoria, altera a ficha do cliente, e isso vale para as marcações seguintes.
7. **Marcação manual:** o preço sugerido segue a categoria da ficha. Um cliente novo começa como visitante, a não ser que o barbeiro ligue "Habitual" na hora.
8. **Os preços de visitante começam iguais aos habituais** (1.2 / 2.11) e o barbeiro altera-os mais tarde.

**Efeito aceite (1.7):** a revisão deixa perceber se um número é habitual (o preço muda), mas nunca mostra nome nem outros dados.

### Cálculo do preço (online)

```
telemóvel normalizado (E.164)
   └─▶ existe cliente com esse número E habitual = sim?
          ├─ sim → preço habitual do serviço
          └─ não → preço visitante do serviço
   └─▶ preço guardado na marcação no momento da confirmação
```

### Critérios de aceitação
- [ ] Nenhum campo de categoria aparece na página pública.
- [ ] A lista de serviços não mostra preços.
- [ ] Um número registado como habitual vê o preço habitual na revisão.
- [ ] Um número novo, ou registado mas não habitual, vê o preço visitante.
- [ ] O mesmo número escrito de formas diferentes (`912 345 678`, `+351912345678`) é reconhecido como o mesmo cliente.
- [ ] Ligar/desligar "Habitual" na ficha muda o preço das marcações **seguintes**, não das existentes.
- [ ] Alterar o preço de um serviço não muda marcações existentes.
- [ ] Na marcação manual, o preço sugerido segue a categoria da ficha e pode ser ajustado.
- [ ] Os preços visitante iniciais são iguais aos habituais (2.11).

---

## 2.8 — Dashboard e navegação ✅

Sem contradições com decisões anteriores. Inclui 3 complementos que vêm da 2.2 e da 2.3 (marcados com ➕).

### Objetivo
Painel simples e operacional, pensado para o telemóvel (PWA). A prioridade é a **agenda e os atendimentos**, não a análise de dados.

### Áreas
As 7 áreas e rotas definidas na 2.2: Dashboard (`/admin`), Agenda, Clientes, Serviços e preços, Horários e bloqueios, Notificações e Configurações.

### Dashboard (página inicial após o login)
- Total de marcações do dia.
- **Próxima marcação.**
- **Marcação em andamento**, com ➕ botão **"Registar falta"** em destaque a partir do início + 10 min (a janela é curta, 2.3) e botão de WhatsApp.
- Marcações concluídas do dia.
- Cancelamentos recentes.
- Lista dos próximos atendimentos do dia (com ⚠️ nos clientes sinalizados por faltas).
- Indicador de notificações não lidas.

**Fora da v1:** gráficos financeiros, estatísticas, relatórios de faturação, indicadores de desempenho, análises históricas.

### Navegação no telemóvel
**Barra inferior** com 4 acessos + menu:

| # | Item | Destino |
|---|---|---|
| 1 | Início | Dashboard |
| 2 | Agenda | Agenda (vista diária por defeito) |
| 3 | Clientes | Lista / pesquisa |
| 4 | Notificações | Lista, com badge de não lidas |
| 5 | Mais (☰) | Serviços e preços · Horários e bloqueios · Configurações · Terminar sessão |

- ➕ **Botão "Nova marcação" (+)** sempre acessível no Dashboard e na Agenda, porque é a ação mais frequente para quem continua a receber pedidos por WhatsApp e telefone (2.2).
- ➕ Na Agenda, **tocar num horário livre** abre a nova marcação já com a data e a hora preenchidas (2.2).
- **Ecrãs maiores:** a barra inferior passa a menu lateral.

### Indicador de notificações
- Contador visível no item "Notificações" da navegação.
- **Badge no ícone do PWA** com o nº de não lidas, quando o sistema suporta (o iPhone do barbeiro suporta com o PWA instalado).

### Critérios de aceitação
- [ ] Depois do login, o barbeiro chega ao Dashboard.
- [ ] O Dashboard mostra as informações operacionais do dia (total, próxima, em andamento, concluídas, cancelamentos recentes, próximos atendimentos).
- [ ] A Agenda, os Clientes e as Notificações são acessíveis pela barra inferior.
- [ ] Os Serviços, Horários, Configurações e Terminar sessão são acessíveis pelo menu "Mais".
- [ ] Em ecrãs grandes a navegação passa a lateral.
- [ ] Não há gráficos nem estatísticas na v1.
- [ ] As notificações não lidas aparecem no contador da navegação e no badge do ícone do PWA.
- [ ] ➕ O botão "Nova marcação" está acessível no Dashboard e na Agenda.
- [ ] ➕ Durante uma marcação em andamento, "Registar falta" aparece em destaque no Dashboard a partir do início + 10 min.
- [ ] ➕ Os clientes sinalizados por faltas aparecem com ⚠️ na lista de atendimentos.

---

## 2.9 — Notificações e pendências ✅

**Princípio (1.9, confirmado a 2026-11-10):** o barbeiro só é notificado do que **não foi ele a fazer**. As ações dele (criar, alterar, cancelar) ficam no **histórico de alterações** da marcação (2.6) e não geram notificação.

### Parte 1 — Acontecimentos ✅

| Acontecimento | Texto da notificação (exemplo) | Push | Por defeito |
|---|---|---|---|
| Nova marcação online | "Nova marcação: João, Corte, ter 11/11 10:00" | ✅ | Ligado |
| ⤷ cliente sinalizado | Igual, com "⚠️ 2 faltas" | ✅ | Ligado |
| Cancelamento pelo cliente | "João cancelou: Corte, ter 11/11 10:00. O horário ficou livre" | ✅ | Ligado |
| Resumo do dia | "Hoje: 7 marcações, a 1.ª às 09:30" | ✅ | Ligado, 08:00 |
| Lembrete antes da marcação | "Daqui a 15 min: João, Corte" | ✅ | Desligado |
| Ações do próprio barbeiro | Não notifica (fica no histórico da marcação) | ❌ | — |

Cada tipo pode ser ligado ou desligado em Configurações. A hora do resumo e a antecedência do lembrete são configuráveis.

### Parte 2 — Comportamento ✅

| Tema | Comportamento |
|---|---|
| Tocar numa notificação (push ou lista) | Abre o **detalhe da marcação** (o resumo do dia abre a Agenda de hoje) |
| Marcar como lida | Automático ao abrir. Também há **"Marcar todas como lidas"** |
| Pendências | **Pendência = notificação não lida.** Não existe uma lista à parte. O contador do Dashboard, da navegação e o badge do ícone mostram o mesmo número |
| Badge do ícone | Atualiza quando chega uma notificação e quando se lê |
| Push falhado ou atrasado | A notificação aparece **sempre** na lista do painel (o painel é a fonte de verdade) |
| Ativar notificações | No 1.º login: aviso para **instalar o PWA no ecrã principal** (obrigatório no iPhone) e botão **"Ativar notificações"**. Enquanto não estiverem ativas, o Dashboard mostra um aviso |
| Vários dispositivos | O push chega a todos os dispositivos onde ele ativou notificações (ex.: iPhone e computador) |
| Conservação | As notificações ficam guardadas **30 dias** e depois são apagadas automaticamente (o histórico das marcações não é afetado) |

### Critérios de aceitação
- [ ] Uma marcação online gera uma notificação interna e push.
- [ ] Se o cliente estiver sinalizado, a notificação inclui o aviso ⚠️.
- [ ] Um cancelamento pelo cliente gera notificação interna e push.
- [ ] O resumo do dia chega à hora configurada, sem a app aberta.
- [ ] Criar, alterar ou cancelar pelo barbeiro **não** gera notificação, mas aparece no histórico da marcação.
- [ ] Desligar um tipo em Configurações faz com que deixe de chegar.
- [ ] Tocar numa notificação abre a marcação correspondente.
- [ ] O contador de não lidas é igual no Dashboard, na navegação e no badge do ícone.
- [ ] Com o push desativado, as notificações continuam a aparecer na lista.

---

## 2.10 — Gestão de clientes ✅

**Decisão (2026-11-10): opção C, "Lembrar neste dispositivo".** Mantém a RN-06 (a página pública nunca mostra dados a partir do número) e a regra de não haver mensagens pagas (1.5 / 1.7). A **confirmação por SMS fica como funcionalidade futura**.

### Identificação do cliente (no servidor)
1. O **telemóvel normalizado (E.164)** é o identificador principal do cliente. Não pode haver dois clientes com o mesmo número.
2. **Número novo** → o cliente é criado automaticamente na confirmação, com o nome indicado e a categoria Visitante.
3. **Número existente** → a marcação é ligada a esse cliente, e o preço segue a categoria da ficha (2.7).
4. O nome escrito na marcação **fica guardado na marcação**, mas **não altera a ficha** de um cliente existente. Assim ninguém consegue renomear a ficha de outra pessoa escrevendo o número dela. O barbeiro vê os dois nomes se forem diferentes.
5. O servidor **nunca devolve à página pública** dados da ficha (nome, histórico, faltas). Só o preço, na revisão (efeito aceite na 1.7).

### Lembrar neste dispositivo (no telemóvel do cliente)
6. No passo dos dados há a opção **"Lembrar os meus dados neste dispositivo"**, ligada por defeito.
7. Depois de uma marcação confirmada, o **próprio navegador do cliente** guarda o nome e o telemóvel. Na próxima visita aparecem **já preenchidos**.
8. O navegador guarda também os **links pessoais** das marcações feitas nesse dispositivo. A página inicial mostra **"As suas próximas marcações"**, com acesso direto para ver ou cancelar. Como não há email, isto resolve o problema de o cliente perder o link.
9. Há sempre um link **"Não sou eu / esquecer os meus dados"**, que apaga tudo o que está guardado no dispositivo.
10. Os dados guardados no dispositivo **nunca saem dele** e não são lidos pelo servidor. Se o cliente mudar de telemóvel, limpar o navegador ou usar outro aparelho, escreve de novo nome e telefone, e o servidor reconhece-o pelo número na mesma.

### Do lado do barbeiro (já definido na 2.2 / 1.8)
- Lista e pesquisa por nome ou telemóvel, ficha completa, criar e editar.
- Clientes criados à mão podem não ter telemóvel. Se mais tarde se acrescentar um número que já existe noutra ficha, o sistema avisa ("Este número já pertence a [nome]").

### Futuro (não entra agora)
- **Confirmação por SMS** na 1.ª utilização de cada número, com reconhecimento seguro nas seguintes, e eventual pré-preenchimento a partir do servidor. Ativa-se se aparecerem marcações falsas ou quando o projeto escalar. Implica fornecedor de SMS e custo por mensagem.

### Critérios de aceitação
- [ ] Uma 1.ª marcação com um número novo cria o cliente automaticamente.
- [ ] Uma marcação com um número existente fica ligada à ficha certa, mesmo que o número seja escrito de outra forma.
- [ ] Escrever o número de outra pessoa nunca mostra o nome nem os dados dela.
- [ ] O nome escrito numa marcação não altera o nome da ficha existente.
- [ ] Com "Lembrar" ligado, na visita seguinte nome e telemóvel aparecem preenchidos no mesmo dispositivo.
- [ ] "As suas próximas marcações" mostra as marcações feitas nesse dispositivo, com acesso ao cancelamento.
- [ ] "Não sou eu / esquecer" apaga os dados do dispositivo.
- [ ] Noutro dispositivo, os campos aparecem vazios.
- [ ] Não existe nenhum envio de SMS na v1.

---

## 2.11 — Serviços e preços ✅

Sem contradições (coerente com 1.2, 2.2, 2.6 e 2.7). Complementos marcados com ➕.

### Campos de um serviço

| Campo | Regra |
|---|---|
| Nome | Obrigatório (ex.: "Cabelo e barba") |
| Descrição | Opcional, curta. Aparece por baixo do nome na página pública |
| Duração | Obrigatória, em minutos (mín. 5). Qualquer valor funciona com a grelha + encaixe (2.4) |
| Preço habitual/local | Obrigatório, em € |
| Preço visitante | Obrigatório, em €. **Começa igual ao preço habitual** (decisão 1.2) e o barbeiro altera-o mais tarde |
| Estado | Ativo / Inativo |
| ➕ Ordem | Posição na lista pública (o barbeiro reordena) |

### O que o barbeiro pode fazer
- **Adicionar**, **editar** (nome, descrição, duração, preços, ordem) e **desativar/reativar**.
- ➕ **Não se apagam serviços que já têm marcações**: desativam-se, para manter o histórico. Um serviço sem marcações pode ser apagado.

### Efeitos das alterações
- ➕ **Desativar:** o serviço desaparece da página pública. As marcações existentes mantêm-se. O barbeiro continua a poder usá-lo numa marcação manual? **Não**: só serviços ativos.
- **Mudar preços:** não afeta marcações existentes, porque o preço fica guardado na marcação (RN-05).
- ➕ **Mudar a duração:** também não afeta marcações existentes. **A marcação guarda a sua duração e hora de fim** no momento em que é criada. A nova duração vale para as marcações seguintes e para o cálculo de horários.

### Página pública (2.1)
- Mostra os serviços **ativos**, pela ordem definida, com **nome, descrição e duração**, sem preço.

### Serviços iniciais (1.2)

| Ordem | Serviço | Duração | Habitual | Visitante |
|---|---|---|---|---|
| 1 | Cabelo e barba | 45 min | 20 € | 20 € |
| 2 | Corte de cabelo na tesoura | 50 min | 20 € | 20 € |
| 3 | Corte de cabelo com máquina | 35 min | 17 € | 17 € |
| 4 | Barba | 25 min | 9 € | 9 € |
| 5 | Corte de criança | 35 min | 10 € | 10 € |

### Critérios de aceitação
- [ ] O barbeiro cria um serviço com nome, duração e os dois preços, e ele aparece na página pública sem preço.
- [ ] Os preços visitante começam iguais aos habituais.
- [ ] Quando o barbeiro altera um preço visitante, os visitantes passam a vê-lo nas marcações **novas**.
- [ ] Desativar um serviço tira-o da página pública e da marcação manual, sem mexer nas marcações existentes.
- [ ] Um serviço com marcações não pode ser apagado, só desativado.
- [ ] Mudar a duração de um serviço não mexe na hora de fim das marcações existentes.
- [ ] A ordem definida pelo barbeiro é a ordem da página pública.
- [ ] Os 5 serviços iniciais existem logo no arranque do sistema.

---

## 2.12 — Horários de funcionamento, pausas e folgas ✅

Sem contradições. Consolida a 1.3, a 1.8, a 2.2 e a 2.4 numa só área do painel: **Horários e bloqueios** (`/admin/horarios`). Complementos marcados com ➕.

### O que o barbeiro configura

| Item | Como funciona | Valor inicial |
|---|---|---|
| **Dias de trabalho** | Liga/desliga cada dia da semana | Seg–Sáb ligados, Dom desligado |
| **Abertura e fecho** | Por dia da semana | Seg–Sex 09:00–19:00 · Sáb 09:00–13:00 |
| **Pausas** | Uma ou mais por dia (início–fim) | Seg–Sex 13:00–14:00 (almoço) |
| **Horário excecional** | Para uma data concreta: outro horário, ou fechado. Substitui o semanal só nesse dia (2.2) | — |
| **Folgas** | Um dia inteiro sem marcações (bloqueio de dia) | — |
| **Férias / ausências** | Intervalo de datas (de … a …) sem marcações, com motivo opcional | — |
| **Bloqueios pontuais** | Data + hora início–fim + motivo opcional (consulta, compromisso…) | — |
| **Feriados** | Lista anual dos nacionais (incluindo móveis) + municipal de Albufeira (20/08). Pode acrescentar ou retirar dias (ex.: Carnaval) (1.3) | Nacionais + 20/08 |

### Regras
1. Tudo o que está fechado, em pausa, em folga, de férias, bloqueado ou é feriado **não aparece na página pública** (2.4).
2. Os bloqueios **ocupam o horário** como uma marcação (sem cliente) e entram no cálculo de encaixe da 2.4 (o fim de um bloqueio é candidato).
3. Alterações aos horários e bloqueios **valem logo** para a página pública.
4. ➕ **Conflito com marcações já existentes:** se o barbeiro criar um bloqueio, férias ou folga, ou reduzir o horário de um dia, por cima de marcações já feitas:
   - o sistema **avisa e lista as marcações afetadas** ("3 marcações neste período: …");
   - **não as cancela sozinho**. O barbeiro decide, marcação a marcação, se cancela ou mantém;
   - para cada uma tem à mão o botão **"Avisar por WhatsApp"** (1.5).
5. ➕ As marcações mantidas dentro de um bloqueio ficam como **sobreposição intencional** (coerente com a 2.2).
6. ➕ Na v1 **não há folgas recorrentes** (ex.: "um sábado sim, outro não"). Fazem-se com folgas individuais.

### Critérios de aceitação
- [ ] Desligar um dia da semana tira todos esses dias da página pública.
- [ ] Mudar a abertura ou o fecho de um dia altera os horários públicos desse dia da semana.
- [ ] Uma pausa nunca é atravessada por um serviço na página pública.
- [ ] Um horário excecional numa data substitui o semanal só nessa data.
- [ ] Uma folga ou um período de férias tiram esses dias da página pública.
- [ ] Um bloqueio pontual tira esse período da página pública, e o fim do bloqueio aparece como encaixe.
- [ ] Os feriados nacionais e o 20/08 não têm horários. Retirar um feriado volta a abrir esse dia.
- [ ] Criar um bloqueio por cima de marcações existentes mostra o aviso com a lista e não cancela nada automaticamente.
- [ ] Cada marcação afetada tem acesso a cancelar e a "Avisar por WhatsApp".

---

## 2.13 — Configurações gerais ✅

Sem contradições. A proposta tinha 5 itens. Como todas as regras decididas antes são **"configuráveis no painel"** (decisão de 1.4), esta área reúne-as todas (➕). Rota: `/admin/configuracoes`.

### 1. Dados da barbearia

| Campo | Onde aparece | Valor inicial |
|---|---|---|
| Nome da barbearia | Cabeçalho da página pública, .ics, título do PWA | MR Polo Barber |
| Morada | Página pública, .ics | `[MORADA]`, Albufeira |
| Localização | ➕ Link "Ver no mapa" (Google Maps) na página pública | `[LINK_MAPA]` |
| Contacto telefónico / WhatsApp | Botões "Contacte o barbeiro" (2.1, 1.5) | `[WHATSAPP]` |

### 2. Link de marcações
- O endereço é **`mrpolobarber.vercel.app`**. **Não é editável no painel**, porque depende da configuração na Vercel. Mudar de endereço (ou passar a domínio próprio) é feito pelo Gabriel.
- ➕ O painel mostra o link com os botões **"Copiar"** e **"Partilhar"** (para colar no estado/bio do WhatsApp e no Instagram) e um **código QR** para imprimir e pôr no balcão.

### 3. Regras de marcação (todas já decididas, aqui ficam editáveis)

| Configuração | Valor inicial | Origem |
|---|---|---|
| Permitir marcar para o próprio dia | Sim | 1.4 |
| Antecedência mínima | 2 h | 1.4 |
| Antecedência máxima (dias no futuro) | 30 dias | 1.4 |
| Grelha de horários | 15 min (+ encaixe, sempre ativo) | 1.4 / 2.4 |
| Intervalo entre marcações | 0 min | 1.4 |
| Serviços por marcação | 1 | 1.4 |
| ➕ Máx. de marcações futuras por telemóvel | 2 | 2.1 |
| ➕ Prazo para o cliente cancelar | 2 h antes | 1.5 |
| ➕ Tolerância de atraso | 10 min | 1.6 |
| ➕ Faltas para sinalizar ⚠️ | 2 | 1.6 |

### 4. Notificações (1.9 / 2.9)

| Configuração | Valor inicial |
|---|---|
| Nova marcação online | Ligado |
| Cancelamento pelo cliente | Ligado |
| Resumo do dia + hora | Ligado, 08:00 |
| Lembrete antes da marcação + antecedência | Desligado, 15 min |
| Ativar notificações neste dispositivo | Botão (2.9) |

### 5. Privacidade
- ➕ Link para a **política de privacidade** mostrada no formulário público (1.7). O texto é preparado antes do lançamento (pendente P-03/P-04).

A **conta do barbeiro** (email, palavra-passe, terminar sessão) fica na **2.14**.

### Validações
- Os valores numéricos têm limites razoáveis (ex.: antecedência mínima 0–48 h; máxima 1–180 dias; tolerância 0–30 min; máx. por telemóvel 1–10).
- Uma alteração vale **logo** para a página pública e **não mexe em marcações existentes**.

### Critérios de aceitação
- [ ] Mudar o nome, a morada ou o WhatsApp atualiza a página pública e os botões de contacto.
- [ ] O link de marcações aparece com Copiar, Partilhar e código QR.
- [ ] Mudar a antecedência mínima ou máxima altera logo os horários e dias disponíveis na página pública.
- [ ] Mudar o máximo por telemóvel, o prazo de cancelamento, a tolerância ou as faltas para sinalizar altera o comportamento correspondente.
- [ ] Valores fora dos limites não são aceites.
- [ ] Nenhuma alteração de configuração mexe em marcações já existentes.

---

## 2.14 — Segurança e acesso administrativo ✅

**Recuperação da palavra-passe:** mantém-se a decisão da **2.2**. No piloto, o Gabriel repõe-na pelo painel da Supabase. A recuperação por email ("Esqueci-me") fica para o **futuro**, quando houver domínio próprio ou servidor de email. O serviço de email embutido da Supabase só envia para a equipa do projeto, e o Resend exige um domínio verificado.

### Acesso administrativo
1. **Um único utilizador administrativo:** o barbeiro.
2. **Sem registo público.** A conta é criada pelo Gabriel.
3. O sistema verifica que quem entra é **o administrador definido**: não basta ter uma conta Supabase válida.
4. Login com **email + palavra-passe** (Supabase Auth).
5. ➕ **Mudar a palavra-passe** dentro do painel (Configurações → Conta). Não precisa de email.
6. **Sessão** mantém-se ativa no PWA (renovação automática) até "Terminar sessão" (menu "Mais", 2.8).
7. Qualquer rota `/admin/*` sem sessão de administrador → login (2.2).
8. **PWA instalado** no iPhone do barbeiro, com o aviso de instalação no 1.º login (2.9).

### Área pública
9. Os clientes usam a página **sem conta** (1.1).
10. ➕ A página pública **não lê tabelas diretamente**. Só usa **funções controladas no servidor**: serviços ativos, horários livres, preço para um telemóvel, criar marcação, ver/cancelar pelo link pessoal. Assim nunca recebe dados de outros clientes (RN-06).
11. ➕ **Link pessoal** com um **código aleatório longo** (impossível de adivinhar). Dá acesso apenas a essa marcação.
12. ➕ **Limite de pedidos** e proteção anti-bot nas funções públicas (2.1).

### Proteção dos dados
13. **RLS ativo em todas as tabelas.** Só o administrador lê e escreve, e o público não tem acesso direto.
14. ➕ **Chaves secretas nunca no site.** O frontend só usa a chave **publicável**. A `service_role` (se for precisa) só existe em Edge Functions.
15. ➕ Ligação sempre em **HTTPS** (Vercel).

### Futuro
- Recuperação de palavra-passe por email (domínio próprio + Resend, ou Gmail SMTP).
- Mais utilizadores ou papéis (ex.: um 2.º barbeiro), se o projeto escalar.

### Critérios de aceitação
- [ ] Não existe nenhuma página de registo.
- [ ] Uma conta Supabase que não seja a do administrador não consegue entrar no painel nem ler dados.
- [ ] Sem sessão, qualquer `/admin/*` leva ao login.
- [ ] O barbeiro muda a sua palavra-passe no painel.
- [ ] "Terminar sessão" termina a sessão e volta ao login.
- [ ] Com a chave publicável, um visitante não consegue ler nenhuma tabela diretamente (clientes, marcações, notificações).
- [ ] Um link pessoal só dá acesso à sua marcação. Um código alterado ou inventado não abre nada.
- [ ] Pedidos repetidos em excesso às funções públicas são travados.
- [ ] Nenhuma chave secreta aparece no código do site.

---

## 2.15 — Revisão final e validação funcional ✅

### 1. Verificação de coerência

Os dois documentos foram relidos por inteiro. Não ficou nenhuma contradição entre subetapas. Foram feitos **alinhamentos de texto** (sem decisões novas):

| Onde | Antes | Agora |
|---|---|---|
| REQUISITOS, estados | 7 estados (3 tipos de cancelamento) | **5 estados** + detalhe do cancelamento (quem / tardio), como na 2.3 |
| REQUISITOS, RF-14 | Falta "depois da tolerância" | Falta **só durante a marcação** (2.3) |
| REQUISITOS, cancelar/alterar | Barbeiro "sem limite" | Sem limite de antecedência, **conforme o estado** (2.6) |
| REQUISITOS, notificações | "Marcações manuais: não" | **Ações do próprio barbeiro: não** (2.9) |
| REQUISITOS, novas regras | — | **RN-10** limite de 2 por telemóvel · **RN-11** o nome não altera a ficha · **RF-09** "As suas próximas marcações" |
| REQUISITOS, pendentes | — | P-10 SMS · P-11 recuperação por email. P-02 passa a bloquear o lançamento |
| ESPECIFICAÇÃO 2.1 | Grelha de 15 min, sem "lembrar" | **+ encaixe** (2.4) · **"Lembrar neste dispositivo"** e "As suas próximas marcações" (2.10) |
| ESPECIFICAÇÃO 2.7 | "Enquanto não houver preço visitante…" | Os preços visitante **começam iguais** aos habituais (2.11) |

O REQUISITOS.md passa a **v1.2**.

### 2. O que entra na v1

**Tudo o que está especificado nas subetapas 2.1 a 2.14**, ou seja:
- **Página pública:** marcar sem conta, horários com grelha + encaixe, preço pelo telemóvel, confirmação automática, link pessoal, .ics, cancelar até 2 h antes, "Lembrar neste dispositivo", "As suas próximas marcações", WhatsApp.
- **Painel (PWA):** dashboard, agenda (dia/semana), marcação manual com avisos, estados automáticos, falta, edição por estado, histórico de alterações, clientes (habitual, bloqueio, faltas), serviços, horários e bloqueios, feriados, configurações, link com QR.
- **Notificações:** push (nova online, cancelamento do cliente, resumo do dia, lembrete opcional), sino, badge.
- **Segurança:** um administrador, RLS, funções públicas controladas, limite de pedidos.

### 3. Funcionalidades futuras (fora da v1)

| Funcionalidade | Origem |
|---|---|
| Confirmação por SMS do número do cliente | 2.10 |
| O cliente alterar a marcação (sem cancelar e remarcar) | 1.5 / 2.6 |
| Avisos automáticos ao cliente (email / SMS / WhatsApp) | 1.5 / 1.9 |
| Recuperação de palavra-passe por email | 2.2 / 2.14 |
| Domínio próprio | 1.1 |
| Integração com Google Calendar | 1.1 |
| Gráficos, estatísticas e relatórios de faturação | 2.8 |
| Folgas recorrentes | 2.12 |
| Mais do que 1 serviço por marcação na página pública | 1.4 (o modelo de dados fica preparado) |
| Mais barbeiros / vários utilizadores / versão SaaS para outras barbearias | 1.1 / 2.14 |

### 4. Pendentes que bloqueiam o lançamento (não o desenvolvimento)

| # | Pendente | Quem |
|---|---|---|
| P-02 | Morada, link do mapa e WhatsApp da barbearia | Gabriel |
| P-03 | Responsável RGPD (nome, NIF) e prazo de conservação | Gabriel |
| P-04 | Texto da política de privacidade | Gabriel + Claude |

Pendentes que **não bloqueiam**: P-01 preços visitante (começam iguais), P-05 Carnaval (editável no painel).

### 5. Validação

- [x] Gabriel valida a Especificação Funcional (2.1–2.15) — 2026-11-10
- [x] Etapa 2 fechada → avançar para a **Etapa 3 — Arquitetura e base de dados**
