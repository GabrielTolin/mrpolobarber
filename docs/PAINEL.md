# MR Polo Barber — Painel do barbeiro

**Etapa 5 — Desenvolvimento do painel administrativo** · Em curso desde 2026-11-12

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
| 5.5 | Configurações | 🔶 Feito · falta o teu teste com sessão |
| 5.6 | Clientes | ⏳ |
| 5.7 | Motor da agenda (backend) | ⏳ |
| 5.8 | Agenda | ⏳ |
| 5.9 | Estados automáticos | ⏳ |
| 5.10 | Dashboard (Início com dados reais) | ⏳ |
| 5.11 | Testes e validação | ⏳ |

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

## 5.5 — Configurações 🔶 *(falta o teu teste com sessão)*

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
