# MR Polo Barber — Painel do barbeiro

**Etapa 5 — Desenvolvimento do painel administrativo** · **Validada** a 2026-11-13

Construir o PWA do barbeiro: autenticação, dashboard, agenda, clientes, serviços, horários e configurações. Segue a [Especificação](ESPECIFICACAO.md) e a [Arquitetura](ARQUITETURA.md).

**Regra do design (decisão de 2026-11-12):** o **visual** vem do handoff do Claude Design (`design/handoff-painel-inicio/`); o **conteúdo** (estados, serviços, pendências, ações) vem dos documentos validados. Os dados do design são exemplos.

**Plano validado a 2026-11-12.** As notificações (página, push, Edge Function) ficam numa etapa própria (opção A).

| Subetapa | Tema | Estado |
|---|---|---|
| 5.0 | Sistema visual (design) | ✅ Validado |
| 5.1 | Base de dados do núcleo | ✅ Validado |
| 5.2 | Autenticação (mudar palavra-passe) | ✅ Testado pelo Gabriel e validado |
| 5.3 | Serviços e preços | ✅ Testado pelo Gabriel e validado |
| 5.4 | Horários e bloqueios | ✅ Testado pelo Gabriel e validado |
| 5.5 | Configurações | ✅ Testado pelo Gabriel e validado |
| 5.6 | Clientes | ✅ Testado pelo Gabriel e validado |
| 5.7 | Motor da agenda (backend) | ✅ Validado |
| 5.8 | Agenda | ✅ Testado pelo Gabriel e validado |
| 5.9 | Estados automáticos | ✅ Aplicada, testada e a correr |
| 5.10 | Dashboard (Início com dados reais) | ✅ Testado pelo Gabriel e validado |
| 5.11 | Testes e validação | ✅ Validado |

---

## 5.0 — Sistema visual ✅

### Ficheiros do design
| Ficheiro | O que é |
|---|---|
| `design/handoff-painel-inicio/` | Handoff do Claude Design: `README.md` (tokens e componentes), `painel-inicio.html` (referência), `assets/logo.jpg` |
| `design/logo-original.jpg` | Logótipo do cliente (595×841, fundo preto). Era o `barber.jpg` da raiz do projeto |
| `design/App de barbeiro_ painel inicial.zip` | Zip original (vazio, ignorado pelo Git) |
| `public/brand-logo.webp` | Logótipo **recortado** (mesmo recorte do handoff), 360 px, 22 kB. Usado no menu, login e página pública |
| `public/icon-source.png` | Logótipo recortado num quadrado preto, origem dos ícones do PWA (`npm run icons`). Fora da cache do PWA |

### Tokens (em `src/index.css`, `@theme`)
| Grupo | Valores |
|---|---|
| Superfícies | `bg` #0D0C0A · `sidebar` #000 · `hover` #15130F |
| Texto | `fg` #EDE6D6 · `muted` #A89F8E · `muted-2` #7A7262 · `price` #CFC6B4 |
| Dourado | `gold` #E3B955 · `gold-2` #D9AE4A · `on-gold` #120F08 · gradiente do botão #E8C45A → #C29434 |
| Bordas | `line` #2A251C · `line-sidebar` #211D16 · `line-soft` #1F1B15 · `line-btn` #3A3326 · `line-gold` #6B5426 |
| Estados | `ok` #9CC59A (confirmada) · `warn` #E58B6D (avisos/erros) |
| Poste | vermelho #C8322B · branco #F1EEE8 · azul #2557C7 |
| Tipos de letra | **Cormorant Garamond** 500/600 (títulos, números) · **Manrope** variável (texto) — **servidos pelo próprio site** (`@fontsource`), sem pedidos à Google |

### Componentes base (classes em `index.css`)
`.eyebrow` · `.card` · `.card-gold` · `.card-title` · `.btn-primary` · `.btn-gold` · `.btn-ghost` · `.field` · `.pole` (divisória do barbeiro, **só no Início**).

### Aplicado
| Ecrã/peça | Como ficou |
|---|---|
| Menu lateral (≥ 1024 px) | 248 px, preto, logótipo, ícones Lucide 18 px/1.8, item ativo dourado, "Terminar sessão" em baixo |
| Barra inferior (telemóvel/tablet) | Preta, item ativo dourado, menu "Mais" (respeita a zona segura do iPhone) |
| Cabeçalho das páginas | `CabecalhoPagina`: eyebrow + título em serifa (48 px no computador) + ações à direita |
| **Início** | Estrutura do design: data, **"Bom dia, Matheus"** (Bom dia / Boa tarde / Boa noite, hora de Lisboa), "+ Nova marcação", poste, cartões "Marcações do dia", "Próxima marcação" (dourado) e "Pendências" — **com estados vazios** até haver dados (5.10) |
| Login e "Sem acesso" | Fundo preto, logótipo, cartão escuro, botão dourado |
| Área pública | Cabeçalho com o logótipo e tema escuro (o desenho próprio vem na etapa da área pública) |
| PWA | Ícones gerados a partir do **logótipo real** · `theme_color` #000 · `background_color` #0D0C0A |

### Adaptações ao conteúdo validado (o design não sabia das decisões)
| No design | Fica assim |
|---|---|
| "Bom dia, Mr. Polo" | **"Bom dia, Matheus"**. Nome provisório no código; passa para `settings.owner_name` na 5.1 |
| Estado "Por confirmar" e contador | Não existe (confirmação automática, 2.1). Contadores do cabeçalho entram na 5.10 com os estados reais |
| Pendências "por confirmar", "reagendamento", "falta de ontem" | Pendências = notificações não lidas (2.9). Falta só durante a marcação (2.3) |
| "Enviar lembrete" | Será o botão de WhatsApp com mensagem pré-escrita (1.5) |
| Serviços do exemplo | Os 5 serviços reais (1.2) |

