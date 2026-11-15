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
| Foto principal em maior resolução (opcional) | 6.0 | Matheus |

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

## 8.0 — Dados da barbearia 🔶 *(no painel, pelo Matheus/Gabriel)*

Tudo isto se faz em **Configurações → Barbearia** (e Horários), sem programação:
| O quê | Onde | Estado |
|---|---|---|
| Nome: **Mr. Polo Barber Shop** (hoje "MR Polo Barber" — aparece no rodapé, no calendário `.ics` e na privacidade) | Configurações → Barbearia | ⏳ |
| Morada escrita | Configurações → Barbearia | ⏳ |
| WhatsApp do barbeiro (faz aparecer os botões "Falar com o barbeiro") | Configurações → Barbearia | ⏳ |
| Link do mapa | Configurações → Barbearia | ✅ (gravado a 2026-11-15) |
| Sábado (hoje 09:00–13:00) e Carnaval | Horários | ⏳ confirmar |
| Preços de visitante · clientes "Habitual" | Serviços e preços · Clientes | ⏳ (Matheus) |

---

## 8.1 — RGPD 🔶 *(anonimização feita em 2026-11-15; faltam os dados do responsável)*

**Prazo de conservação: 2 anos sem marcações** (decisão do Gabriel, 2026-11-15).

Migration `20261115200000_anonymize_inactive.sql` (SQL mostrado e aprovado antes):
- `clients.anonymized_at` · regra `clients_check` passa a aceitar cliente online sem telemóvel **se anonimizado**.
- `anonymize_inactive_clients()` — **tarefa diária às 03:30**: clientes criados há mais de 2 anos e **sem marcações nos últimos 2 anos (nem futuras)** → ficha: "Cliente anonimizado", sem telemóvel, notas, habitual e bloqueio · marcações: nome "Cliente anonimizado", sem observações · histórico: apaga valores antigos/novos de nome e observações e as notas internas · junta a nota "Dados do cliente anonimizados (RGPD)". As marcações ficam para estatística.
- Proteções mantidas: `appointments_guard` e o novo `appointment_events_guard` só deixam passar a anonimização (`app.anonimizar = on`) e **só nesses campos**; apagar histórico continua proibido.

**Testes (desfeitos no fim):** ✅ cliente antigo anonimizado na ficha, marcação e histórico — o nome e as observações **não ficam em lado nenhum** · ✅ cliente com marcação há 1 ano intacto · ✅ 2.ª volta = 0 · ✅ anonimização a tentar mudar o preço → recusada · ✅ editar/apagar histórico fora da anonimização → recusado · ✅ cron `30 3 * * *` · ✅ bateria da 7.1 repetida sem diferenças (sem regressões).

**Política de privacidade:** o prazo passou a "**2 anos**" (marcador retirado).

**Ainda faltam (P-03):** nome do responsável · NIF · morada · contacto para privacidade · data da política. Quando chegarem, preencho os marcadores de `/privacidade`.
