# MR Polo Barber — Marcação semanal

**Clientes habituais com hora fixa todas as semanas.** Pedido do Gabriel antes do lançamento. Proposta de 2026-11-19, **validada pelo Gabriel no mesmo dia, com as recomendações D1–D6**.

## Estado

| # | Subetapa | Estado |
|---|---|---|
| S.1 | Motor no servidor | ✅ aplicada a 2026-11-19 (OK do Gabriel) e testada |
| S.2 | Página pública | ✅ 2026-11-19 (testada no browser com respostas simuladas) |
| S.3 | Painel | ✅ 2026-11-19 (testado no browser com respostas simuladas) |
| S.4 | Documentação e testes | 🔶 documentação feita (Especificação 2.1, este ficheiro) · falta o teste real com o Matheus |

### S.3 — Painel ✅

| Peça | Ficheiro |
|---|---|
| Ler as séries (`weekly_series`), aprovar/recusar, criar, parar e o texto do resumo ("Marcadas: ter 15/12 · Não marcadas: ter 01/12 (feriado)") | `src/admin/semanal/semanalApi.js` |
| **Início:** cartão "Pedidos de marcação semanal" (só aparece quando há pedidos) com **Aprovar** e **Recusar**. Ao aprovar, mostra as semanas marcadas e as que saltaram | `src/admin/semanal/PedidosSemanais.jsx`, `pages/Inicio.jsx` |
| **Ficha do cliente:** secção "Marcação semanal". Mostra as séries pendentes e ativas, com Aprovar/Recusar e **Parar marcação semanal**. Tem **+ Nova marcação semanal** (serviço, 1.ª semana, hora; só para habituais não bloqueados) e a lista das anteriores com o motivo | `src/admin/semanal/SeccaoSemanal.jsx`, `pages/ClienteFicha.jsx` |
| **Avisos antes de** tirar "Habitual" ou bloquear um cliente com série: "a série para e as marcações futuras dela são canceladas" | `pages/ClienteFicha.jsx` |
| **🔁** nas marcações semanais (agenda do dia e Início) · origem **"Semanal"** · ao editar, a origem não muda | `lib/estados.js`, `agenda/VistaDia.jsx`, `agenda/MarcacaoForm.jsx` |
| **Notificações:** ícone 🔁 nos 3 tipos novos. Tocar no pedido semanal abre o Início | `pages/Notificacoes.jsx`, `naoLidas.js` |

**Testado no browser (375 px, `/admin?preview`, respostas simuladas, nada gravado):**
- **Início:** o pedido aparece, e aprovar envia `admin_weekly_decide(s1, true)`. Depois mostra "semanal aprovada (terças às 10:00). Marcadas: ter 15/12, ter 22/12 · Não marcadas: ter 01/12 (feriado), ter 08/12 (feriado)" e o pedido sai da lista.
- **Ficha, parar:** "3 marcações futuras canceladas", e a série passa para "Anteriores".
- **Ficha, nova:** envia `admin_weekly_create(c1, Barba, 2026-11-27T15:00)` e mostra "Marcadas: sex 27/11, sex 04/12, sex 11/12, sex 18/12".
- Build OK. Na consola só aparecem os 401 esperados (a pré-visualização não tem sessão, e a base de dados recusa).

### Teste real (falta)

O Gabriel já não é administrador, por isso o teste completo é com o **Matheus**:
1. No painel, ligar **"Habitual"** num cliente de teste, com um número a que se tenha acesso.
2. Na página pública: "Tenho cadastro", depois marcar, ligar "Repetir todas as semanas" e confirmar.
3. O Matheus recebe a notificação "Pedido de marcação semanal". Aprova no Início e confirma as 🔁 na agenda nas semanas seguintes.
4. Parar a série na ficha. As marcações futuras dela ficam canceladas.
5. Apagar os dados do teste (como na 8.3, com o SQL mostrado antes).

### S.1 — Motor no servidor ✅

Migration `20261119120000_weekly_series.sql`, com o SQL mostrado antes e ensaiado numa transação desfeita.

**Peças novas:**
- tabela `weekly_series`, só de leitura para o administrador;
- coluna `appointments.series_id` e origem nova `weekly`;
- três tipos de notificação: `weekly_request`, `weekly_skipped` e `weekly_stopped`;
- funções `request_weekly` (pública), `admin_weekly_decide`, `admin_weekly_create` e `admin_weekly_stop`;
- gerador `weekly_series_generate`, por cron todos os dias às 03:45;
- trigger que para a série quando o cliente deixa de ser habitual ou é bloqueado;
- `booking_summary` passa a incluir `weekly`, e `create_booking` aplica a D6.