### Pré-visualização em desenvolvimento
Em `npm run dev`, **`/admin?preview`** mostra o painel sem login, para rever o design. **Não existe no site publicado:** confirmado que o código não entra na build de produção.

### Verificado (2026-11-12)
Computador 1440 px e telemóvel 375 px (Início, login), lint sem avisos, build OK, consola sem erros.

---

## 5.1 — Base de dados do núcleo ✅

Quatro migrations, seguindo a Arquitetura 3.2–3.8 sem decisões novas (exceto `owner_name`, já aceite):

| Migration | Conteúdo |
|---|---|
| `20261112095910_core_tables` | 8 tipos enumerados · 14 tabelas novas (`settings`, `weekly_hours`, `weekly_breaks`, `day_overrides`, `holidays`, `blocks`, `services`, `clients`, `appointments`, `appointment_services`, `appointment_events`, `notifications`, `push_subscriptions`, `rate_limits`) · chaves, FKs (RESTRICT/CASCADE/SET NULL da 3.3), únicos, CHECKs e limites das configurações (3.5) · **restrição parcial contra sobreposições** (3.6, camada 3) · índices |
| `20261112095912_core_integrity` | `updated_at` automático · **proibido apagar** marcações e `settings` · histórico só cresce · **regras de estado** (transições da 2.3, falta só na janela, finais imutáveis exceto "cancelamento tardio") · **edição por estado** (2.6) · **histórico automático** de cada alteração (2.6) |
| `20261112095914_core_rls` | RLS nas 14 tabelas · políticas `is_admin()` · marcações, bloqueios e histórico **só leitura direta** · notificações: só `read_at` · push: só os próprios dispositivos · nada para `anon` |
| `20261112095916_core_seed` | `settings` (valores validados, **owner_name = Matheus**) · horário Seg–Sex 09–19 + almoço 13–14, Sáb 09–13, Dom fechado · **os 5 serviços** · feriados **2026–2030** (nacionais, móveis pela Páscoa, 20/08 Albufeira; Carnaval desligado) com `ensure_holidays(ano)` |

**Ainda não incluído (vem nas subetapas seguintes):** funções de escrita de bloqueios (5.4), motor da agenda e funções públicas (5.7), `pg_cron` (5.9), notificações (etapa própria).

### Aplicado a 2026-11-12 ✅

As 4 migrations foram aplicadas sem erros (`db:push`). Há agora 7 migrations, iguais no projeto e no repositório. `db:lint`: sem erros.

| Verificação | Resultado |
|---|---|
| RLS | **15/15 tabelas** com RLS ativo |
| Dados iniciais | `owner_name` = Matheus · 6 dias abertos · 5 pausas de almoço · **5 serviços** · **75 feriados** (15 × 5 anos), 5 desligados (Carnaval) |
| Feriados móveis | 2026: Sexta-feira Santa 03/04, Páscoa 05/04, Corpo de Deus 04/06 · 2027: 26/03, 28/03, 27/05 ✅ (datas oficiais) |
| Permissões das funções novas | Nenhuma executável por `anon` nem `authenticated` (só `is_admin` para `authenticated`, como previsto) ✅ |
| Visitante sem sessão, 15 tabelas | **401 em todas** ✅ |
| Visitante sem sessão chama `ensure_holidays` / `easter_date` | **401** ✅ |

### Teste das regras automáticas (2026-11-12) ✅

Corrido numa transação **desfeita no fim** (a base de dados ficou igual: 0 clientes, 0 marcações, 0 eventos, 5 serviços). Script: `teste_regras_51.sql` (scratchpad do Claude).

| # | Teste | Resultado |
|---|---|---|
| 1 | Criar marcação → histórico "criada" | ✅ |
| 2 | Mudar o preço → histórico "2000 → 1800" | ✅ |
| 3 | Apagar marcação | ✅ Recusado |
| 4 | Criar marcação já "concluída" | ✅ Recusado |
| 5a | Marcação sobreposta normal | ✅ Recusada pela rede de segurança (exclusion constraint) |
| 5b | Marcação sobreposta **intencional** | ✅ Aceite |
| 6 | Falta antes da hora | ✅ Recusada |
| 7 | Cancelar → histórico de estado | ✅ |
| 8 | Alterar uma cancelada | ✅ Recusado |
| 9 | Marcar o cancelamento como tardio | ✅ Aceite (exceção prevista na 1.6) |
| 10 | Editar o histórico | ✅ Recusado |
| 11 | Apagar um serviço já usado | ✅ Recusado (FK) |

**Pormenor a melhorar na 5.7:** a mensagem de erro diz o estado em inglês ("Uma marcação **cancelled** já não pode ser alterada"). O painel vai mostrar mensagens em português, mas convém traduzir também na base de dados quando se escreverem as funções da agenda.

---

## 5.2 — Autenticação (mudar palavra-passe) ✅

O login, a sessão persistente, "Sem acesso" e terminar sessão já existiam (4.6, testados na 4.9). Faltava a regra 5 da 2.14.

| Ficheiro | O quê |
|---|---|
| `src/admin/pages/Configuracoes.jsx` | Página Configurações (sai das provisórias). Nesta fase só a secção **Conta**; o resto chega na 5.5 |
| `src/admin/pages/configuracoes/SeccaoConta.jsx` | Mostra o email da sessão · formulário **Mudar palavra-passe** (nova + repetir) |

**Comportamento:**
- Validação no ecrã: mínimo **8 caracteres** e as duas **iguais**.
- Grava com `supabase.auth.updateUser({ password })`. Não precisa de email porque o "Secure password change" está desligado (4.5).
- Mensagens em português: igual à atual, demasiado fraca, sessão expirada, erro genérico. Sucesso: "Palavra-passe alterada. Use a nova na próxima vez que entrar."
- A sessão continua ativa depois de mudar.

**Verificado (2026-11-12):** lint e build OK · ecrã no estilo do design · validação "As duas palavras-passe não são iguais." a funcionar.

