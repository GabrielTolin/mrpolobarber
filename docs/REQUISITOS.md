# MR Polo Barber — Documento de Requisitos

**Etapa 1 — Levantamento e requisitos** · Versão 1.2 **validada** · 2026-11-09 (revisões de 2026-11-10: v1.1 decisões da 2.2; v1.2 alinhamento final com a Especificação Funcional, 2.15)

Este documento é a referência do projeto durante todo o desenvolvimento. Os valores entre `[ ]` são placeholders a substituir.

---

## 1. Descrição do negócio

| Item | Definição |
|---|---|
| Cliente | Barbeiro individual, **MR Polo Barber** |
| Localização | `[MORADA]`, **Albufeira** |
| Contacto / WhatsApp | `[WHATSAPP]` |
| Tipo de projeto | Sistema personalizado para um barbeiro (projeto piloto). Pensar em escalar só depois de validado |
| Profissionais | Um barbeiro |
| Local de atendimento | Exclusivamente na barbearia |
| Situação atual | Marcações por WhatsApp e agenda manual |
| Clientes | Habituais/locais (residentes da zona e clientes regulares) e visitantes (turistas e clientes não habituais), com preços diferentes |
| Dispositivo do barbeiro | iPhone com iOS recente |
| Endereço | Subdomínio Vercel, ex.: `mrpolobarber.vercel.app` (conta Vercel do Gabriel) |

**Objetivo:** permitir que os clientes marquem sozinhos através de um link público, sem conta, e dar ao barbeiro uma agenda própria no telemóvel (PWA) com notificações. O WhatsApp passa a ser só um canal secundário.

---

## 2. Requisitos funcionais

### Área pública (cliente, sem conta)
- **RF-01** Escolher um serviço da lista (nome, descrição e duração, **sem preço**).
- **RF-02** Escolher data e hora entre os horários livres onde o serviço cabe inteiro (grelha de 15 min + encaixe).
- **RF-03** Indicar nome, telemóvel (com indicativo) e observações opcionais, com opção "Lembrar neste dispositivo" (v1.2).
- **RF-04** Ver o **preço calculado pelo telemóvel** (habitual ou visitante) e confirmar a marcação.
- **RF-05** Receber no ecrã final um **link pessoal** para gerir a marcação e um botão **"Adicionar ao calendário"** (.ics).
- **RF-06** Cancelar a marcação pelo link pessoal, dentro do prazo.
- **RF-07** Ver o aviso de privacidade com link para a política de privacidade.
- **RF-08** Botão "Contacte o barbeiro" (WhatsApp) quando não é possível marcar ou cancelar online.
- **RF-09** Ver "As suas próximas marcações" feitas nesse dispositivo, com acesso ao cancelamento (v1.2).

### Painel do barbeiro (PWA, com login)
- **RF-10** Login (Supabase Auth, só para o barbeiro).
- **RF-11** Agenda (dia/semana) com marcações e bloqueios.
- **RF-12** Criar marcação manual com cliente existente ou novo, com origem (WhatsApp/Telefone/Presencial).
- **RF-13** Alterar e cancelar marcações conforme o estado (2.6), incluindo o "Cancelamento tardio".
- **RF-14** Registar uma **Falta** manualmente, só durante a marcação (do início + tolerância até ao fim). A passagem a Em andamento e a Concluída é **automática** (v1.1).
- **RF-15** Ajustar o preço de uma marcação.
- **RF-16** Criar bloqueios (horas, dia inteiro, vários dias para férias).
- **RF-17** Fichas de cliente: dados, interruptor **Habitual/local**, histórico, faltas, **bloquear marcação online**.
- **RF-18** Gerir serviços (nome, preços habitual/visitante, duração, ativo).
- **RF-19** Gerir horário semanal, feriados e todas as configurações de regras.
- **RF-20** Botão "Avisar por WhatsApp" numa marcação (mensagem pré-escrita).
- **RF-21** Notificações: push, sino com não lidas e badge no ícone.
- **RF-22** Instalar como PWA no ecrã principal do iPhone.

---

## 3. Regras de negócio

