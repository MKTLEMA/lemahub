# LEMA Demand Hub — Handoff Document

**Data:** 2026-08-19
**Projeto:** LEMA Demand Hub (marketing demand management tool)
**Repo:** https://github.com/MKTLEMA/lemahub.git (branch: `main`)
**App URL:** https://mktlema-lemahub.holy-bush-967a.workers.dev

---

## Visão Geral

App interno de gestão de demandas de marketing da LEMA. Construído com TanStack Start (React 19, SSR), TypeScript, Tailwind CSS, Supabase (Auth + PostgREST + Realtime), deployado no Cloudflare Workers.

## Estado Atual

### Funcional (verificado end-to-end)

- Login via Supabase Auth (email/senha)
- Auth guard: rotas protegidas redirecionam para `/login` se não autenticado
- Painel Admin: criar, resetar senha, excluir usuários (com verificação de role admin)
- "Esqueci a senha?" na tela de login → email de reset via Supabase
- Rota `/reset-callback` para receber token de recovery
- Colaboradores: 41 registros importados do CSV, com tags coloridas + 6 filtros + sorting
- Eventos: 81 registros importados do CSV (2026), com sorting
- Sorting em todas as listas (8 rotas): campo + direção (asc/desc)
- Realtime subscriptions (PostgREST) para atualização automática
- Histórico de edições (trigger Postgres)

### Credenciais

- **Admin:** `marketing@lemaef.com.br` / `Lema@Admin2026!`
- **Admin 2:** `andrefelipe@lemaef.com.br` (role: admin, senha definida pelo usuário)
- Trocar senhas em `/perfil` após primeiro login

## Arquitetura

### Stack

- **Framework:** TanStack Start (SSR + client), React 19, TypeScript 5.9
- **Data:** Supabase PostgREST + Realtime (cliente em `src/lib/supabase.ts`)
- **Auth:** Supabase Auth, role-based access (`src/lib/auth.ts`)
- **Deploy:** Cloudflare Workers (preset `cloudflare-module` via Nitro)
- **UI:** shadcn/ui, Tailwind CSS v4, Radix primitives
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts

### Arquivos Críticos

| Arquivo                            | Função                                                                                                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/store.ts`                 | CRUD, Realtime, `useDb()`, `insertRow()`, `updateRow()`, `deleteRow()`. Re-hidrata no login via `onAuthStateChange`.                                                         |
| `src/lib/auth.ts`                  | `login()`, `logout()`, `currentConta()` (com retry), `currentEmail()`, `subscribeAuth()`. Cache com `contaFetched`.                                                          |
| `src/lib/admin.functions.ts`       | Server functions: `listUsers`, `createUser`, `resetPassword`, `deleteUser`. Usa `getEnv()` (globalThis.**env** + import.meta.env) e `requireAdmin()` (fetch direto com JWT). |
| `src/lib/supabase.ts`              | Cliente Supabase (anon key, URL do Vite env).                                                                                                                                |
| `src/lib/types.ts`                 | Interfaces TypeScript de todos os domínios.                                                                                                                                  |
| `src/routes/__root.tsx`            | Root layout: `beforeLoad` auth guard, providers, AppShell.                                                                                                                   |
| `src/routes/login.tsx`             | Login + "Esqueci a senha?" dialog.                                                                                                                                           |
| `src/routes/admin.tsx`             | Painel admin: CRUD de usuários, senha aleatória.                                                                                                                             |
| `src/routes/reset-callback.tsx`    | Recebe token de recovery, redireciona para `/perfil`.                                                                                                                        |
| `src/server.ts`                    | SSR entry com error handler e patch para CF Workers.                                                                                                                         |
| `scripts/patch-cf-build.js`        | Post-build: corrige circular ESM dependency no Nitro output.                                                                                                                 |
| `scripts/create-admin.mjs`         | Cria conta admin base no Supabase.                                                                                                                                           |
| `scripts/import-colaboradores.mjs` | Importa colaboradores de CSV (UTF-8, BOM strip).                                                                                                                             |
| `scripts/import-eventos.mjs`       | Importa eventos de CSV (Latin-1).                                                                                                                                            |
| `supabase-migration.sql`           | Schema completo: tabelas, RLS, policies, grants, triggers.                                                                                                                   |

### Cloudflare Workers — Peculiaridades

1. **Circular ESM dependency:** O Nitro `cloudflare-module` gera 2 chunks SSR com circular import. O script `scripts/patch-cf-build.js` faz inline das funções para quebrar o ciclo. Roda automaticamente via `npm run build:cf`.

2. **Worker secrets vs Vite env:** Vars com prefixo `VITE_` são injetadas pelo Vite em build-time (`import.meta.env`). Worker secrets (setados via `wrangler secret put`) ficam em `globalThis.__env__`. O helper `getEnv()` em `admin.functions.ts` checa ambos.

3. **Build command:** `npm run build:cf` = `vite build && node scripts/patch-cf-build.js`

4. **Deploy command:** `$env:CLOUDFLARE_ACCOUNT_ID="1335a4fd63bf7c4626fb5686fac51b53"; npx wrangler deploy`

## Infraestrutura

### Supabase

- **Project ref:** `uhlckghszxdioacrlehi`
- **URL:** `https://uhlckghszxdioacrlehi.supabase.co`
- **Tabelas:** colaboradores, compras_castanhas, compras_financeiro, eventos, estoque_fardamentos, estoque_canetas, estoque_copos, gastos_endomarketing, historico_edicoes, perfis
- **RLS:** habilitada em todas. Policy `authenticated_all` para domain tables. `perfis_select/insert/update/delete` para perfis.
- **Trigger:** `log_historico()` em INSERT/UPDATE/DELETE de todas as tabelas de domínio.
- **GRANT:** `SELECT, INSERT, UPDATE, DELETE` em todas as tabelas para `authenticated`. `SELECT ON auth.users TO service_role` (necessário para o trigger).