**Teste do Gabriel (T-5.2):** entrar no painel → Configurações → mudar a palavra-passe → terminar sessão → entrar com a **nova**. A antiga deixa de funcionar.

**Teste real do Gabriel (2026-11-12): ✅ funciona** (mudar → terminar sessão → entrar com a nova).

---

## 5.3 — Serviços e preços ✅

Segue a Especificação 2.11. Escrita direta na tabela `services` (permitida ao administrador pelo RLS da 5.1).

| Ficheiro | O quê |
|---|---|
| `src/lib/dinheiro.js` | Euros ↔ cêntimos: `formatarEuros` ("20 €", "17,50 €"), `lerEuros` (aceita "17", "17,5", "17.50 €"), `eurosParaCampo` |
| `src/admin/pages/Servicos.jsx` | Página (sai das provisórias) |
| `src/admin/pages/servicos/ServicoForm.jsx` | Formulário de criar/editar (cartão dourado) |

**O que o barbeiro pode fazer:**
| Ação | Comportamento |
|---|---|
| **+ Novo serviço** | Nome, descrição opcional, duração (5–480 min), preço habitual, preço visitante (**vazio = igual ao habitual**). Entra no fim da lista |
| **Editar** | Mesmos campos, pré-preenchidos. Aviso: "Mudar preços ou duração só vale para marcações novas" |
| **↑ ↓** | Muda a ordem dos serviços ativos (a ordem da página pública) |
| **Desativar / Reativar** | Inativos ficam no fim, esbatidos, com "Inativo" |
| **Apagar** | Pede confirmação. Se o serviço já foi usado: "já foi usado em marcações, por isso não pode ser apagado. Desative-o." (proteção da FK, 3.3) |

**Verificado (2026-11-12):**
- Conversões de euros testadas: 2000 → "20 €", 1750 → "17,50 €", "17,5" → 1750, "abc"/"-3"/"1,234" → recusados ✅
- Lint e build OK ✅
- Ecrã e formulário no estilo do design ✅
- Em `?preview` (sem sessão) a lista **não carrega**, porque o RLS bloqueia quem não é administrador. É o comportamento certo ✅

**Teste do Gabriel (T-5.3)**, com sessão iniciada:
1. Ver os 5 serviços com os preços certos.
2. Criar um serviço de teste (ex.: "Teste", 20 min, 5 €, visitante vazio) → aparece com 5 € / 5 €.
3. Editar o preço de visitante para 6,50 → mostra "6,50 €".
4. Subir/descer um serviço → a ordem muda.
5. Desativar o serviço de teste → vai para o fim, "Inativo".
6. Apagar o serviço de teste → desaparece.

**Teste T-5.3 do Gabriel (2026-11-12): ✅ tudo OK.**

---

## 5.4 — Horários e bloqueios ✅

Segue a Especificação 2.12 (com 1.3, 1.8, 2.2) e a Arquitetura 3.3 regra 4 e 3.6.

### Migration `20261112102218_admin_blocks`
| Função | O quê |
|---|---|
| `lock_agenda()` | **Fila única da agenda** (3.6, camada 1). Usada já aqui e, na 5.7, pelas marcações |
| `require_admin()` | Recusa quem não é administrador |
| `active_appointments_between(início, fim)` | Marcações ativas que se sobrepõem a um período (para os avisos) |
| `admin_save_block(...)` | Cria/altera bloqueio, folga ou férias. Horas em **hora de Lisboa**, convertidas na base de dados. **Verificar → avisar → confirmar**: sem confirmação devolve as marcações afetadas e não grava; com confirmação grava e marca-as como sobreposição intencional. **Nunca cancela nada** |
| `admin_delete_block(id)` | Remove um bloqueio (também pela fila) |

Só `admin_save_block` e `admin_delete_block` são executáveis por `authenticated` (verificam `is_admin()` lá dentro).

### Página `Horários e bloqueios`
| Secção | O que permite |
|---|---|
| **Horário semanal** | Cada dia: aberto/fechado, abertura, fecho, **várias pausas**. "Gravar horário" grava a semana inteira. Valida fecho > abertura e pausas dentro do horário |
| **Dias com horário especial** | Data + **fechado** ou **horário especial**, nota. Substitui o horário semanal nesse dia, **incluindo as pausas** (3.3) |
| **Bloqueios, folgas e férias** | **Bloqueio de horas** (data + início–fim) · **Folga** (um dia) · **Férias** (de … até, inclusive) · motivo opcional. Lista dos atuais e futuros, com remover |
| **Feriados** | Ano atual e seguinte · **ligar/desligar** cada feriado · acrescentar dias fechados próprios (só estes se apagam) |

**Marcações afetadas (2.12 regra 4):** ao gravar o horário semanal, um dia especial ou um bloqueio por cima de marcações já feitas, aparece o aviso com a **lista** (data, hora, cliente, serviço), um link **"Avisar" por WhatsApp** com mensagem pré-escrita para cada cliente e os botões **"Gravar mesmo assim"** / "Voltar". Nada é cancelado automaticamente.

### Ficheiros
`src/lib/datas.js` (ampliado: `partesLisboa`, `hojeLisboa`, `somarDias`, `diaSemanaDe`, `formatarData`, `formatarInstante`, `horaCurta`) · `src/admin/pages/Horarios.jsx` · `src/admin/pages/horarios/` (`HorarioSemanal`, `DiasEspeciais`, `Bloqueios`, `Feriados`, `AvisoAfetadas`, `afetadas.js`).

### Verificado (2026-11-12)
- Datas de Lisboa: 13/11 10:00 UTC → 10:00 (inverno) · 14/07 09:00 UTC → **10:00 (verão)** · 31/12 + 1 dia → 01/01 · domingo = 7 ✅
- Lint e build OK · layout em 2 colunas (computador) no estilo do design ✅

