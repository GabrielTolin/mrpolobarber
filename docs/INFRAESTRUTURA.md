# MR Polo Barber — Configuração e Infraestrutura

**Etapa 4 — Configuração e infraestrutura** · Em curso desde 2026-11-11

Prepara o ambiente onde as funcionalidades vão ser construídas, seguindo a [Arquitetura](ARQUITETURA.md) (validada). **Nesta etapa não se desenvolvem funcionalidades da barbearia.**

| Subetapa | Tema | Estado |
|---|---|---|
| 4.1 | Preparação do ambiente de desenvolvimento | ✅ Feito (à espera da tua validação) |
| 4.2 | Git e GitHub | ✅ Feito (repositório privado GabrielTolin/mrpolobarber) |
| 4.3 | Supabase | ✅ Feito e reconfirmado (2026-11-11) |
| 4.4 | Migrations | ✅ Fluxo validado |
| 4.5 | Segurança inicial | ✅ Feito (migration aplicada + Auth configurado) |
| 4.6 | Estrutura da aplicação | ✅ Feito (frontend + migrations admins_is_admin e correção) |
| 4.7 | PWA | ⏳ |
| 4.8 | Vercel | ⏳ |
| 4.9 | Testes da infraestrutura | ⏳ |
| 4.10 | Revisão e validação final | ⏳ |

**Regra do projeto:** os commits e os pushes são sempre feitos pelo Gabriel. O Claude deixa tudo pronto e sugere a mensagem.

---

## Estado verificado a 2026-11-11

| Item | Estado |
|---|---|
| Pasta | `C:\Users\HP\Desktop\mrpolobarber` |
| Node / npm | v22.14.0 / 10.9.2 |
| React + Vite | React 19.3 · Vite 8.3 · build OK |
| Linter | oxlint (gerado pelo create-vite) |
| Dependências | `@supabase/supabase-js`, `react-router-dom`, `lucide-react` · dev: `tailwindcss` + `@tailwindcss/vite`, `supabase` (CLI 3.1) |
| Cliente Supabase | `src/lib/supabase.js` |
| `.env.local` | `VITE_SUPABASE_URL` + chave **publicável** (no `.gitignore`) · `.env.example` com valores de exemplo |
| Supabase CLI | **3.1.0**, ligada ao projeto `sxxbenaejbdgadrsavef` (eu-west-1, PostgreSQL 17) |
| `supabase/migrations/` | Vazia |
| Dev server | Porta **5174** · configuração `mrpolobarber` em `Desktop\.claude\launch.json` |
| `vercel.json` | Só a reescrita da SPA (faltam os cabeçalhos de segurança, 4.8) |
| Git | `main` ligada a `origin` (GitHub privado), 1.º commit `637f36e` |
| VS Code | `.vscode/extensions.json` com extensões recomendadas |

---

## 4.1 — Preparação do ambiente de desenvolvimento ✅

| Item | Feito |
|---|---|
| Projeto React + Vite (JavaScript) | Scaffold de 2026-11-05 (`create-vite` 9, template `react`) |
| Dependências | Tailwind 4, React Router 7, supabase-js, lucide-react, Supabase CLI **3.1.0** (atualizada) |
| **Versão do Node** | `.nvmrc` = 22 e `engines.node` = `22.x` no `package.json` (a Vercel usa a mesma) |
| **VS Code** | `.vscode/extensions.json` recomenda: Tailwind CSS IntelliSense, Oxc (oxlint), Supabase |
| **README.md** | Reescrito em português: documentação, tecnologias, primeira vez, comandos, regras |

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Desenvolvimento em http://localhost:5174 |
| `npm run build` / `npm run preview` | Versão de produção / servir em http://localhost:4174 |
| `npm run lint` | oxlint |
| `npm run db:new <nome>` | Cria uma migration |
| `npm run db:push:dry` | Mostra o que seria aplicado, sem aplicar |
| `npm run db:push` | Aplica as migrations no projeto |
| `npm run db:status` | Lista as migrations aplicadas |

