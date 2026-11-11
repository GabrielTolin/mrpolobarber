# MR Polo Barber — Configuração e Infraestrutura

**Etapa 4 — Configuração e infraestrutura** · Em curso desde 2026-11-11

Prepara o ambiente onde as funcionalidades vão ser construídas, seguindo a [Arquitetura](ARQUITETURA.md) (validada). **Nesta etapa não se desenvolvem funcionalidades da barbearia.**

| Subetapa | Tema | Estado |
|---|---|---|
| 4.1 | Preparação do ambiente de desenvolvimento | ✅ Feito (à espera da tua validação) |
| 4.2 | Git e GitHub | 🔶 Preparado (falta o commit e o push do Gabriel) |
| 4.3 | Supabase | ✅ Feito (2026-11-05), a reconfirmar na 4.9 |
| 4.4 | Migrations | 🔶 Quase feito (CLI instalada, `init` + `link` feitos, pasta vazia) |
| 4.5 | Segurança inicial | ⏳ |
| 4.6 | Estrutura da aplicação | ⏳ |
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
| Git | Repositório local na `main`, 1.º commit preparado |
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

## 4.2 — Git e GitHub 🔶 *(preparado, falta o commit e o push do Gabriel)*

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