### Teste do Gabriel (T-5.4), depois de aplicar a migration
1. **Horário semanal:** aparece Seg–Sex 09–19 com almoço 13–14, Sáb 09–13, Dom fechado. Mudar um dia, gravar, recarregar → mantém-se. Repor como estava.
2. **Dia especial:** criar um dia fechado na próxima semana → aparece na lista → remover.
3. **Bloqueio:** criar um bloqueio de horas amanhã, uma folga e umas férias de 2 dias → aparecem com as datas certas → remover.
4. **Feriados:** desligar e voltar a ligar um feriado · acrescentar um dia próprio e removê-lo.
5. *(O aviso de marcações afetadas só pode ser testado quando houver marcações, na 5.8.)*

### Migration aplicada e testada (2026-11-12) ✅

**Permissões reais:** `admin_save_block` e `admin_delete_block` executáveis só por `authenticated` (com `is_admin()` lá dentro) · `lock_agenda`, `require_admin`, `active_appointments_between` por ninguém · visitante sem sessão → **401** nas três funções · `db:lint` sem erros.

**Teste das funções** (transação desfeita no fim, simulando o administrador; script `teste_bloqueios_54.sql`). A base de dados ficou a zero (0 bloqueios, 0 marcações, 0 clientes, 0 eventos):

| # | Teste | Resultado |
|---|---|---|
| 1 | Conta que não é admin | ✅ Recusada |
| 2 | Bloqueio por cima de uma marcação, sem confirmar | ✅ Não grava, devolve 1 marcação afetada |
| 3 | Confirmar | ✅ Grava 10:00–11:00 (Lisboa) · marcação fica sobreposição intencional · **não é cancelada** |
| 4 | Folga | ✅ Dia inteiro (00:00 → 00:00 do dia seguinte) |
| 5 | Fim antes do início | ✅ Recusado ("O fim tem de ser depois do início") |
| 6 | Apagar bloqueio | ✅ |
| 7 | Histórico da sobreposição | ✅ Registado com ator "barbeiro" |

**Teste T-5.4 do Gabriel (2026-11-12): ✅ tudo OK.**

---

## 5.5 — Configurações ✅

Segue a Especificação 2.13. Escrita direta na linha única de `settings` (RLS da 5.1). Sem migrations novas.

| Secção | O que permite |
|---|---|
| **Barbearia** | Nome da barbearia · **nome do barbeiro** (saudação do Início) · morada · WhatsApp (normalizado para +351…, aceita "912 345 678") · link do Google Maps (tem de ser https) |
| **Link de marcações** | O endereço do site, **Copiar**, **Partilhar** (menu de partilha do telemóvel; no computador copia) e **código QR** com "Descarregar QR" para imprimir. Não se edita (depende da Vercel) |
| **Regras de marcação** | Próprio dia · antecedência mínima (horas) · até X dias · grelha · intervalo · máx. por telemóvel · prazo de cancelamento (horas) · tolerância · faltas para ⚠️. **Mesmos limites da base de dados**. "Serviços por marcação: 1" só informativo (mais do que 1 é funcionalidade futura, 2.15) |
| **Notificações** | Nova marcação · cliente cancelou · resumo do dia + hora · lembrete + minutos. As escolhas ficam gravadas; o envio chega na etapa das notificações |
| **Conta** | Mudar palavra-passe (5.2) |

**Início:** a saudação passou a usar `settings.owner_name` ("Bom dia, Matheus"). Muda se o nome mudar em Configurações.

**Ficheiros:** `src/lib/telefone.js` (`normalizarTelefone`, `formatarTelefone`, `linkWhatsapp`) · `src/admin/pages/configuracoes/` (`useSettings`, `Mensagem`, `SeccaoBarbearia`, `SeccaoLink`, `SeccaoRegras`, `SeccaoNotificacoes`) · biblioteca `qrcode` (QR gerado no navegador; 0 vulnerabilidades em produção).

**Verificado (2026-11-12):**
- Telemóveis: "912 345 678", "+351 912345678", "00351912345678", "912-345-678" → `+351912345678` · fixo "212345678" → `+351212345678` · "+44 7700 900123" → `+447700900123` · "12345"/"abc" → recusados ✅
- Lint e build OK · a página abre sem erros de código (em `?preview` os dados não carregam por falta de sessão, como esperado) ✅

**Teste do Gabriel (T-5.5)**, com sessão:
1. **Barbearia:** os dados aparecem (nome MR Polo Barber, barbeiro Matheus). Pôr o **WhatsApp e a morada reais**, se já os tiver (resolve parte do P-02), e gravar.
2. Mudar o nome do barbeiro → o Início mostra o novo nome → repor "Matheus".
3. **Link:** Copiar · Partilhar (no telemóvel abre o menu) · o QR, lido com a câmara, abre o site.
4. **Regras:** mudar a tolerância para 15 e gravar → recarregar e confirmar → repor 10. Pôr 100 → aparece o erro do limite.
5. **Notificações:** desligar e voltar a ligar uma opção e gravar.

**Teste T-5.5 do Gabriel (2026-11-12): ✅ tudo OK.**

---

## 5.6 — Clientes ✅

Segue a Especificação 2.2, 2.10 e os Requisitos 1.6–1.8. Escrita direta na tabela `clients` (RLS da 5.1). Sem migrations novas.

### Lista (`/admin/clientes`)
- **Pesquisa** por nome ou por telemóvel (a partir de 3 dígitos).
- Cada cliente: nome, telemóvel, nº de visitas, etiquetas **Habitual** e **Bloqueado**, e **⚠️** quando as faltas chegam ao limite das Configurações (2 por defeito).
- **+ Novo cliente:** só o nome é obrigatório; telemóvel opcional (normalizado para +351…); interruptor Habitual. Se o telemóvel já existir: **"Este número já pertence a [nome]."** (2.10). Ao criar, abre a ficha.

