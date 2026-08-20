# LEMA Demand Hub — AI Agent Guide

## Overview

Internal marketing demand management tool for LEMA endomarketing. Built with TanStack Start (React 19, SSR), TypeScript, Tailwind CSS, Supabase (Auth + PostgREST + Realtime), TanStack Query.

## Architecture

- **Framework**: TanStack Start (SSR + client), React 19, TypeScript 5.9
- **Data**: Supabase PostgREST + Realtime subscriptions (via `src/lib/store.ts`)
- **Auth**: Supabase Auth with role-based access (`src/lib/auth.ts`)
- **State**: `useSyncExternalStore` for app state, TanStack Query for server functions
- **UI**: shadcn/ui components (`src/components/ui/`), Tailwind CSS, Radix primitives
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts

## Key Files

### Data Layer

- `src/lib/store.ts` — **Core module**. All CRUD operations, Realtime subscriptions, Supabase queries. Exports: `useApp()`, `insertRow()`, `updateRow()`, `deleteRow()`, `setCurrentUser()`, `subscribeRealtime()`, `getItemById()`, `isSacas()`. **Must be called from React components or functions accepting a RenderContext parameter** (do not import and call directly in modules without passing context).
- `src/lib/types.ts` — All TypeScript interfaces (`Item`, `Dado`, `ControleCaneta`, `Fardamento`, `Gasto`, `Alerta`, `Solicitacao`, `HistoricoEdicao`, `Conta`). Domains: `Item | "eventos" | "colaboradores" | "financeiro" | "historico" | "estoque-canetas" | "estoque-copos" | "estoque-fardamentos" | "gastos-endomarketing"`.
- `src/lib/csv.ts` — CSV parser/generator
- `src/lib/csv-import.ts` — Module-specific CSV import definitions for each domain

### Auth & Server Functions

- `src/lib/auth.ts` — Supabase Auth: `login()`, `logout()`, `subscribeAuth()`, `currentEmail()`, `currentConta()`, `currentNome()`, `isAdmin()`, `hasRole()`, `checkViewAccess()`, `listUsers()`, `createUser()`, `resetPassword()`, `deleteUser()`, `alterarSenhaPropria()`
- `src/lib/gate.functions.ts` — Server functions re-exported from auth.ts
- `src/lib/admin.functions.ts` — Admin functions using service role key

### Layout & Components

- `src/components/app-shell.tsx` — Main layout (sidebar, header, mobile drawer, breadcrumb). Contains `ModulePage` component — all route modules render through this. Manages sidebar state, theme, and global alerts.
- `src/components/entity-form.tsx` — Generic form for creating/editing items (handles event vs inventory vs colaborador vs other types). Supports `initialData`, `onSubmit`, `onCancel`, optional `renderHeader` slot.
- `src/components/module-page.tsx` — Reusable module page wrapper (title, tabs, date filters, density toggle, summary panel, footer)
- `src/components/historico-lista.tsx` — History list component (renders in dialog or standalone)
- `src/components/historico-dialog.tsx` — History dialog with filters, date range, search
- `src/components/calendar-board.tsx` — Kanban-style calendar board
- `src/components/colaborador-card.tsx` — Collaborator card (used in calendar)
- `src/components/proximity-dot.tsx` — Event proximity indicator
- `src/components/brand.tsx` — `BrandLogo` (wordmark) and `BrandSymbol` (icon). `tone` prop: `"themed"` (auto dark/light via `dark:`) or `"white"`.
- `src/components/calendar-mode-toggle.tsx` — Shared `CalendarModeToggle` (ToggleGroup: Eventos | Aniversários | Ambos)
- `src/components/evento-card.tsx` — `EventoCard` dialog: event details + all fields + Editar button
- `src/components/alerts/alert-manager.tsx` — Alert system manager
- `src/components/alerts/lista-alertas.tsx` — Alert list display

### Routes

- `src/routes/__root.tsx` — Root layout (providers, QueryClient, sidebar, header, Toaster, main content)
- `src/routes/login.tsx` — Login page (email/password via Supabase Auth)
- `src/routes/index.tsx` — Dashboard home
- `src/routes/admin.tsx` — Admin panel (user CRUD, role management via Supabase perfis)
- `src/routes/perfil.tsx` — Profile page (edit name, email, password)
- `src/routes/historico.tsx` — Global edit history
- `src/routes/alertas.tsx` — Alert management
- `src/routes/eventos.tsx` — Event management
- `src/routes/castanhas.tsx` — Chestnuts inventory (Eventos domain)
- `src/routes/colaboradores.tsx` — Collaborator management (Eventos domain)
- `src/routes/financeiro.tsx` — Financial management (Eventos domain)
- `src/routes/estoque-canetas.tsx` — Pen inventory
- `src/routes/estoque-copos.tsx` — Cup inventory
- `src/routes/estoque-fardamentos.tsx` — Uniform inventory
- `src/routes/gastos-endomarketing.tsx` — Endomarketing expenses

### Backend

- `src/lib/supabase.ts` — Supabase client initialization
- `supabase-migration.sql` — Database schema, RLS policies, triggers, seed data
- `.env.example` — Required env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## Development Commands

- `npm run dev` — Start dev server (port 3000)
- `npm run build` — Production build
- `npm run lint` — ESLint check
- `npm run format` — Prettier format
- `npx tsc --noEmit` — TypeScript check

## Code Conventions

- **Language**: All UI text in Brazilian Portuguese (pt-BR)
- **Formatting**: Tabs, double quotes, trailing commas, semicolons (Prettier)
- **Styling**: Tailwind CSS v4, shadcn/ui components, `cn()` utility from `src/lib/utils.ts`
- **Components**: Functional components only, no class components
- **Forms**: React Hook Form + Zod validation patterns
- **State**: Use `useApp()` for app state (not useState for domain data)
- **Auth**: `await currentConta()`, `await currentEmail()`, `await currentNome()` — always async
- **Database**: Supabase client-side queries for data, server functions with service role key for admin operations
- **Queries**: Always use TanStack Query for server functions (queryKey must be unique and descriptive)
- **Exports**: Named exports only, component files export single component
- **TypeScript**: Strict mode, explicit return types on exported functions
- **Errors**: Toast notifications via sonner (`import { toast } from "sonner"`)
- **Date handling**: `new Date(dateString).toLocaleDateString("pt-BR")` for display

## Supabase Schema (applied via supabase-migration.sql)

- `contas` (slug PK) — Organization accounts
- `perfis` (UUID PK → auth.users) — User profiles with `conta_slug` + `funcao` roles
- Domain tables: `items`, `dados`, `controles_canetas`, `controles_copos`, `fardamentos`, `gastos`, `alertas`, `solicitacoes`, `historico_edicoes`
- RLS enabled on all tables; `authenticated_all` policy for domain tables
- Triggers: `log_historico()` auto-fills `usuario_id`/`usuario_nome` on `historico_edicoes`
- Realtime enabled on all domain tables (not historico_edicoes — trigger populates server-side)

## Linting Rules

- Prettier: tabs, double quotes, trailing commas, semicolons
- ESLint: TypeScript strict, React hooks rules, no unused vars (with underscore exception), no console in production
- Warnings allowed: `noExplicitAny` (off), `react-refresh/only-export-components` (warn), `noUnusedFunctionParameters` (warn)
