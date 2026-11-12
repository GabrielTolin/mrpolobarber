# Handoff: Painel "Início" — Mr. Polo Barber Shop

## Visão geral
Ecrã inicial do painel de administração do barbeiro (app de gestão de marcações, clientes, horários). Mostra: **marcações do dia**, **próxima marcação** e **pendências**. Substitui o placeholder atual da rota `/admin` (Início).

## Sobre os ficheiros
`painel-inicio.html` é uma **referência de design em HTML/CSS** — não é código de produção para copiar diretamente. A tarefa é **recriar este ecrã no codebase existente** (framework, componentes e padrões já usados no projeto, ex.: React/Next + Tailwind), ligando aos dados reais. Os dados no HTML são fictícios.

## Fidelidade
**Alta fidelidade (hi-fi).** Cores, tipografia, espaçamentos e raios são finais. Recriar com precisão.

## Layout
Desenhado a 1440×900 (desktop).
- `body`: fundo `#0D0C0A`, `display:flex`.
- **Sidebar** à esquerda: largura fixa 248px, fundo `#000`, borda direita 1px `#211D16`, padding 20px 16px, flex coluna, altura 100vh (sticky).
- **Main**: `flex:1`, padding 40px 48px, flex coluna, gap 24px.
  1. **Cabeçalho** (flex coluna, gap 20px)
     - Linha: à esquerda data + saudação; à direita 3 números + botão. `justify-content:space-between; align-items:flex-end`.
     - **Divisória tricolor** (barber pole) por baixo: altura 4px, raio 2px.
  2. **Grelha de conteúdo**: `grid-template-columns: minmax(0,1.5fr) minmax(0,1fr)`, gap 28px.
     - Coluna esquerda: cartão "Marcações do dia".
     - Coluna direita (flex coluna, gap 28px): cartão "Próxima marcação" + cartão "Pendências".
  - Abaixo de ~1100px a grelha passa a 1 coluna.

## Componentes

### Sidebar
- **Logo**: imagem `assets/logo.jpg` (fundo preto, 595×842). Mostrada recortada numa caixa 180×159px centrada (margin-bottom 20px): `img` com `width:252px; left:-51px; top:-78px` dentro de `overflow:hidden`. Idealmente substituir por um PNG/SVG do logo já recortado (com fundo transparente ou preto).
- **Itens de navegação** (gap 4px): padding 11px 14px, raio 8px, ícone 18px (stroke 1.8, estilo Lucide) + texto 14px Manrope, gap 12px.
  - Normal: cor `#A89F8E`. Hover: cor `#EDE6D6`, fundo `#15130F`.
  - Ativo: fundo `rgba(217,174,74,.12)`, cor `#E3B955`, peso 600.
  - Itens: Início, Agenda, Clientes, Notificações, Serviços e preços, Horários e bloqueios, Configurações.
  - Ícones (Lucide): `home`, `calendar`, `users`, `bell`, `scissors`, `clock`, `sliders-horizontal` (ou `settings`).
- **Terminar sessão**: fixo em baixo (`margin-top:auto`), cor `#7A7262`, ícone `log-out`.

### Cabeçalho
- Eyebrow (data): Manrope 12px, `letter-spacing:.18em`, maiúsculas, `#D9AE4A`. Ex.: "Quinta-feira, 12 de novembro" (data atual, pt-PT).
- Saudação: Cormorant Garamond 48px, peso 600, line-height 1.05, `#EDE6D6`. "Bom dia, Mr. Polo" (Bom dia / Boa tarde / Boa noite conforme a hora).
- Números (gap 28px, alinhados à direita): número Cormorant 34px/600/lh 1; rótulo Manrope 12px `#A89F8E`.
  - `7` marcações · `2` concluídas · `2` por confirmar (este em `#E58B6D`).
  - **Não há receita prevista** (removida de propósito).
- Botão primário "+ Nova marcação": fundo `linear-gradient(180deg,#E8C45A,#C29434)`, texto `#120F08`, Manrope 14px/700, padding 13px 22px, raio 8px, sem borda. Gap de 32px entre números e botão.
- **Divisória tricolor**: `repeating-linear-gradient(-45deg, #C8322B 0 12px, #F1EEE8 12px 19px, #2557C7 19px 31px, #F1EEE8 31px 38px)`, altura 4px, raio 2px. É o elemento de marca "poste de barbeiro" — usar com moderação (só aqui).

### Cartão base
- Borda 1px `#2A251C`, raio 12px, padding 24px, sem sombra, fundo transparente (herda `#0D0C0A`).
- Título do cartão: Cormorant Garamond 26px/600.

### Marcações do dia (cartão esquerdo)
- Cabeçalho: título + link "Ver agenda →" (Manrope 13px `#D9AE4A`), `align-items:baseline`, margin-bottom 16px.
- Lista com gap 8px. Cada linha: grid `56px 14px 1fr auto 110px`, gap 14px, padding 12px, raio 8px.
  - Hora: 15px/600, `font-variant-numeric: tabular-nums`.
  - Ponto de estado: círculo 8px na cor do estado.
  - Nome: 15px/600 `#EDE6D6`; abaixo "Serviço · duração" 13px `#A89F8E`.
  - Preço: 14px `#CFC6B4` (formato "25 €").
  - Estado: 12px, alinhado à direita, na cor do estado.
