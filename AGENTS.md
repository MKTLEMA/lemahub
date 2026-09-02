# LEMA Demand Hub — AI Agent Guide

> **Accuracy note (2026-09-01):** this file was rewritten to match the actual codebase. The previous version described APIs and files that never existed or were renamed (`useApp()`, `hasRole()`, `contas` table, `npm run deploy`, `src/components/alerts/`, etc.). If this file ever conflicts with the code again, trust the code and update this file.

## Overview

Internal marketing demand management tool for LEMA endomarketing (all UI text in pt-BR). **Single-tenant**: one Supabase project, one Cloudflare Worker, no `contas`/organization layer.

## Current State & Active Work

- Git `main`, synced with `origin` (`MKTLEMA/lemahub`), working tree clean as of 2026-09-01.
- Recent feature work: castanha pedidos linked to events (`evento_id`), central alert popup, searchable event combobox (`SeletorBuscavel`), mobile drawer nav, in-app PDF viewer (`AnexoViewer`).
- **Active plan: `docs/LEMBRETES-EMAIL-PLANO.md`** — email reminders via Resend (manual per-pedido button + automatic event reminders via pg_cron). Read it before touching anything email-related.
- `HANDOFF.md` — infra credentials, troubleshooting history, deploy peculiarities (dated 2026-08-19; see its "Atualização — 2026-09-01" section for what changed since).

## Architecture

- **Framework**: TanStack Start (SSR + server functions), React 19, TypeScript (strict)
- **Data**: Supabase PostgREST via client-side anon-key client (`src/lib/supabase.ts`); Realtime re-fetches whole tables on change (`src/lib/store.ts`)
- **Server functions**: `src/lib/admin.functions.ts` (user management) and `src/lib/lembretes.functions.ts` (`enviarLembreteCastanha` — email reminders via Resend with `requireEditor` role check) — the only `createServerFn` usages; privileged ops run server-side with the service-role key from Worker env
- **Auth**: Supabase Auth; roles `admin | editor | leitor` in the `perfis` table. There is **no** `hasRole()`/`isAdmin()` helper — role checks are inline (e.g. `eu?.role === "admin"` client-side; `requireAdmin()` server-side)
- **State**: `useSyncExternalStore` module store (`store.ts`). TanStack Query's `QueryClientProvider` is mounted (`src/router.tsx`, `__root.tsx`) but there are **zero** `useQuery`/`useMutation` calls — server functions are called imperatively in event handlers with try/catch
- **UI**: shadcn/ui (`src/components/ui/`, 48 components) + Radix primitives + Tailwind CSS v4 + `cn()` from `src/lib/utils.ts`
- **Forms**: plain controlled inputs. React Hook Form + Zod are dependencies but **not used by the actual forms**
- **Charts**: Recharts (dashboard)
- **Deploy**: Cloudflare Workers (Nitro `cloudflare-module` preset); wrangler config is **generated at build time** — there is no `wrangler.toml`/`wrangler.jsonc` in the repo

## Environment & Secrets