### Ficha (`/admin/clientes/:id`)
| Bloco | Conteúdo |
|---|---|
| Dados | Telemóvel · **Habitual / local** ou Visitante · Bloqueado online · ⚠️ faltas · botão **WhatsApp** · **Editar** (nome, telemóvel, habitual) |
| Números | Visitas (concluídas) · **faltas** · **cancelamentos tardios** — calculados das marcações (3.2) · última visita · cliente desde |
| Notas internas | Texto livre, só o barbeiro vê |
| Marcação online | **Bloquear / Desbloquear** (com confirmação). Bloqueado → a página pública pede para contactar por WhatsApp (2.1) |
| Histórico | Todas as marcações, mais recentes primeiro: data/hora, serviço, origem, preço e **estado** ("Concluída", "Falta", "Cancelada pelo cliente", "Cancelamento tardio"…) |
| Apagar | Só aparece se o cliente **nunca teve marcações** (FK, 3.3) |

### Estados (`src/lib/estados.js`)
`estadoEfetivo()` mostra o estado **pela hora** (3.8): uma marcação confirmada que já começou aparece "Em curso", mesmo antes de o cron correr. Também `descreverEstado()` (com o detalhe do cancelamento, 2.3), cores do design e `ORIGENS`.

**Verificado (2026-11-12):** estados efetivos antes/durante/depois, falta e cancelamentos ✅ · lint e build OK ✅ · as duas páginas abrem sem erros de código (sem dados em `?preview`, como esperado) ✅

**Teste do Gabriel (T-5.6)**, com sessão:
1. **Novo cliente** "Teste Um" com o teu telemóvel e Habitual ligado → abre a ficha com "Habitual / local".
2. **Novo cliente** "Teste Dois" com **o mesmo telemóvel** → "Este número já pertence a Teste Um."
3. Criar "Teste Dois" **sem telemóvel** → aceita.
4. Na lista, **pesquisar** por "teste" e por 3 dígitos do telemóvel.
5. Na ficha do Teste Um: **editar** (desligar Habitual) · gravar **notas** · **Bloquear** e Desbloquear · o botão **WhatsApp** abre a conversa.
6. **Apagar** os dois clientes de teste (sem marcações, aparece "Apagar cliente").

**Teste T-5.6 do Gabriel (2026-11-12): ✅ tudo OK.**

---

## 5.7 — Motor da agenda (backend) ✅

Migration `20261112105011_agenda_engine`, segundo a Arquitetura 3.6 e a Especificação 2.2–2.6. **Só backend**: o ecrã da Agenda é a 5.8.

| Parte | Funções |
|---|---|
| **Mensagens em português** (pendente da 5.1) | `status_label()` · `appointments_guard()` reescrita: "Uma marcação **cancelada** já não pode ser alterada", "Não é possível passar de … para …" |
| **Cálculo de horários** (2.4) | `day_windows(data)`: janelas de trabalho (feriado → nenhuma; dia especial substitui tudo; senão semana − pausas) · `busy_between()`: marcações ativas + bloqueios + intervalo · **`available_slots(serviço, data)`**: grelha + encaixe, cabe inteiro, antecedência, limite de dias · `within_working_hours()` |
| **Marcações do painel** | **`admin_save_booking`**: criar/editar com **avisos** (fora do horário, conflitos com marcações e bloqueios); com confirmação grava e marca a sobreposição como intencional; preço sugerido pela categoria do cliente (habitual/visitante) ou indicado à mão; editar mantém a duração e o preço se o serviço não mudar · **`admin_cancel_booking`** (com opção tardio) · **`admin_set_cancelled_late`** · **`admin_mark_no_show`** · **`admin_add_note`** |
| Auxiliares | `conflicts_between()` |

Tudo passa pela **fila da agenda** e verifica `is_admin()`. Executáveis por `authenticated`: as 5 funções `admin_*` e `available_slots`. **O público ainda não tem acesso**: as funções públicas (`create_booking`, link pessoal, preço, limites de pedidos) ficam para a área pública.

**Teste preparado** (`teste_motor_57.sql`, transação desfeita no fim), 13 verificações: não-admin recusado · horários de um dia vazio (09:00 … 12:30, sem 12:45, 14:00 … 18:30) · marcação sem avisos com preço de visitante · **encaixe 09:35** · conflito sem e com confirmação · fora do horário (almoço) · trocar serviço (duração, preço, histórico) · cancelamento tardio · mensagem em português · falta futura recusada · nota interna · horário libertado depois de cancelar.

### Aplicada e testada (2026-11-12) ✅

**Permissões reais:** as 5 funções `admin_*` e `available_slots` executáveis só por `authenticated` (verificam `is_admin()`) · `day_windows`, `busy_between`, `conflicts_between`, `within_working_hours`, `status_label` e o `appointments_guard` reescrito: por ninguém · **nada para `anon`** · `db:lint` sem erros.

**Teste do motor** (`teste_motor_57.sql`, transação desfeita; dia de teste 13/11/2026). A base de dados ficou a zero:

| # | Teste | Resultado |
|---|---|---|
| 0 | Conta que não é admin | ✅ Recusada |
| 1 | Horários livres de Barba num dia vazio | ✅ 09:00 … **12:30 sim, 12:45 não** (atravessaria o almoço) · 14:00 … **18:30** (último) |
| 2 | Marcação sem avisos | ✅ Grava logo · **17 € (visitante)** · fim 09:35 |
| 3 | **Encaixe** | ✅ Lista começa em **09:35**, 09:45, 10:00… |
| 4 | Conflito sem confirmar | ✅ Não grava, 1 conflito |
| 5 | Conflito confirmado | ✅ Grava como sobreposição intencional |
| 6 | Fora do horário (13:15, almoço) | ✅ Aviso, não grava |
| 7 | Trocar serviço (máquina → barba) | ✅ Fim 09:25 · 9 € · histórico do serviço |
| 8 | Cancelamento tardio | ✅ |
| 9 | Editar uma cancelada | ✅ Recusado, **"Uma marcação cancelada já não pode ser alterada"** |
| 10 | Falta numa marcação futura | ✅ Recusada |
| 11 | Nota interna | ✅ No histórico, ator barbeiro |
| 12 | Horário libertado depois de cancelar | ✅ 09:25 (encaixe), 09:30, 09:45 |