- **Estados**:
  | estado | rótulo | cor | extra |
  |---|---|---|---|
  | `done` | Concluída | `#7A7262` | linha com `opacity:.55` |
  | `now` | Em curso | `#E3B955` | fundo da linha `rgba(217,174,74,.08)` |
  | `ok` | Confirmada | `#9CC59A` | — |
  | `pend` | Por confirmar | `#E58B6D` | — |
- Ordenar por hora. Clique na linha → abre detalhe da marcação.

### Próxima marcação (cartão direito, topo)
- Variante dourada: borda `#6B5426`, fundo `linear-gradient(160deg,#1D180F,#0F0D0A)`, gap 14px.
- Topo: "PRÓXIMA MARCAÇÃO" (eyebrow, letter-spacing .16em) à esquerda; "em 2h 15min" (13px `#A89F8E`) à direita — tempo relativo calculado em tempo real.
- Hora grande: Cormorant 56px/600 `#E3B955`, ao lado (gap 16px, baseline) nome 18px/600 e "Serviço · duração · preço" 14px `#A89F8E`.
- Meta: "12.ª visita · último corte há 3 semanas" 13px `#A89F8E` (vem do histórico do cliente).
- Botões (flex, gap 10px, cada um flex:1):
  - "Ver ficha": fundo `#E3B955`, texto `#120F08`, 13px/700, padding 11px, raio 8px.
  - "Enviar lembrete": transparente, borda 1px `#3A3326`, texto `#EDE6D6`, 13px/600.
- Se não houver próxima marcação: mostrar "Sem mais marcações hoje".

### Pendências (cartão direito, baixo)
- Título + lista. Cada item: flex, gap 12px, padding 10px 0, borda superior 1px `#1F1B15`.
  - Marcador: losango 6×6 `#D9AE4A` (quadrado rodado 45°).
  - Título 14px/600, subtítulo 13px `#A89F8E`.
  - Ação à direita: 13px `#D9AE4A` ("Confirmar", "Responder", "Registar").
- Tipos previstos: marcações por confirmar, pedidos de reagendamento, faltas sem aviso.

## Interações e comportamento
- Hover nos itens da sidebar (ver acima). Botões: hover sugerido `filter:brightness(1.08)`; transições 150ms ease.
- "+ Nova marcação" → abre o fluxo de criar marcação.
- "Ver agenda →" → rota Agenda. Ações das pendências → fluxo correspondente.
- Atualizar "em Xh Ymin" e o estado "Em curso" a cada minuto.

## Estado / dados
- `marcacoesHoje[]`: `{ id, hora, duracaoMin, cliente:{nome}, servico, preco, estado: 'done'|'now'|'ok'|'pend' }`
- `proxima`: primeira marcação futura de hoje + `cliente.totalVisitas`, `cliente.ultimaVisita`.
- `pendencias[]`: `{ tipo, titulo, subtitulo, acao }`
- Contadores derivados: total, concluídas, por confirmar.

## Design tokens
**Cores**
- Fundo app `#0D0C0A` · sidebar `#000000`
- Texto `#EDE6D6` · texto secundário `#A89F8E` · terciário `#7A7262` · preço `#CFC6B4`
- Dourado `#E3B955` · dourado 2 (eyebrows/links) `#D9AE4A` · gradiente botão `#E8C45A → #C29434` · texto sobre dourado `#120F08`
- Tinta dourada ativo `rgba(217,174,74,.12)` · linha "em curso" `rgba(217,174,74,.08)`
- Bordas: cartão `#2A251C` · sidebar `#211D16` · divisórias internas `#1F1B15` · botão ghost `#3A3326` · cartão dourado `#6B5426`
- Hover nav `#15130F`
- Estados: confirmada `#9CC59A` · por confirmar `#E58B6D`
- Poste: vermelho `#C8322B` · branco `#F1EEE8` · azul `#2557C7`

**Tipografia** (Google Fonts)
- Títulos/números: **Cormorant Garamond** 500/600 — 56px (hora próxima), 48px (saudação), 34px (contadores), 26px (títulos de cartão)
- UI/texto: **Manrope** 400/500/600/700 — 18px, 15px, 14px, 13px, 12px
- Eyebrows: 12px, maiúsculas, letter-spacing .16–.18em

**Espaçamento**: 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48px
**Raios**: 8px (botões, linhas, nav) · 12px (cartões) · 2px (divisória) · 50% (pontos)
**Sombras**: nenhuma.

## Assets
- `assets/logo.jpg` — logo Mr. Polo Barber Shop (fornecido pelo cliente, fundo preto).
- Ícones: Lucide (stroke 1.8, 18px).

## Ficheiros
- `painel-inicio.html` — referência completa do ecrã (HTML + CSS com variáveis), abre direto no browser.
- `assets/logo.jpg`