**Nota sobre a CLI 3:** os comandos de base de dados apontam por defeito para uma base de dados **local** (Docker), que não usamos. Por isso os comandos `db:*` levam `--remote`, que aponta para o projeto ligado.

**Verificado:** `build` OK · `lint` sem avisos · `db:status` liga-se ao projeto (0 migrations).

---

## 4.2 — Git e GitHub ✅

| Item | Estado |
|---|---|
| Repositório local | `git init` na branch **`main`** |
| Identidade | GabrielTolin · gabrieltolin@gmail.com (configuração global) |
| `.gitignore` | Revisto: `node_modules`, `dist`, **`.env` e `.env.*`** (exceto `.env.example`), `supabase/.env`, `supabase/functions/.env`, `supabase/.temp`, `.claude/`, editores |
| `.gitattributes` | Finais de linha sempre **LF** no repositório (evita diferenças entre Windows e Vercel) |
| `supabase/migrations/.gitkeep` | Para a pasta vazia ficar no repositório |
| Ficheiros preparados (*staged*) | **24**: código, documentos, configuração. Verificado: **nenhuma chave** e nenhum `.env.local` |

### Branches
- **`main`** é a única branch permanente (projeto de uma pessoa).
- Branches curtas por funcionalidade (`feat/…`, `fix/…`) só quando forem úteis, juntadas à `main` quando estiverem prontas.

### O que o Gabriel faz

1. Criar o repositório **privado** no GitHub: `GabrielTolin/mrpolobarber`, **sem** README, `.gitignore` nem licença (o projeto já os tem).
2. No terminal, na pasta do projeto:

```bash
git commit -m "chore: configuração inicial do MR Polo Barber (Etapas 1–4.1)"
git remote add origin https://github.com/GabrielTolin/mrpolobarber.git
git push -u origin main
```

---

## 4.3 — Supabase ✅

Feito a 2026-11-05 e **reconfirmado a 2026-11-11**:

| Verificação | Resultado |
|---|---|
| Projeto | `mrpolobarber` · ref `sxxbenaejbdgadrsavef` · eu-west-1 · PostgreSQL 17 · conta Supabase separada |
| `.env.local` | URL correto + chave **publicável** (`sb_publishable_…`) |
| Auth (`/auth/v1/health`) | **200** |
| API REST com a chave publicável | **401** na raiz: o público não consegue listar a estrutura da base de dados (esperado) |
| Cliente React | `src/lib/supabase.js` (avisa na consola se faltarem as variáveis) |

---

## 4.4 — Migrations ✅

**Já feito:** CLI 3.1 no projeto, `supabase init`, `supabase link`, pasta `supabase/migrations/` (vazia, no Git) e os comandos `db:*` com `--remote` (4.1).

**Acrescentado:** `npm run db:lint`, que verifica erros nas funções da base de dados remota (`supabase db lint`). Testado: "No schema errors found".

### Fluxo para cada migration

| # | Passo | Quem |
|---|---|---|
| 1 | `npm run db:new <nome>` cria `supabase/migrations/<data-hora>_<nome>.sql` | Claude |
| 2 | Escrever o SQL, **sem `begin`/`commit`**: a CLI já aplica cada ficheiro numa transação (se falhar, nada fica a meio) | Claude |
| 3 | **Mostrar o SQL e explicar o que faz** | Claude |
| 4 | **Validar** | Gabriel |
| 5 | `npm run db:push:dry` → confirmar que só vai a migration esperada | Claude |
| 6 | `npm run db:push` → aplicar | Claude |
| 7 | `npm run db:status` + `npm run db:lint` + **critérios técnicos** da subetapa | Claude |
| 8 | **Advisors de segurança** no painel da Supabase (Advisors → Security) | Gabriel (ver nota) |
| 9 | Commit da migration + documentos | Gabriel |

