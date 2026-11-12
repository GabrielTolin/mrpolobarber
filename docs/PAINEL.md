# MR Polo Barber — Painel do barbeiro

**Etapa 5 — Desenvolvimento do painel administrativo** · Em curso desde 2026-11-12

Construir o PWA do barbeiro: autenticação, dashboard, agenda, clientes, serviços, horários e configurações. Segue a [Especificação](ESPECIFICACAO.md) e a [Arquitetura](ARQUITETURA.md).

**Regra do design (decisão de 2026-11-12):** o **visual** vem do handoff do Claude Design (`design/handoff-painel-inicio/`); o **conteúdo** (estados, serviços, pendências, ações) vem dos documentos validados. Os dados do design são exemplos.

| Subetapa | Tema | Estado |
|---|---|---|
| 5.0 | Sistema visual (design) | ✅ Feito (à espera da tua validação) |
| 5.1 | Base de dados do núcleo | ⏳ *(plano proposto, por validar)* |
| 5.2 | Autenticação (mudar palavra-passe) | ⏳ |
| 5.3 | Serviços e preços | ⏳ |
| 5.4 | Horários e bloqueios | ⏳ |
| 5.5 | Configurações | ⏳ |
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