| Var | Visibility | How it reaches the app |
|---|---|---|
| `VITE_SUPABASE_URL` | public | Vite build-time (`import.meta.env`) |
| `VITE_SUPABASE_ANON_KEY` | public | Vite build-time (`import.meta.env`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only** | Worker secret (`wrangler secret put`) → `globalThis.__env__` |
| `RESEND_API_KEY` *(planned)* | **server-only** | Worker secret (manual sends) + Supabase Vault (cron) — see the plan doc |

- **Access pattern**: `getEnv(name)` in `src/lib/admin.functions.ts` — checks `import.meta.env` then `globalThis.__env__`. Copy this pattern for any new server function.
- **Never** give a secret a `VITE_` prefix — it ships to the browser.
- Local dev: `.env` (gitignored). For server-only vars during `npm run dev`, verify how `SUPABASE_SERVICE_ROLE_KEY` reaches dev server functions today before adding new ones (HANDOFF.md problem #2). `.dev.vars` is gitignored and used by `wrangler dev`.
- **Supabase MCP** (added 2026-09-01): configured in `~/.config/opencode/opencode.jsonc` — remote OAuth server scoped to this project, authenticated via `opencode mcp auth supabase`. Use its tools (`execute_sql`, `get_advisors`, `search_docs`) for schema changes/verification instead of asking the user to paste SQL in the dashboard. Config changes need an opencode restart to take effect.

## Key Files

### Data layer

- `src/lib/store.ts` — module store. Exports: `useDb()` (all tables), `useLoading()`, `insertRow(tabela, values)` (**requires every non-meta column**), `updateRow(tabela, id, partial)`, `deleteRow(tabela, id)` — all return `ResultadoOperacao` (`{ ok: true } | { ok: false; erro: string }`). Auto-hydrates on client import; re-hydrates on `SIGNED_IN`; clears on `SIGNED_OUT`. Realtime: single channel `"db-changes"`, one listener per table, full-table refetch on any change.
- `src/lib/types.ts` — `Colaborador`, `CompraCastanha`, `CompraFinanceiro`, `Evento`, `EstoqueFardamento`, `EstoqueCaneta`, `EstoqueCopo`, `GastoEndomarketing`, `HistoricoEdicao`, `TabelaNome` (union whose values are the Postgres table names), `DBShape`, `LABELS`.
- `src/lib/csv.ts`, `src/lib/csv-import.ts` — CSV import/export per module.

### Auth

- `src/lib/auth.ts` — `login()` (self-creates a `perfis` row on first login), `logout()`, `currentEmail()`, `currentConta()` (cached `{id, email, nome, role}`), `currentNome()`, `subscribeAuth()`, `alterarSenhaPropria()`. All async; cache invalidated on auth state change.

### Server functions (the only `createServerFn` usages)

- `src/lib/admin.functions.ts` — `listUsers`, `createUser`, `resetPassword`, `deleteUser`; internal helpers `getEnv()`, `getAdminClient()` (service-role Supabase client), `requireAdmin(accessToken)` (validates JWT via direct fetch to `/auth/v1/user` + perfis role check — **not exported**). The client passes `accessToken` explicitly from `supabase.auth.getSession()`.
- `src/lib/lembretes.functions.ts` — `enviarLembreteCastanha`: manual castanha pedido email reminder via Resend SDK (`RESEND_API_KEY` worker secret). Validates caller with its own `requireEditor` (admin/editor), validates emails server-side, 12h cooldown per pedido+destinatário via `envios_lembrete`, logs every send. Helpers duplicated on purpose (keeps `admin.functions.ts` untouched).
- `src/lib/gate.functions.ts` — 2-line re-export of client auth helpers (not server functions despite the name).

### Alerts (client-side, ephemeral — NOT stored in any DB table)

- `src/lib/alerts.ts` — `calcularAlertas(db)` → `AlertaItem[]`; `diasAte(data)` (yyyy-mm-dd strings, local-midnight math); severity window **hardcoded at ≤3 days and duplicated** in `alerta-popup.tsx`, `index.tsx`, `eventos.tsx` — keep consistent if you touch it. Generates: event proximity, birthdays, castanha NF pendências, financeiro pendências, low-stock (thresholds in `localStorage` via `src/lib/thresholds.ts`).
- `src/components/alerta-popup.tsx` — "Central de Alertas" dialog; auto-opens once per client session when any alert exists (mounted in `app-shell.tsx`).

### Layout & shared components

- `src/components/app-shell.tsx` — sidebar + header + mobile drawer + alert popup mounting.
- `src/components/module-page.tsx` — `ModuleHeader`, `SortableHeader`, `RowActions` (shared ⋮ dropdown used by all module routes — **extend with optional props only**, never break the other call sites).
- `src/components/entity-form.tsx` — generic create/edit form rendered as a **Sheet** (side panel), not a Dialog.
- `src/components/seletor-buscavel.tsx` — searchable combobox (Popover + cmdk) with grouped options; used for event linking.
- `src/components/lembrete-popover.tsx` — email reminder popover (cmdk multi-select recipients + "+" cadastro + last-send info); trigger is the "Enviar lembrete" button in `castanhas.tsx` (admin/editor only).
- `src/components/evento-card.tsx` — event details dialog + linked castanha pedidos (link/unlink).
- `src/components/anexo-viewer.tsx` — in-app PDF viewer for data-URL attachments.
- `src/components/mobile-card-list.tsx` — mobile card list (only `estoque-canetas` uses it; **castanhas is still table-only** with horizontal scroll on mobile).

### Routes (16 files in `src/routes/`)

Public: `login.tsx`, `reset-callback.tsx`. Auth-guarded (client-side `beforeLoad` in `__root.tsx`): `index.tsx` (dashboard), `admin.tsx`, `perfil.tsx`, `historico.tsx`, `alertas.tsx`, `eventos.tsx`, `castanhas.tsx`, `colaboradores.tsx`, `financeiro.tsx`, `estoque-canetas.tsx`, `estoque-copos.tsx`, `estoque-fardamentos.tsx`, `gastos-endomarketing.tsx`.

### Entry & middleware

- `src/server.ts` — custom worker entry: wraps SSR fetch with an error-page fallback.
- `src/start.ts` — registers error + CSRF middleware (**CSRF covers all `serverFn` handlers**).
- `src/router.tsx` — router + QueryClient setup.

### Build/deploy tooling

- `scripts/patch-cf-build.js` — post-build fix for a Nitro circular ESM dependency on CF Workers (inlines the CSRF middleware chunk). Runs via `npm run build:cf`; self-skips if no cycle is found. Any new server function becomes part of these chunks — always build with `build:cf`.
- Generated `.output/server/wrangler.json` at build time (name `mktlema-lemahub`, `nodejs_compat`). The generated worker **exports a `scheduled()` handler wired to Nitro's `cloudflare:scheduled` hook — currently unused** (no `triggers.crons`).

## Supabase Schema (`supabase-migration.sql`)

Idempotent, re-runnable in the SQL Editor. Sections: 1 tables, 2 RLS, 3 GRANTs, 4 Realtime, 5 trigger `log_historico()`, 6 storage buckets, 7 seed, 8 `evento_id` ALTER.

- **Tables**: `colaboradores`, `compras_castanhas`, `compras_financeiro`, `eventos`, `estoque_fardamentos`, `estoque_canetas`, `estoque_copos`, `gastos_endomarketing`, `historico_edicoes`, `perfis` (id → auth.users ON DELETE CASCADE, `email`, `nome`, `role CHECK admin|editor|leitor`), `destinatarios_lembrete` (global reminder recipients — RLS role-gated admin/editor), `envios_lembrete` (send log/auditoria — no client write policies; written only by service role and pg_cron). All domain rows: UUID PK `gen_random_uuid()`, dates as **TEXT `yyyy-mm-dd`**, `created_at`/`updated_at` timestamptz. Section 9 also creates the private `lembretes` schema with `enviar_lembretes_eventos()` (SECURITY DEFINER, execution revoked from all client roles) scheduled by pg_cron job `lembretes-eventos-email` (`0 * * * *`).
- **RLS**: domain tables get a single `authenticated_all` policy (`TO authenticated`, `USING true`, `WITH CHECK true`). `perfis` gets granular `perfis_select/insert/update/delete` (insert allows self or admin). Wrap new policies in `IF NOT EXISTS (SELECT 1 FROM pg_policies ...)` guards.
- **Realtime publication**: domain tables + `historico_edicoes`. **`perfis` is NOT in the publication** (user management needs manual refresh).
- **Trigger** `log_historico()` auto-fills `usuario_id`/`usuario_nome` from `auth.uid()` (service-role writes log as `'Sistema'`).
- `compras_castanhas.evento_id` is plain TEXT, **no FK** — linking is by convention; deleting an event nulls its pedidos manually in `eventos.tsx`.
- `anexo_url` columns store base64 data-URLs (≤2MB) in Postgres — **not** Supabase Storage.

**Checklist to add a new client-visible table:** (1) migration SQL (table + RLS + GRANT + publication line), (2) type + `TabelaNome` + `DBShape` + `LABELS` in `types.ts`, (3) `TABLES` + realtime channel entry in `store.ts`. `insertRow` requires ALL columns on insert.

## Cloudflare Workers Specifics

1. **Circular ESM dependency** fixed by the post-build patch (see above).
2. **Secrets land on `globalThis.__env__`** at runtime (the generated entry does `globalThis.__env__ = env` in `fetch`); `getEnv()` reads it.
3. **Deploy command** (there is NO `npm run deploy` script): `$env:CLOUDFLARE_ACCOUNT_ID="1335a4fd63bf7c4626fb5686fac51b53"; npx wrangler deploy --config .output/server/wrangler.json` — run after `npm run build:cf`. The `--config` flag is REQUIRED: wrangler does not auto-discover the generated config from the repo root. For `secret put` use `--name mktlema-lemahub`.
4. Worker `mktlema-lemahub`, live at https://mktlema-lemahub.holy-bush-967a.workers.dev

## Development Commands

- `npm run dev` — dev server (port 3000)
- `npm run build` / `npm run build:cf` (build + CF patch) / `npm run build:dev`
- `npm run lint` — ESLint (warnings allowed, errors not)
- `npm run format` — Prettier
- `npx tsc --noEmit` — type check
- Deploy: `npm run build:cf` then the wrangler command above

## Deploy Protocol (mandatory after every change that should go live)

1. `npm run lint` (warnings allowed, errors not)
2. `npx tsc --noEmit`
3. `npm run build:cf`
4. `$env:CLOUDFLARE_ACCOUNT_ID="1335a4fd63bf7c4626fb5686fac51b53"; npx wrangler deploy --config .output/server/wrangler.json`
5. Fetch the live URL and verify the new assets loaded (new hashes, favicon, etc.)
6. Commit and push to GitHub
7. Schema changes: apply the new `supabase-migration.sql` sections in the Supabase SQL Editor (the file is idempotent)

## Code Conventions (as actually practiced)

- **Language**: all UI text in pt-BR
- **Formatting**: 2-space indent, double quotes, trailing commas, semicolons (Prettier; `.prettierrc`: printWidth 100 — no tabs despite what older docs said)
- **Dates**: stored/transported as `yyyy-mm-dd` TEXT; displayed via `d.split("-").reverse().join("/")` (the `br()` helper) — **not** `toLocaleDateString`
- **Toasts**: `import { toast } from "sonner"`. `ResultadoOperacao` → `r.ok ? toast.success(...) : toast.error(r.erro)`. Server fns **throw** → try/catch with `err instanceof Error ? err.message : "fallback pt-BR"`
- **Loading states**: `useState` boolean + `disabled` + label swap (`"Enviando..."`) — no spinner component
- **Buttons**: icon-left pattern (`<Mail className="size-4" /> Enviar lembrete`); destructive dropdown items get `text-destructive`
- **Dialogs**: `Dialog` for popups/details; `Sheet` for forms and drawers
- **Components**: functional only, named exports
- **State**: `useDb()` for domain data — never `useState` for it
- **Auth in components**: `await currentConta()` etc. — always async
- **TypeScript**: strict; explicit return types on exported functions
- **ESLint**: no unused vars (underscore exception), React hooks rules; allowed warnings: `react-refresh/only-export-components`, `noUnusedFunctionParameters`

## Security Rules

- Service-role key and any third-party API key (e.g. `RESEND_API_KEY`) live **only** in Worker secrets / server env / Supabase Vault. Never `VITE_`-prefix.
- Every server function must validate the caller: reuse the `requireAdmin()` pattern (direct fetch with the client's JWT) or a role-scoped variant.
- RLS on every table in `public`. For role-gated tables use `TO authenticated` + `EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND role IN (...))` predicates (see `perfis_insert`).
- `SECURITY DEFINER` functions: keep them in a non-exposed schema and `REVOKE EXECUTE FROM PUBLIC, anon, authenticated`.
- UPDATE policies need both `USING` and `WITH CHECK`.

## Known Sharp Edges

- `AGENTS.md` was stale until the 2026-09-01 rewrite. `HANDOFF.md` predates: mobile drawer nav, AnexoViewer, admin reset fixes, event↔castanha linking, alert popup, `SeletorBuscavel` (see its update section).
- The 3-day alert window is hardcoded and duplicated in 4 files (see Alerts above).
- `historico_edicoes` client-side `log()` writes are local-only optimistic entries; the Postgres trigger is the source of truth.
- **Supabase default privileges grant ALL on new tables to `anon`/`authenticated`** — always add explicit REVOKEs for anything beyond the intended access (see section 9.4 of the migration).
- Vault on this project is the `supabase_vault` extension (schema `vault`); `vault.create_secret(name)` + `vault.decrypted_secrets` view.
- `perfis` is not realtime — user management needs manual refresh.
- No tests, no CI — **the deploy protocol is the verification pipeline**.

## Documentation Index

| File | Purpose |
|---|---|
| `AGENTS.md` | This guide — architecture, conventions, deploy protocol |
| `HANDOFF.md` | Infra credentials, past problems + fixes, update log |
| `docs/LEMBRETES-EMAIL-PLANO.md` | **Active plan** — email reminders via Resend; read before email work |
| `README.md` | Default Lovable template (generic, safe to ignore) |