### Cloudflare

- **Account ID:** `1335a4fd63bf7c4626fb5686fac51b53`
- **Worker name:** `mktlema-lemahub`
- **Worker URL:** `https://mktlema-lemahub.holy-bush-967a.workers.dev`
- **Secrets:** `SUPABASE_SERVICE_ROLE_KEY` (setado via `wrangler secret put`)
- **Compatibility flags:** `nodejs_compat`

### GitHub

- **Repo:** `MKTLEMA/lemahub` (branch `main`)
- **Token:** o usuário precisa gerar um Personal Access Token em https://github.com/settings/tokens para push. Não está persistido no repo.

## Commits Recentes

| Commit    | Descrição                                                                  |
| --------- | -------------------------------------------------------------------------- |
| `f1a2b3c` | feat: branding + logos, calendar toggle, EventoCard, compact list + kanban |
| `5c0d91c` | fix: Worker env access, store re-hydration, random passwords               |
| `f6b7672` | fix: requireAdmin uses direct fetch with token (RLS was blocking)          |
| `01e19df` | fix: admin access + sorting on all list pages                              |
| `44f0ee6` | fix: UTF-8 encoding for colaboradores import + null-safe eventos render    |
| `05a35ed` | feat: fix admin access, import colaboradores/eventos, color tags + filters |
| `9420f3e` | feat: auth guard, admin security, password reset flow                      |
| `a23a072` | fix: add post-build patch for Cloudflare Workers ESM circular dependency   |

## Atualização — 2026-09-01

**Estado do repo:** limpo, `main` sincronizado com origin.

### Mudanças desde 2026-08-19 (commits)

| Commit    | Descrição                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------- |
| `ea8449c` | Combobox pesquisável de eventos (`SeletorBuscavel`, grupos próximos/encerrados) + seletor de pedido no EventoCard |
| `19ed74a` | Vínculo castanhas↔eventos (`evento_id`), popup central de alertas, ícones de alerta por categoria  |
| `195884b` | Fix: reset de senha admin (email_confirm), perfis via server functions, mensagens reais de erro no login, RLS `perfis_insert` |
| `f45ad61` | Fix: reset de senha + remoção de alertas de castanha baseados em prazo                             |
| `9799f66`, `d56b892`, `6a2f84e` | Fix: AnexoViewer (visualizador de PDF in-app, botão "Ver")                    |
| `ea38950`, `36bdea4`, `e68efd7` | Mobile: drawer nav (Sheet), `<main>`, card list + tabela transform           |
| `f240d18` | CRUD com estado otimista + `ResultadoOperacao`, `SortableHeader` em todas as rotas                |

### Documentação