### Regras
1. **Tudo por migration.** Nada se cria nem se altera à mão no painel da Supabase (exceto a configuração do Auth e os segredos, que não são SQL: G-1 a G-5 da 3.11).
2. **Uma migration aplicada nunca se edita.** Para corrigir, cria-se uma migration nova.
3. **Nomes:** a CLI põe a data e a hora à frente (ex.: `20261112103000_tables.sql`). Os números 0001–0007 da 3.11 são a **ordem**, não o nome do ficheiro.
4. **Dados iniciais** (configurações, horário, serviços, feriados) vão **numa migration**, e não no `seed.sql` da CLI, que só corre em bases de dados locais.
5. **Cópia de segurança antes de migrations destrutivas** (apagar ou alterar colunas com dados): `npx supabase db dump --remote --data-only -f <ficheiro>` guardado fora do repositório. Nas primeiras migrations a base de dados está vazia, por isso não é preciso.

### Nota sobre os advisors
O conector Supabase aqui do Claude está ligado à **outra conta** (Obrapoint / TS Hours) e não vê este projeto (decisão do início). Por isso os **advisors de segurança** veem-se no painel da Supabase. É só abrir Advisors → Security Advisor depois de cada migration e enviar ao Claude o que aparecer. O `db lint` cobre os erros nas funções.

---

## 4.5 — Segurança inicial ✅

Três partes: a configuração do **Auth** (pelo Gabriel, no painel), uma **migration de base de segurança** (antes de qualquer tabela) e a verificação de que **não há segredos no site**. As políticas RLS de cada tabela são criadas junto com as tabelas, na implementação (3.7).

### A. Configuração do Auth (G-1, pelo Gabriel)

No painel da Supabase, projeto `mrpolobarber`:

| Onde | Definição | Valor |
|---|---|---|
| Authentication → Sign In / Providers | **Allow new users to sign up** | **Desligado** |
| Authentication → Sign In / Providers → Email | Email provider | Ligado |
| Authentication → Sign In / Providers → Email | **Secure password change** | **Desligado** |
| Authentication → Sign In / Providers → Email | Minimum password length | **8** |
| Authentication → Sign In / Providers | Restantes fornecedores (Google, Phone…) | Desligados |
| Authentication → URL Configuration | Site URL | `https://mrpolobarber.vercel.app` (ajusta-se na 4.8 se o endereço for outro) |
| Authentication → URL Configuration | Redirect URLs | `http://localhost:5174/**` e `https://mrpolobarber.vercel.app/**` |

A conta do barbeiro (G-3) cria-se só quando houver painel para testar.

### B. Migration `security_baseline`

Ficheiro `supabase/migrations/20261111210855_security_baseline.sql`:
- **Funções:** retira a permissão de executar a `PUBLIC`, `anon` e `authenticated`, agora e para todas as funções futuras (3.7 regra 4). Cada função pública ou do painel recebe depois o seu `grant execute` explícito.
- **Tabelas e sequências:** o `anon` não recebe nenhuma permissão, agora e no futuro (3.7 regra 2). O `authenticated` mantém as permissões normais, porque o acesso real fica sempre limitado pelas políticas RLS de administrador.

É uma proteção em profundidade: mesmo que uma tabela nova fosse criada sem RLS por engano, o público não lhe tinha acesso.

**✅ Aplicada a 2026-11-11** (`npm run db:push`) e verificada:

| Verificação | Resultado |
|---|---|
| `db:status` | `20261111210855` local = remoto |
| `db:lint` | Sem erros |
| Permissões por defeito em `public` (consulta só de leitura a `pg_default_acl`) | **Funções:** só `postgres` e `service_role` executam · **Tabelas:** `authenticated` e `service_role`, **sem `anon`** |

**Ferramenta útil:** `npx supabase db query --remote --read-only "<sql>"` faz consultas **só de leitura** ao projeto. Substitui o conector, que não vê esta conta.

### C. Nenhum segredo no site

| Verificação | Resultado |
|---|---|
| Procura de `sb_secret_`, `service_role` e `SUPABASE_SERVICE` na build (`dist/`) | **Nada encontrado** |
| Variáveis no site | Só `VITE_*` públicas (URL e chave publicável) |
| `.env.local` | Fora do Git (4.2) |

### A. Resultado do G-1 (verificado a 2026-11-11)

Verificado pelas definições públicas do Auth (`GET /auth/v1/settings`):