| ID | Regra |
|---|---|
| RN-01 | **Marcações online nunca se sobrepõem** a marcações ou bloqueios ativos, o que é garantido na base de dados. **O barbeiro pode criar sobreposições manuais intencionais**, sempre depois de um aviso de conflito que tem de confirmar (v1.1) |
| RN-02 | O serviço tem de caber inteiro no horário: não atravessa a pausa de almoço nem passa do fecho |
| RN-03 | Não se pode marcar em **feriados** nem em dias/horas bloqueados |
| RN-04 | O preço **habitual** só se aplica a telemóveis registados como habituais pelo barbeiro. Os restantes pagam o preço **visitante** |
| RN-05 | O preço é fixado no momento da confirmação e guardado na marcação. Alterações de preço futuras não afetam marcações existentes |
| RN-06 | O telemóvel é guardado normalizado (E.164) e identifica o cliente. A página pública nunca mostra dados de clientes |
| RN-07 | Marcações manuais podem ignorar a antecedência mínima, o limite de dias e o horário de funcionamento (com aviso), e podem sobrepor-se a outras com aviso e confirmação (RN-01) |
| RN-08 | Os valores das regras são configuráveis no painel (ver secção 6) |
| RN-09 | O estado da marcação avança **automaticamente**: Confirmada → Em andamento (na hora de início) → Concluída (na hora de fim). **Falta** só pelo barbeiro, manualmente, e é o que conta no registo do cliente (v1.1) |
| RN-10 | No máximo **2 marcações futuras ativas por telemóvel** nas marcações online (configurável) (v1.2) |
| RN-11 | O nome escrito numa marcação online **não altera a ficha** de um cliente existente (v1.2) |

---

## 4. Serviços, preços e durações

Preços **fixos**, editáveis no painel. Preço de visitante igual ao habitual até haver valores próprios.

| Serviço | Preço habitual | Preço visitante | Duração |
|---|---|---|---|
| Cabelo e barba | 20 € | 20 € *(provisório)* | 45 min |
| Corte de cabelo na tesoura | 20 € | 20 € *(provisório)* | 50 min |
| Corte de cabelo com máquina | 17 € | 17 € *(provisório)* | 35 min |
| Barba | 9 € | 9 € *(provisório)* | 25 min |
| Corte de criança | 10 € | 10 € *(provisório)* | 35 min |

- **Combinações:** são pacotes como serviços próprios (ex.: "Cabelo e barba"). Na v1 há 1 serviço por marcação. O modelo de dados permite mais de 1 no futuro (marcação ↔ serviços N:N).

---

## 5. Horários e disponibilidade

| Dia | Abertura | Fecho | Pausa |
|---|---|---|---|
| Segunda a sexta | 09:00 | 19:00 | Almoço 13:00–14:00 |
| Sábado | 09:00 | 13:00 | — |
| Domingo | Fechado | | |

- Horário **fixo** semanal, editável no painel.
- **Feriados:** fechado. O sistema traz os feriados nacionais de Portugal (incluindo os móveis) e o **feriado municipal de Albufeira (20 de agosto)**. O barbeiro pode acrescentar ou retirar dias (ex.: Carnaval).
- **Férias, folgas e ausências:** através de bloqueios.

---

## 6. Regras de marcação e cancelamento

### Marcação (valores iniciais, todos configuráveis)

| Regra | Valor |
|---|---|
| Marcar para o próprio dia | Sim |
| Antecedência mínima | 2 horas |
| Máximo de dias no futuro | 30 dias |
| Intervalo dos horários mostrados | 15 min + **encaixe** no fim de cada marcação/bloqueio (v1.1, 2.4) |
| Serviços por marcação | 1 |
| Intervalo entre marcações | 0 min |

Se dois clientes tentarem o mesmo horário ao mesmo tempo, só o primeiro fica com ele. O segundo recebe "Esse horário acabou de ser ocupado, escolha outro".

### Cancelamento e alteração

| Questão | Regra |
|---|---|
| O cliente cancela sozinho | Sim, pelo link pessoal, até **2 h antes** (configurável) |
| O cliente altera data/hora | Não na v1: cancela e marca de novo |
| Depois do prazo | A página mostra "Contacte o barbeiro" (WhatsApp) |
| O barbeiro | Cancela ou altera sem limite de antecedência, conforme o estado da marcação (2.6) |
| Aviso ao cliente | Sem avisos automáticos. Botão "Avisar por WhatsApp" no painel |

### Atrasos e faltas

| Situação | Regra |
|---|---|
| Atraso | Tolerância de **10 min** (configurável). Depois disso, o barbeiro decide se atende ou marca falta |
| Não aparece | Fica registado como **Falta** no histórico |
| Avisa depois do prazo | **Cancelamento tardio**: fica registado, **não conta como falta** |
| Chega cedo | O barbeiro atende se estiver livre. O sistema não interfere |
| Faltas repetidas | À **2.ª falta** (configurável) o cliente fica sinalizado ⚠️, com aviso quando volta a marcar. Sem bloqueio automático: o barbeiro pode bloquear o número de marcar online |