- **`AGENTS.md` foi reescrito em 2026-09-01** para refletir o código real — a versão anterior descrevia APIs/arquivos inexistentes (`useApp()`, `hasRole()`, tabela `contas`, `npm run deploy`, `src/components/alerts/`). Confiar na versão atual.
- **Novo: `docs/LEMBRETES-EMAIL-PLANO.md`** — plano aprovado para lembretes por e-mail via Resend: botão manual "Enviar lembrete" por pedido de castanhas (popover com seleção múltipla + cadastro de destinatários) e lembretes automáticos de eventos (véspera + dia) via pg_cron, destinados a perfis admin/editor. Executar Fases 1→4 conforme o plano; a **Fase 0 (pré-voô) é do usuário** e bloqueia apenas os testes.

### Segredo RESEND_API_KEY (configurado 2026-09-02)

- Worker (fluxo manual): `npx wrangler secret put RESEND_API_KEY --name mktlema-lemahub`
- Vault do Supabase (fluxo cron): `vault.create_secret('re_...', 'resend_api_key')` — neste projeto a extensão chama `supabase_vault` (o schema criado é `vault`); a função lê o secret mais recente com esse nome
- Nunca criar com prefixo `VITE_`

## Atualização — 2026-09-02

### Lembretes por e-mail (Resend) — implementado e deployado