---

## 5.8 — Agenda ✅

Segue a Especificação 2.2, 2.3 e 2.6, sobre o motor da 5.7. Sem migrations novas.

### Página `/admin/agenda`
- Estado na URL: `?data=AAAA-MM-DD&vista=dia|semana` (e `?nova=1` abre logo uma nova marcação; o botão "+ Nova marcação" do Início usa-o).
- Navegação: ‹ **Hoje** › · escolher data · **Dia / Semana**. Recarrega a cada minuto.
- **Vista diária:** marcações, bloqueios e **espaços livres** por ordem de hora. Cada marcação: hora, ponto de estado, cliente, serviço · duração, preço, estado (efetivo pela hora). "Em curso" com fundo dourado; concluídas/canceladas/faltas esbatidas; **sobreposições** com contorno. Dias fechados, feriados e dias especiais mostram a nota. **Tocar num espaço livre** abre a nova marcação com o dia e a hora preenchidos.
- **Vista semanal:** 7 cartões (seg–dom) com o nº de marcações, as primeiras horas/nomes, bloqueios e dias fechados; hoje destacado. Tocar num dia abre a vista diária.

### Nova marcação / editar (`MarcacaoForm`)
1. **Cliente:** pesquisar (nome/telemóvel) ou **criar na hora** (só o nome é obrigatório; aviso de telemóvel repetido).
2. **Serviço** (ativos; ao editar mantém o atual mesmo desativado).
3. **Dia e hora** livres, com **sugestões dos horários livres** (`available_slots`) em botões.
4. **Preço** sugerido pela categoria do cliente (habitual/visitante), editável; mostra a tabela.
5. **Origem:** WhatsApp / Telefone / Presencial (online fica bloqueada).
6. Observações.
7. **Avisos** antes de gravar: "Fora do horário de funcionamento" e "Conflito com: …" → **Guardar mesmo assim** / Voltar.
8. Depois de mudar a hora de uma marcação: **"Avisar o cliente?"** com a mensagem de WhatsApp pré-escrita (2.6).

Em curso: só serviço, preço e observações (dia, hora e origem bloqueados).

### Detalhe da marcação (`DetalheMarcacao`)
Hora grande, estado (com detalhe do cancelamento), cliente (**Ver ficha**), telemóvel, categoria, serviço, preço, origem, observações. Ações por estado (2.6 opção A):
| Estado | Ações |
|---|---|
| Confirmada | Editar · **Enviar lembrete** (WhatsApp) · Cancelar (normal ou **tardio**) |
| Em curso | Editar (serviço/preço/obs) · **Registar falta** (a partir do início + tolerância) · Cancelar |
| Cancelada | Marcar / desmarcar como tardio · avisar o cliente por WhatsApp (se cancelada pelo barbeiro) |
| Todas | **Nota interna** · **Histórico** (quem, quando, antigo → novo) |

### Ficheiros
`src/admin/pages/Agenda.jsx` · `src/admin/pages/agenda/` (`agendaApi`, `VistaDia`, `VistaSemana`, `MarcacaoForm`, `DetalheMarcacao`, `EscolherCliente`) · `src/components/Modal.jsx` (folha em baixo no telemóvel, centrada no computador) · `src/hooks/useAgora.js` · `src/lib/datas.js` (+ `instanteLisboa`, `paraMinutos`, `deMinutos`).

### Verificado (2026-11-12)
- `instanteLisboa`: 13/11 09:00 → 09:00Z (inverno) · 14/07 09:00 → 08:00Z (verão) · 29/03 03:00 (dia da mudança) → 02:00Z ✅
- Lint **sem avisos** (o relógio passa a vir de `useAgora`, sem `Date` durante a renderização) · build OK ✅
- A página abre e a "Nova marcação" abre a janela de escolher cliente, sem erros de código ✅

### Teste do Gabriel (T-5.8), com sessão
1. **Agenda → hoje/amanhã:** aparecem os **espaços livres** respeitando o almoço. Tocar num → nova marcação com a hora preenchida.
2. Criar uma marcação para amanhã às 10:00 (cliente novo "Teste Agenda", Corte com máquina) → preço sugerido **17 €** → aparece na agenda.
3. Criar outra às **10:15** → aviso **"Conflito com: …"** → Guardar mesmo assim → aparece com contorno de sobreposição.
4. Criar uma às **13:15** → aviso **"Fora do horário"**.
5. Abrir a das 10:00 → **Editar** → mudar para 11:00 → aparece **"Avisar o cliente?"** com a mensagem.
6. Abrir → **Nota interna** → aparece no histórico. **Enviar lembrete** abre o WhatsApp.
7. **Cancelar** uma; **Cancelar como tardio** outra → estados certos; "Marcar como tardio" alterna.
8. **Vista semanal** mostra as marcações; tocar no dia volta à diária.
9. **Horários e bloqueios:** criar um **bloqueio** por cima da marcação que sobrou → aparece o **aviso de marcações afetadas** (o teste pendente da 5.4) → Voltar.
10. No fim: cancelar as marcações de teste. (Marcações e o cliente com marcações **não se apagam** — ficam no histórico; o cliente "Teste Agenda" pode ficar, ou limpo a base de dados no fim da Etapa 5.)

**Teste T-5.8 do Gabriel (2026-11-13): ✅ tudo OK** (incluindo o aviso de marcações afetadas que estava pendente da 5.4).

---

## 5.9 — Estados automáticos ✅

Migration `20261113083906_auto_statuses` (Arquitetura 3.8 §1 e §5):