**Decisões menores:**
- **Preço:** cada semana usa o preço de habitual do dia em que é gerada.
- **Nota:** as semanas copiam a nota da 1.ª marcação (por exemplo, o corte).
- **Duração:** é a do serviço no dia em que a semana é gerada.
- **Séries por cliente:** podem ser várias, desde que noutro dia ou hora.
- **Cada semana é tratada uma só vez:** fica marcada ou salta com aviso, sem repetir avisos.

**Testes no servidor (desfeitos no fim, confirmado que não ficou nada):**
1. O habitual marca online e pede a série: fica pendente, com 1 notificação de pedido.
2. Um pedido repetido não cria uma 2.ª série.
3. O visitante recebe `NOT_REGULAR`.
4. O link pessoal mostra a série pendente.
5. Aprovar cria a semana seguinte com origem `weekly`, preço de habitual e a nota "Corte: Mid Fade" copiada. A semana com bloqueio salta com o motivo "bloqueio ou férias".
6. Correr o gerador outra vez não cria nada. Correr 7 dias depois cria +1 semana.
7. D6: com a série ativa, consegue fazer outra marcação online.
8. Criar no painel numa terça: a 1.ª e a 2.ª semana (01/12 e 08/12) saltam por **feriado** e a 15/12 fica marcada. Uma série duplicada é recusada.
9. Tirar "Habitual" para as 2 séries, cancela as marcações futuras delas e gera 2 avisos. A 1.ª marcação, que não é da série, continua.
10. Parar uma série já parada é recusado.
11. Recusar um pedido funciona.
12. Sem ser administrador, "Sem permissão".
13. Permissões: o anónimo só executa `request_weekly`, e ninguém executa o gerador por fora. O cron está ativo às 03:45.

### S.2 — Página pública ✅

| Peça | Ficheiro |
|---|---|
| `pedirSemanal(código)`, `diaSemanaPlural()`, mensagens `NOT_REGULAR` / `WEEKLY_NOT_ALLOWED` | `src/public/publicApi.js` |
| Caixa **"Repetir todas as semanas"** no passo 5 (só com preço de habitual): "Segundas às 09:00. Esta marcação fica já confirmada; as próximas semanas ficam marcadas quando o barbeiro aprovar." · depois de a marcação ficar feita, envia o pedido · aviso no ecrã final (pedido enviado / já tem série / erro, com "a marcação ficou feita na mesma") | `src/public/Marcar.jsx` |
| Link pessoal: "🔁 Semanal: quartas às 10:00 · à espera do barbeiro / ativa" e, se ativa, "Para faltar a uma semana ou deixar a marcação semanal, fale com o barbeiro." | `src/public/LinkPessoal.jsx` |

**Testado no browser (375 px, respostas do servidor simuladas, nada gravado):**
- **Habitual:** a caixa aparece com o dia e a hora certos. Ao confirmar, sai `create_booking` (com a nota "Corte: Low Fade") e **depois** `request_weekly` com o código da marcação. O ecrã final mostra "Pedido de marcação semanal enviado".
- **Link pessoal:** mostra os estados pendente, ativa e sem série.
- Sem erros na consola e o build está OK.

**Regra:** a caixa só aparece a quem tem preço de habitual. O servidor volta a confirmar que o cliente é habitual (`NOT_REGULAR`).

## O pedido

> Um cliente que já é habitual pode deixar marcado **todas as semanas, indefinidamente, no mesmo dia e à mesma hora**. Na confirmação aparece uma caixa com essa opção, e a repetição só fica ativa quando o **Matheus aprovar**.

## Como funcionaria (recomendação)

1. **Cliente.** No passo 5 ("Confirme a marcação") aparece a caixa **"Repetir todas as semanas: terças às 10:00"**:
   - só aparece se o servidor disser que o número é de um **cliente habitual**;
   - a marcação desse dia fica **confirmada na hora**, como hoje;
   - a repetição fica como **pedido pendente** e o ecrã final diz: "O pedido de marcação semanal foi enviado ao barbeiro."