**Estados de uma marcação (5):** Confirmada · Em andamento · Concluída · Cancelada · Falta. Os três primeiros avançam automaticamente com o tempo (RN-09). O cancelamento guarda **quem cancelou** (cliente/barbeiro) e se foi **tardio** (v1.2, ver 2.3).

---

## 7. Dados dos clientes

| Campo | Online | Manual |
|---|---|---|
| Nome | Obrigatório | Obrigatório |
| Telemóvel (indicativo por defeito +351, E.164) | Obrigatório | Opcional |
| Observações (até 200 caracteres) | Opcional | Opcional |
| Email | Não se pede | Não se pede |
| Categoria (Habitual/Visitante) | Automática pelo telemóvel | Definida pelo barbeiro na ficha |

**Ficha do cliente (só no painel):** nome, telemóvel, habitual (sim/não), bloqueado online (sim/não), notas do barbeiro, histórico de marcações, nº de faltas e cancelamentos tardios.

**RGPD:**
- Responsável pelo tratamento: `[NOME_RESPONSAVEL]`, NIF `[NIF]`, `[MORADA]`.
- Recolha mínima: só os campos acima.
- Aviso curto no formulário com link para a política de privacidade.
- Prazo de conservação de clientes inativos: `[PRAZO]` (proposta: 2 anos).

---

## 8. Funcionamento administrativo

- **Um único utilizador** com acesso ao painel: o barbeiro.
- **Origem da marcação** guardada sempre: Online · WhatsApp · Telefone · Presencial.
- **Bloqueios:** marcação sem cliente, com motivo opcional, de horas ou de dias inteiros.
- **Exceções do barbeiro:** ignora a antecedência e o limite de dias, pode marcar fora do horário (com aviso) e pode **sobrepor marcações** depois de um aviso de conflito que tem de confirmar (v1.1).
- **Horário excecional de um dia:** o barbeiro pode alterar o horário de um dia concreto sem mexer no horário semanal (v1.1).
- **Configurações no painel:** serviços e preços, horário semanal, feriados e todas as regras da secção 6, além das notificações.

---

## 9. Notificações

Notificações **apenas para o barbeiro**.

| Evento | Push | Por defeito |
|---|---|---|
| Nova marcação online | Sim | Ligado |
| Cancelamento pelo cliente | Sim | Ligado |
| Resumo do dia | Sim | Ligado, 08:00 |
| Lembrete antes de cada marcação | Sim | Desligado |
| Marcação de cliente sinalizado ⚠️ | Incluído na notificação de nova marcação | Ligado |
| Ações do próprio barbeiro (criar, alterar, cancelar) | Não, ficam no histórico da marcação | — |

- No painel: **sino** com contador de não lidas e lista. **Badge** no ícone do PWA.
- iPhone: exige o PWA **instalado no ecrã principal**. Funciona só em HTTPS (Vercel).
- O push não é garantido. **O painel é a fonte de verdade.**
- Arquitetura prevista: Web Push (VAPID) → Edge Function disparada por trigger ou webhook na BD. Resumo diário por `pg_cron`.

---

## 10. Dúvidas e decisões pendentes

| # | Pendente | Quem | Bloqueia? |
|---|---|---|---|
| P-01 | Preços para visitantes | Gabriel / barbeiro | Não (usa o habitual) |
| P-02 | Morada, link do mapa e número de WhatsApp da barbearia | Gabriel | Não (placeholder). Sim para o lançamento |
| P-03 | Dados do responsável RGPD (nome, NIF) e prazo de conservação | Gabriel | Não para desenvolver. **Sim para o lançamento** |
| P-04 | Política de privacidade (texto) | Gabriel + Claude | Sim para o lançamento |
| P-05 | Confirmar se fecha no Carnaval | Barbeiro | Não (editável no painel) |
| P-06 | Domínio próprio | Futuro | Não |
| P-07 | Integração com Google Calendar | Futuro | Não |
| P-08 | Alteração de marcação pelo cliente | Futuro (v2) | Não |
| P-09 | Avisos ao cliente (email/SMS/WhatsApp automático) | Futuro | Não |
| P-10 | Confirmação por SMS do número do cliente | Futuro | Não |
| P-11 | Recuperação de palavra-passe por email | Futuro | Não |

---

## Validação

- [x] Gabriel revê e valida este documento (2026-11-09)
- [x] Etapa 1 fechada → avançar para a Etapa 2