| Peça | O quê |
|---|---|
| Extensão **`pg_cron`** | Tarefas agendadas dentro do PostgreSQL (versão 1.6.4 disponível no projeto) |
| **`advance_statuses()`** | `confirmed` → **`in_progress`** na hora de início · → **`completed`** na hora de fim (incluindo as que ficaram para trás). Histórico com ator **"Sistema"**. Ninguém a executa diretamente |
| Tarefa **`advance_statuses`** | **A cada minuto** |
| Tarefa **`ensure_holidays`** | **1 de dezembro**: garante os feriados dos 2 anos seguintes (não mexe nos que o barbeiro alterou) |

O painel já mostra o estado certo pela hora (5.6/5.8); com o cron, o estado fica também **guardado** na base de dados (histórico, contagens de visitas, filtros).

**Teste preparado** (`teste_estados_59.sql`, transação desfeita): uma marcação que já terminou → concluída · uma a decorrer → em curso · uma futura fica confirmada · uma cancelada não muda · histórico com ator "sistema" · 2.ª execução não repete nada.

**Se a extensão precisar de ser ativada no painel** (tarefa G-2 da 3.11): Database → Extensions → `pg_cron` → Enable.

### Aplicada, testada e a correr (2026-11-13) ✅

| Verificação | Resultado |
|---|---|
| Extensão | `pg_cron` **1.6.4** ativa (a migration conseguiu ativá-la; não foi preciso o painel) |
| Tarefas | `advance_statuses` `* * * * *` (ativa) · `ensure_holidays` `0 3 1 12 *` (ativa) |
| Permissões | `advance_statuses()` não executável por `anon` nem `authenticated` |
| **Execução real** | 1.ª execução às **08:42:00** (Lisboa): `succeeded` |

**Teste** (`teste_estados_59.sql`, transação desfeita):

| # | Teste | Resultado |
|---|---|---|
| 1 | Marcação que já terminou (ainda "confirmada") | ✅ → concluída |
| 2 | Marcação a decorrer | ✅ → em curso |
| 3 | Marcação futura | ✅ continua confirmada |
| 4 | Marcação cancelada | ✅ não muda |
| 5 | Histórico | ✅ ator "sistema" |
| 6 | 2.ª execução | ✅ não repete eventos |

### Correção (2026-11-13): listas (select) com opções invisíveis

**Problema reportado pelo Gabriel:** na nova marcação manual, o menu de serviços aparecia **vazio**.

**Diagnóstico:** os dados estavam certos (5 serviços ativos na base de dados). A causa é visual: os `select` tinham **fundo transparente e texto claro**; a lista que abre é desenhada pelo sistema operativo e, no Windows, fica com fundo **branco**, por isso as opções ficavam **brancas sobre branco**.