2. **Matheus.** Recebe uma notificação: "Pedido semanal: João Silva, terças às 10:00 (Cabelo)". No painel pode **Aprovar** ou **Recusar**, a partir da notificação, da página Início ou da ficha do cliente.
3. **Depois de aprovado.** O sistema cria as marcações das **próximas 4 semanas**. Uma tarefa diária mantém sempre 4 semanas à frente, sem fim, até alguém parar a série. São marcações normais:
   - aparecem na agenda com o sinal 🔁;
   - têm lembrete de 5 minutos e entram no resumo do dia;
   - o preço é o de habitual no dia em que são criadas.
4. **Semana impossível** (feriado, dia fechado, bloqueio/férias ou hora já ocupada): essa semana **salta** e o Matheus recebe um aviso, por exemplo "Semana de 08/12 não marcada (feriado)". A série continua nas semanas seguintes.
5. **Faltar uma semana ou parar.** O cliente fala com o Matheus pelo WhatsApp. O link pessoal da 1.ª marcação mostra a série e tem esse botão. O Matheus cancela essa semana na agenda, como qualquer marcação, ou carrega em **"Parar marcação semanal"** na ficha do cliente. Parar cancela as marcações futuras da série.
6. **Paragem automática:** se o cliente deixar de ser habitual ou for bloqueado, a série para e as marcações futuras são canceladas, com aviso ao Matheus.
7. **Pelo painel:** o Matheus também pode **criar uma série diretamente** na ficha de um cliente habitual, para os clientes que marcam por WhatsApp. Neste caso não há pedido, porque é ele que cria.

## Decisões a validar

| # | Questão | Recomendação | Alternativa |
|---|---|---|---|
| D1 | Quantas semanas ficam marcadas à frente | **4 semanas** (≈ o limite de 30 dias da página pública) | 2 ou 8 semanas |
| D2 | Semana impossível | **Salta e avisa o Matheus** | Propor outra hora ao cliente (precisa de contacto por SMS/WhatsApp automático, que não existe) |
| D3 | Cliente faltar uma semana / parar | **Pelo WhatsApp → Matheus cancela no painel** | O cliente cancela sozinho pelo link (cada semana precisaria de um link próprio, e o cliente não o recebe porque não há SMS) |
| D4 | O Matheus cria séries no painel | **Sim** | Só a pedido do cliente |
| D5 | Faltas numa série | **Só o aviso normal de faltas** (o cliente fica sinalizado) | Parar a série automaticamente após 2 faltas |
| D6 | Limite de **2 marcações futuras por telemóvel** (RN-10) | As marcações da série **não contam** (senão a série ocupava o limite todo) | — |

**Antes da aprovação, as semanas seguintes não ficam reservadas.** Se o Matheus demorar a aprovar e alguém marcar aquela hora numa das próximas semanas, essa semana salta, como em D2.

## Contradições com o que já está decidido

- **RN-10 / Especificação 2.1:** o limite de 2 marcações futuras passa a ter a exceção D6.
- **Especificação "Fora da v1":** as marcações recorrentes não estavam lá, mas também não estavam previstas. Fica registado como **alteração de 2026-11-19**.
- **Lançamento:** esta funcionalidade atrasa a 8.4–8.6. Em alternativa, lança-se primeiro e junta-se depois. Ver a pergunta ao Gabriel.

## Subetapas propostas

| # | Subetapa | O que inclui |
|---|---|---|
| S.1 | **Motor no servidor** (migration, SQL mostrado antes) | Tabela `weekly_series`, com o cliente, o serviço, o dia, a hora, o estado (pendente / ativa / recusada / parada) e a 1.ª marcação · ligação `appointments.series_id` · funções: pedir (pública, só para habituais, com limite de pedidos), aprovar / recusar / parar / criar (administrador) · gerador diário com as 4 semanas, as regras de disponibilidade de sempre e o "salta e avisa" · paragem automática (deixa de ser habitual ou é bloqueado) · notificações novas (pedido semanal, semana saltada) · exceção RN-10 · testes SQL desfeitos no fim |
| S.2 | **Página pública** | Caixa no passo 5 (só para habituais) · texto no ecrã final · série no link pessoal com o botão do WhatsApp |
| S.3 | **Painel** | Pedidos pendentes no Início, com Aprovar e Recusar · secção "Marcação semanal" na ficha do cliente (ver, criar, parar) · 🔁 na agenda e no detalhe da marcação · a notificação abre o pedido |
| S.4 | **Documentação e testes** | Especificação (alteração de 2026-11-19), política de privacidade (sem mudanças de dados, só confirmar) · testes no browser · o Gabriel testa |