| Definição | Resultado |
|---|---|
| Registos públicos | ✅ **desligados** (`disable_signup: true`). Na 1.ª verificação ainda estavam ligados e o Gabriel corrigiu |
| Fornecedores ativos | ✅ só **email** |
| "Secure password change" e mínimo de 8 caracteres | Não aparecem nas definições públicas. Confirmam-se na **4.9**, com a conta do barbeiro |

---

## 4.6 — Estrutura da aplicação ✅

Cria o **esqueleto** das três zonas, com páginas provisórias ("Em construção"). **Nenhuma funcionalidade** da barbearia.

### Pastas (3.1)

```
src/
├─ main.jsx                 BrowserRouter + AuthProvider
├─ App.jsx                  rotas das 3 zonas
├─ index.css                Tailwind + cores/tipos de letra base
├─ lib/
│  └─ supabase.js           (já existe)
├─ contexts/
│  └─ AuthContext.jsx       sessão do Supabase (+ "é administrador?")
├─ components/
│  ├─ EmConstrucao.jsx      página provisória reutilizável
│  └─ Carregando.jsx        indicador de carregamento
├─ public/                  zona pública
│  ├─ PublicLayout.jsx      cabeçalho com o nome da barbearia + rodapé (privacidade)
│  ├─ Marcar.jsx            /           (provisória)
│  ├─ LinkPessoal.jsx       /m/:token   (provisória)
│  └─ NaoEncontrado.jsx     qualquer outro endereço
└─ admin/                   painel (carregado só quando se entra em /admin)
   ├─ AdminLayout.jsx       barra inferior (telemóvel) / menu lateral (ecrã grande), 2.8
   ├─ RotaAdmin.jsx         proteção das rotas (3.9)
   ├─ Login.jsx             /admin/login
   ├─ SemAcesso.jsx         conta sem permissão
   └─ pages/                Dashboard, Agenda, Clientes, Servicos, Horarios,
                            Notificacoes, Configuracoes (provisórias)
```

### Rotas

| Zona | Rota | Página |
|---|---|---|
| Pública | `/` | Marcar (provisória) |
| Link pessoal | `/m/:token` | LinkPessoal (provisória) |
| Painel | `/admin/login` | Login (**funcional**: email + palavra-passe, terminar sessão) |
| Painel | `/admin` · `/admin/agenda` · `/admin/clientes` · `/admin/servicos` · `/admin/horarios` · `/admin/notificacoes` · `/admin/configuracoes` | Provisórias, dentro do `AdminLayout` |
| — | qualquer outra | NaoEncontrado |

### Decisões técnicas
1. **O painel é carregado à parte** (`React.lazy`). Quem só marca não descarrega o código do painel, e a página pública fica mais leve (3.1 decisão 1).
2. **`AdminLayout` já com a navegação final** da 2.8: barra inferior Início · Agenda · Clientes · Notificações · Mais (Serviços, Horários, Configurações, Terminar sessão), e menu lateral a partir de 768 px.
3. **`RotaAdmin`** segue a 3.9: sem sessão → `/admin/login`; com sessão mas sem ser administrador → "Sem acesso"; administrador → painel.
4. O **login é a única coisa funcional**, porque é infraestrutura e serve para testar o Auth na 4.9.

### ⚠️ Duas decisões

**1. A verificação "é administrador?"** precisa da tabela `admins` e da função `is_admin()` (3.7), que só existem na implementação.
- **A — Criar já uma migration pequena `admins_is_admin` (recomendo):** só a tabela `admins` (com RLS) e a função `is_admin()`. É infraestrutura de segurança e permite testar a 3.9 por inteiro na 4.9.
- **B — Fica para a implementação.** Até lá, o `RotaAdmin` só verifica se há sessão. Funciona, mas deixa um buraco temporário.

**2. Identidade visual.** Ainda **não falámos** das cores, do logótipo e dos tipos de letra da barbearia. Nesta subetapa uso um visual **neutro provisório** (preto/cinzento, letra do sistema), fácil de trocar depois, porque as cores ficam centralizadas no `index.css`. A identidade visual fica como **novo pendente (P-12)**, para tratar antes da área pública.

