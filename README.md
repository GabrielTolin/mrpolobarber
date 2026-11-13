# MR Polo Barber

Sistema de marcações para a barbearia MR Polo Barber (Albufeira): página pública onde os clientes marcam sem conta e painel do barbeiro em PWA.

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/REQUISITOS.md](docs/REQUISITOS.md) | Etapa 1: o que o barbeiro precisa |
| [docs/ESPECIFICACAO.md](docs/ESPECIFICACAO.md) | Etapa 2: como o sistema se comporta, com os critérios de aceitação |
| [docs/ARQUITETURA.md](docs/ARQUITETURA.md) | Etapa 3: como o sistema é construído (tabelas, segurança, automações) |
| [docs/INFRAESTRUTURA.md](docs/INFRAESTRUTURA.md) | Etapa 4: configuração e infraestrutura |
| [docs/PAINEL.md](docs/PAINEL.md) | Etapa 5: painel do barbeiro (inclui o sistema visual) |
| [docs/PUBLICO.md](docs/PUBLICO.md) | Etapa 6: área pública (marcações online) |

## Tecnologias

React 19 + Vite 8 · JavaScript · Tailwind CSS 4 · React Router · Supabase (PostgreSQL, Auth, RLS, Edge Functions, `pg_cron`) · PWA · Vercel.

## Requisitos

- **Node 22** (ver `.nvmrc`)
- Acesso ao projeto Supabase `sxxbenaejbdgadrsavef`

## Primeira vez

```bash
npm install
cp .env.example .env.local   # e preencher com o URL e a chave publicável do projeto
npx supabase login           # com a conta Supabase do projeto
npx supabase link --project-ref sxxbenaejbdgadrsavef
```

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento em http://localhost:5174 (também acessível na rede local) |
| `npm run build` | Gera a versão de produção em `dist/` |
| `npm run preview` | Serve a versão de produção em http://localhost:4174 |
| `npm run lint` | Verifica o código (oxlint) |
| `npm run db:new <nome>` | Cria uma migration nova em `supabase/migrations/` |
| `npm run db:push:dry` | Mostra que migrations seriam aplicadas, sem aplicar nada |
| `npm run db:push` | Aplica as migrations pendentes no projeto Supabase |
| `npm run db:status` | Mostra que migrations estão aplicadas |
| `npm run db:lint` | Verifica erros nas funções da base de dados |
| `npm run icons` | Gera os ícones do PWA a partir de `public/icon-source.png` (logótipo) |

## Regras do projeto

- **Alterações à base de dados só por migrations** versionadas. Nada se cria à mão no painel da Supabase.
- **Nenhuma chave secreta no frontend.** O site usa só a chave publicável. `.env.local` nunca vai para o Git.
- Os commits e os pushes são feitos pelo Gabriel.