**Correção:** `select.field` e as suas `option` passam a ter fundo `bg` (#0D0C0A) e texto `fg` (#EDE6D6) em `src/index.css`. Afeta os 3 `select` do painel (serviço e origem na marcação; tipo de dia especial). Verificado no browser: fundo rgb(13,12,10), texto rgb(237,230,214).

**Ajuste pedido pelo Gabriel (2026-11-13):** as listas continuavam ilegíveis → `select.field` passa a **fundo preto (#000) e letras brancas (#fff)**, com `color-scheme: dark`, e as `option` com fundo preto e texto branco forçados (`!important`).

---

## 5.10 — Dashboard (Início com dados reais) ✅

**Motivo do card vazio reportado pelo Gabriel:** até aqui o Início era só a **estrutura** do design, com estados vazios fixos (5.0). Os dados reais eram precisamente esta subetapa. A marcação de teste dele (hoje, 15:00, Gabriel Tolin, 17 €) estava gravada corretamente.

Segue a Especificação 2.8 e o handoff do design, com o conteúdo validado:

| Bloco | Conteúdo |
|---|---|
| Cabeçalho | Data · "Bom dia/Boa tarde/Boa noite, Matheus" · **contadores**: marcações (sem as canceladas) · concluídas · **por atender** (substitui o "por confirmar" do design) · "+ Nova marcação" · poste |
| **Marcações do dia** | Linhas do design: hora, ponto e estado (pela hora), cliente (**⚠️** se tiver faltas a partir do limite), serviço · duração, preço. Tocar → abre o **detalhe na Agenda** (`/admin/agenda?m=<id>`) |
| **Em curso** *(só quando há)* | Cartão dourado com o cliente e **"Registar falta" em destaque** a partir do início + tolerância (2.8 ➕, janela curta da 2.3); antes disso explica quando aparece |
| **Próxima marcação** | Hora grande, "**em Xh Ymin**" (atualiza a cada minuto), cliente, serviço · duração · preço, "**N.ª visita · último corte há …**" (do histórico), **Ver ficha** e **Enviar lembrete** (WhatsApp com mensagem pré-escrita). Sem mais: "Sem mais marcações hoje" |
| **Pendências** | **Notificações não lidas** (2.9), com o nº e link "por ler". Ficam vazias até a etapa das notificações as começar a criar |

Atualiza sozinho a cada minuto. **Ficheiros:** `src/admin/pages/Inicio.jsx` (reescrito) · `src/admin/pages/inicio/useDashboard.js` · `Agenda.jsx` (abre o detalhe com `?m=`).

**Verificado (2026-11-13):** lint sem avisos · build OK · a marcação de teste existe para hoje às 15:00 e entra como "Próxima marcação".

**Teste do Gabriel (T-5.10):**
1. Início mostra a marcação das 15:00 em **Marcações do dia** e em **Próxima marcação** ("em …", 1.ª visita).
2. Contadores: 1 marcação · 0 concluídas · 1 por atender.
3. Tocar na linha → abre o detalhe na Agenda. **Ver ficha** e **Enviar lembrete** funcionam.
4. Às 15:00 a marcação passa a **Em curso** (cartão próprio); às **15:10** aparece **"Registar falta"**.
5. **Listas:** o menu de serviços da nova marcação mostra os serviços (fundo preto, letras brancas).

**Teste T-5.10 do Gabriel (2026-11-13): ✅ tudo OK** (Início com a marcação real e listas legíveis).

---

## 5.11 — Testes e validação ✅

### 1. Verificação de segurança geral (2026-11-13) ✅

| Verificação | Resultado |
|---|---|
| Funções (26) | **Nenhuma** executável pelo público · 9 pelo painel (`is_admin`, `available_slots`, 7 `admin_*`), todas `security definer` com verificação de administrador · as restantes só internas · **todas com `search_path` fixo** |
| Tabelas (15) | **15/15 bloqueadas** ao visitante sem sessão (401) |
| Registo público | Desligado |
| `db:lint` / `lint` | Sem erros / sem avisos |
| Dependências de produção | 0 vulnerabilidades |

### 2. Critérios de aceitação do painel (Especificação)

| Secção | Como ficou coberta |
|---|---|
| 2.2 Painel (acesso, áreas, marcação manual, estados) | Testes do Gabriel 4.9, 5.8, 5.10 · teste SQL do motor (5.7) |
| 2.3 Estados | Testes SQL 5.1, 5.7, 5.9 · `Registar falta` no Início (5.10) |
| 2.4 Cálculo de horários | Teste SQL 5.7 (dia vazio, almoço, encaixe, libertar) · **teste 5.11 (abaixo)** para domingo, feriados, dias especiais, horário semanal, pausas e limite de dias |
| 2.5 Concorrência | Fila da agenda + restrição parcial (testes 5.1, 5.4, 5.7). A concorrência das **marcações online** testa-se na área pública |
| 2.6 Alterações e cancelamentos (lado do barbeiro) | Teste SQL 5.7 · teste do Gabriel 5.8 |
| 2.7 Preços (manual) | Teste SQL 5.7 (visitante 17 €) · teste do Gabriel 5.8 |
| 2.8 Dashboard e navegação | Testes do Gabriel 5.0, 5.10 |
| 2.10 Clientes (lado do barbeiro) | Teste do Gabriel 5.6 |
| 2.11 Serviços | Teste do Gabriel 5.3 |
| 2.12 Horários | Testes 5.4 (SQL + Gabriel) · teste 5.11 |
| 2.13 Configurações | Teste do Gabriel 5.5 |
| 2.14 Segurança | Secção 1 acima · testes 4.9 |

**Ficam para outras etapas** (não são do painel): página pública, link pessoal e cancelamento pelo cliente, concorrência das reservas online, notificações e push, badge do ícone.

### 3. O que falta para fechar a Etapa 5
| # | Teste | Quem |
|---|---|---|
| 5.11-a | **Teste SQL dos horários** (`teste_horarios_511.sql`, desfeito no fim): domingo fechado · feriado sem horários e volta a abrir se desligado · dia especial fechado · dia especial 10–12 (substitui o semanal e as pausas) · mudar a abertura de segunda · pausa nova · nada a mais de 30 dias | Claude, com OK |
| 5.11-b | **Security Advisor** no painel da Supabase (Advisors → Security Advisor) → enviar o que aparecer | Gabriel |
| 5.11-c | **Volta completa no iPhone**, no PWA instalado: Início → Agenda (dia e semana, nova marcação, detalhe) → Clientes (lista e ficha) → Serviços → Horários → Configurações. Ver se tudo cabe no ecrã e se a barra inferior e o "Mais" funcionam | Gabriel |

### Teste 5.11-a: horários (2026-11-13) ✅

Transação desfeita no fim (confirmado depois: segunda continua a abrir às 09:00, 5 pausas, 0 dias especiais, feriado de 1/12 ativo). Dias usados: segunda 16/11, domingo 15/11, feriado 01/12.

| # | Teste | Resultado |
|---|---|---|
| 1 | Domingo | ✅ 0 horários |
| 2a | Feriado (1 de dezembro) | ✅ 0 horários |
| 2b | Feriado desligado | ✅ Volta a abrir (34 horários) |
| 3 | Dia especial fechado | ✅ 0 horários |
| 4 | Dia especial 10:00–12:00 | ✅ 10:00 … 11:30 (substitui o semanal e as pausas) |
| 5 | Segunda passa a abrir às 10:00 | ✅ 1.º horário 10:00 |
| 6 | Pausa nova 16:00–16:30 | ✅ 15:30 sim, 15:45 não, 16:30 sim |
| 7 | A mais de 30 dias | ✅ 0 horários |

**5.11-b Security Advisor e 5.11-c volta completa no iPhone (Gabriel, 2026-11-13): ✅ tudo OK.**

---

### Ajuste final (2026-11-13): logótipo no telemóvel

No telemóvel não há menu lateral, por isso o logótipo não aparecia. A pedido do Gabriel, nos ecrãs < 1024 px o **logótipo fica como fundo**, centrado, a **8 % de opacidade**, fixo e sem interferir com toques (ficheiro AdminLayout.jsx). Verificado a 375 px: logótipo centrado (292 px de largura) e barra inferior no sítio.

---

## Validação da Etapa 5

- [x] Todas as subetapas 5.0–5.11 testadas e validadas pelo Gabriel (2026-11-13)
- [x] Etapa 5 fechada → próxima etapa

**Passa para a frente:**
| Item | Quando |
|---|---|
| Dados de teste (cliente "Gabriel Tolin" e a marcação de 13/11) | Limpar antes do lançamento |
| Trocar o administrador de teste pela conta do barbeiro (G-3) | Antes do lançamento |
| Página pública, link pessoal, reservas online, funções públicas e limites de pedidos | Etapa da área pública |
| Notificações (página, push, Edge Function, resumo do dia, badge) | Etapa das notificações |
| P-02 (morada/WhatsApp, se ainda não preenchidos), P-03, P-04 (RGPD e privacidade) | Antes do lançamento |