### Decisões tomadas (2026-11-11)
1. **Verificação de administrador: opção A.** Migration `20261111212240_admins_is_admin.sql` com a tabela `admins` (RLS, só lê a própria linha, máx. 1 linha) e a função `is_admin()` (definer, `search_path` vazio, só `authenticated` executa). **Aplicada** (com a correção abaixo).
2. **Identidade visual:** visual neutro provisório, com as cores centralizadas no `@theme` do `index.css`. Fica o **pendente P-12** (cores, logótipo, tipos de letra).

### Implementado

| Ficheiro | O quê |
|---|---|
| `src/App.jsx` | Rotas: zona pública (`/`, `/m/:token`, 404) + `admin/*` carregado à parte (`React.lazy`) |
| `src/main.jsx` | `BrowserRouter` + `AuthProvider` |
| `src/contexts/AuthContext.jsx` · `auth.js` · `src/hooks/useAuth.js` | Sessão (renovação automática) + verificação `is_admin()` sempre que o utilizador muda |
| `src/components/` | `Carregando`, `EmConstrucao` |
| `src/public/` | `PublicLayout` (nome + rodapé de privacidade), `Marcar`, `LinkPessoal`, `NaoEncontrado` |
| `src/admin/` | `AdminApp` (rotas), `RotaAdmin` (proteção 3.9), `Login` (funcional), `SemAcesso`, `AdminLayout` (barra inferior + "Mais" no telemóvel, menu lateral ≥ 768 px), `navegacao.js`, `pages/Paginas.jsx` (7 provisórias) |
| `src/index.css` | Cores neutras em `@theme` (`ink`, `ink-muted`, `line`, `surface`, `canvas`, `accent`) |

### Verificado no browser (2026-11-11)

| Teste | Resultado |
|---|---|
| `/` · `/m/abc123` · `/nao-existe` | Página provisória · página provisória · "Página não encontrada" |
| `/admin/agenda` sem sessão | Redireciona para **`/admin/login`** |
| Login com dados errados | "Email ou palavra-passe incorretos." |
| Página pública a 375 px | OK (cabeçalho, conteúdo, rodapé) |
| Consola | Sem erros |
| Build | Painel num ficheiro à parte (`AdminApp-*.js`, ~10 kB) |
| Lint | Sem avisos |

**Ainda não testado (precisa da migration aplicada e da conta do barbeiro, G-3):** "Sem acesso" com uma conta que não é admin, e o painel com o administrador. Fica para a **4.9**.

### Migrations aplicadas (2026-11-11)

| Migration | Resultado |
|---|---|
| `20261111212240_admins_is_admin` | Tabela `admins` com RLS e política "só a própria linha", sem acesso do `anon`. Função `is_admin()` definer com `search_path` vazio |
| `20261111212903_fix_function_default_privileges` | **Correção da base de segurança** (ver abaixo) |

**Falha encontrada e corrigida:** a verificação mostrou que `is_admin()` ficava executável por `PUBLIC` (e por isso pelo `anon`). A causa: o `alter default privileges … in schema public` da `security_baseline` só **acrescenta** permissões. O `execute` para `PUBLIC` vem da regra **global** do PostgreSQL, que só se tira com um `alter default privileges` **sem** `in schema`. A migration de correção acrescenta essa regra global e retira o `PUBLIC` das funções existentes.

**Verificação depois da correção:**

| Teste | Resultado |
|---|---|
| Permissões da `is_admin()` | `postgres`, `service_role`, `authenticated` (sem `PUBLIC`) |
| `anon` executa `is_admin()`? | **Não** |
| Regra global para funções novas | Só `postgres` |
| Visitante sem sessão chama `rpc/is_admin` pelo site | **401** "permission denied for function is_admin" |
| Visitante sem sessão lê `admins` | **401** "permission denied" |
| `db:lint` / `db:status` | Sem erros / 3 migrations iguais local = remoto |

**Lição registada:** depois de criar funções, verificar sempre as permissões reais (`proacl`) e não só confiar nas regras por defeito.