- **Migration seção 9 aplicada via Supabase MCP**: tabelas `destinatarios_lembrete` + `envios_lembrete` (RLS role-gated admin/editor), schema privado `lembretes` com `enviar_lembretes_eventos()` (SECURITY DEFINER + REVOKE total de execução), cron `lembretes-eventos-email` (`0 * * * *` — horário, dedupe por evento+fase), realtime em destinatários.
- **Atenção — default privileges do Supabase dão ALL para anon/authenticated em tabelas novas**: o migration 9.4 inclui REVOKEs explícitos (defense-in-depth). Replicar esse padrão em tabelas futuras.
- **App**: `src/lib/lembretes.functions.ts` (server fn `enviarLembreteCastanha` — `requireEditor`, validação de e-mails, cooldown 12h por pedido+destinatário, log em `envios_lembrete`, tags) + `src/components/lembrete-popover.tsx` (cmdk multi-select + "+") + coluna "Enviar lembrete" em castanhas (visível só para admin/editor). `resend@6.25.0` pinado.
- **Remetente**: `LEMA Hub <lembretes@compliance.lemaef.com.br>` (domínio já verificado na conta; entrega em qualquer destinatário). Adotado 2026-09-02 — o modo teste `onboarding@resend.dev` entregava só no Gmail dono da conta e caía no spam. Domínio definitivo (`@lemaef.com.br` ou subdomínio): time de tecnologia registra no Resend (botão "Sign in to Cloudflare") e troca o `from` no migration 9.6 + `lembretes.functions.ts`.
- **Testes feitos (todos ✅)**: envio pontual → 200; função do cron → log + 403 esperado (restrição do modo teste, à época) + dedupe; envio manual via UI → 2 lembretes logados e entregues (confirmado pelo usuário 2026-09-02, `last_event: delivered` na API do Resend). Fix realtime (problema #7) deployado (`a069ef61`); switch de remetente + fix do `log_historico` deployados (`3824832a`).
- Advisors: `log_historico` search_path CORRIGIDO (2026-09-02, `SET search_path = public, extensions`, migration atualizada). Pendentes: tabela órfã `public.lemahubmkt` (aguardando confirmação para apagar) e leaked password protection (ativar no dashboard: Authentication → Settings).

### Supabase MCP (novo — 2026-09-01)

- Configurado em `~/.config/opencode/opencode.jsonc` (servidor remoto `https://mcp.supabase.com/mcp?project_ref=uhlckghszxdioacrlehi&...`, OAuth autenticado com `opencode mcp auth supabase` — token com refresh automático).
- Agentes podem executar SQL (`execute_sql`), rodar advisors e pesquisar docs diretamente — sem depender do usuário colar SQL no dashboard. Mudanças no config exigem reiniciar o opencode para surtir efeito.

## Problemas Conhecidos e Resoluções

### 1. `TypeError: createCsrfMiddleware is not a function` (SSR crash)

**Causa:** Circular ESM dependency entre 2 chunks do Nitro no Cloudflare Workers.
**Fix:** `scripts/patch-cf-build.js` faz inline das funções quebrando o ciclo.

### 2. `VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados.`

**Causa:** `import.meta.env["SUPABASE_SERVICE_ROLE_KEY"]` é `undefined` no Worker (Vite só injeta `VITE_*`).
**Fix:** `getEnv()` helper checa `globalThis.__env__` (Worker secrets) depois de `import.meta.env`.

### 3. "Acesso restrito a administradores" persistente

**Causa:** `requireAdmin()` criava client com `persistSession:false`, chamava `getUser(token)` mas não setava sessão. A query `perfis` ia sem Authorization header → RLS bloqueava → `perfil null` → "editor".
**Fix:** `requireAdmin()` usa `fetch()` direto com token no header.

### 4. Dados somem após login

**Causa:** `store.ts` `hydrate()` rodava uma vez na importação. Se sessão estava inválida, RLS bloqueava → dados vazios. Após login, não re-hidratava.
**Fix:** Listener `onAuthStateChange` → `SIGNED_IN` re-hidrata, `SIGNED_OUT` limpa.

### 5. Acentos quebrados nos colaboradores

**Causa:** CSV em UTF-8 com BOM, lido como `latin1`. Headers acentuados ficavam ilegíveis → column matching falhava → 11 colunas vazias.
**Fix:** Ler como `utf8` + strip BOM (`replace(/^\uFEFF/, "")`).

### 6. Eventos page crash (`null.split()`)

**Causa:** `e.data_fim.split("-")` quando `data_fim` é `null` (eventos de 1 dia).
**Fix:** Null-safe: `{e.data_fim ? e.data_fim.split("-").reverse().join("/") : "—"}`.

### 7. `cannot add postgres_changes callbacks for realtime:db-changes after subscribe()` (console)

**Causa:** `subscribeRealtime()` encadeava `.on()` no canal `"db-changes"` (reutilizado por nome) quando o canal já estava inscrito — disparado pela re-hidratação pós-login (fix do problema #4). Bug pré-existente; ruído no console, não quebrava o app.
**Fix (2026-09-02):** guard `realtimeAssinado` em `store.ts` — canal único e idempotente; o supabase-js re-autentica o canal nas trocas de sessão (`realtime.setAuth`). Deploy `a069ef61`.

## Backup de Arquivos

**Este diretório (`C:\Users\Andre\LEMA\Grupo Marketing - Documentos\LEMA\LEMA HUB MARKETING`) é a localização canônica do projeto.** É um repo git completo (branch `main`, remote `origin` → `MKTLEMA/lemahub`). Todos os comandos (dev, build, lint, deploy, commit, push) devem rodar daqui. A pasta `C:\Users\Andre\Downloads\LEMA Demand Hub` é um arquivo morto e não deve mais ser utilizada.

## Próximos Passos Sugeridos

1. **Configurar Site URL no Supabase:** Dashboard → Authentication → URL Configuration → Site URL = `https://mktlema-lemahub.holy-bush-967a.workers.dev` + Redirect URLs = `https://mktlema-lemahub.holy-bush-967a.workers.dev/**`. Necessário para o "Esqueci a senha?" funcionar em produção.

2. **Revogar tokens expostos:** GitHub PAT (`ghp_...`) e Supabase access token (`sbp_...`) foram expostos em texto plano. Revogar em:
   - https://github.com/settings/tokens
   - https://supabase.com/dashboard/account/tokens

3. **Seed data:** A migration SQL tem seed data (colaboradores, eventos, etc.) com IDs string (`'col-1'`) em tabelas UUID. Não foi aplicada. Se quiser dados de exemplo, ajustar os INSERTs para usar `gen_random_uuid()` ou remover os IDs.

4. **Custom domain:** O Worker está em `*.holy-bush-967a.workers.dev`. Para um domínio customizado (ex: `hub.lemaef.com.br`), configurar Custom Domain no Cloudflare Dashboard.

5. **Monitoring:** Considerar adicionar logs/telemetria para detectar erros SSR em produção.

## Skills Sugeridas

- **supabase:** Para qualquer tarefa envolvendo Supabase (schema, RLS, auth, realtime)
- **supabase-postgres-best-practices:** Antes de alterar schema ou criar tabelas
- **diagnosing-bugs:** Para debug de erros em produção
- **verification-before-completion:** Antes de declarar qualquer fix como concluído
