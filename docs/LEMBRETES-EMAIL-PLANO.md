# Plano — Lembretes por E-mail via Resend (LEMA Demand Hub)

**Status:** em execução — Fase 0 concluída; Fase 1 escrita (aguardando aplicação no SQL Editor); Fases 2–4 pendentes
**Elaborado em:** 2026-09-01 (sessão de planejamento com análise completa do codebase; fatos verificados contra o código)
**Execução:** Fases 1→4, nesta ordem. A **Fase 0 (pré-voô) é responsabilidade do usuário** e bloqueia os testes (não a implementação). Ver §12 (checklist).

---

## 1. Contexto e objetivo

O hub não envia nenhum e-mail próprio hoje (o único e-mail existente é o reset de senha, enviado pelo Supabase Auth). Este plano adiciona dois fluxos com o provider **Resend** (conta já existente, domínio `lemaef.com.br` com DNS na Cloudflare):

1. **Lembrete manual por pedido de castanhas** — botão "Enviar lembrete" em cada linha da tabela de castanhas; abre um popover com lista de destinatários cadastrados (seleção múltipla) e botão "+" para cadastrar novo e-mail; envia texto pré-determinado.
2. **Lembrete automático de eventos** — enviado por e-mail aos usuários do hub (roles admin/editor) na véspera e no dia de cada evento, semelhante ao sistema interno de alertas (janela de 3 dias em `src/lib/alerts.ts`).

O **layout dos e-mails será elaborado posteriormente** — este plano entrega a mecânica com templates placeholder em pt-BR.

Prioridades do usuário: **segurança de dados e estabilidade acima de tudo.**

## 2. Decisões confirmadas com o usuário (2026-09-01)

| # | Decisão | Escolha |
|---|---|---|
| 1 | Posição do botão | Visível ao final de cada linha, à direita, **dentro do quadro**, respeitando margens (não no menu ⋮ — `RowActions` fica intacto) |
| 2 | Seleção de destinatários | Múltipla: checkboxes + botão "Enviar (N)" |
| 3 | Scheduler dos automáticos | **Supabase pg_cron + pg_net** (lógica dentro do banco, desacoplada do pipeline de deploy do worker) |
| 4 | Cadência dos automáticos | **Véspera + dia** do evento |
| 5 | Destinatários dos automáticos | Somente perfis com role `admin` ou `editor` |
| 6 | Permissões | Envio manual e gestão da lista de destinatários: **somente admin/editor** |
| 7 | Domínio de envio | `LEMA Hub <lembretes@compliance.lemaef.com.br>` — domínio já verificado na conta, entrega em qualquer destinatário (adotado 2026-09-02 após o modo teste `onboarding@resend.dev` mandar e-mails pro spam do Gmail). Remetente definitivo `@lemaef.com.br`/subdomínio: quando o time de tecnologia registrar no Resend (1 clique via Cloudflare), trocar em 2 linhas (migration 9.6 + `lembretes.functions.ts`) |

## 3. Arquitetura da solução

### A) Lembrete manual (cliente → server function → Resend)

```
[castanhas.tsx: botão "Enviar lembrete" por linha]
  → [LembretePopover: cmdk + checkboxes + "+"]
  → [enviarLembreteCastanha — createServerFn em src/lib/lembretes.functions.ts]
      1. requireEditor(accessToken)  — valida JWT + role admin/editor
      2. busca pedido via service client
      3. valida e-mails (regex, dedupe, máx. 50)
      4. cooldown 12h por pedido+destinatário (consulta envios_lembrete)
      5. SDK resend → POST https://api.resend.com/emails
      6. registra em envios_lembrete (auditoria)
  → toast sonner de sucesso/erro
```

Caminho oficial documentado para esta stack (docs Resend + TanStack Start + Cloudflare Workers): `createServerFn` + SDK `resend`, chave `RESEND_API_KEY` como **wrangler secret** (nunca `VITE_`).

### B) Lembrete automático (100% dentro do Supabase)

```
[pg_cron: '0 * * * *' (horário)]
  → lembretes.enviar_lembretes_eventos()  — SECURITY DEFINER, schema privado
      1. "hoje" calculado em America/Sao_Paulo
      2. eventos com data_inicio = hoje (fase 'dia') ou hoje+1 (fase 'vespera')
      3. dedupe: (tipo=fase, referencia_id=evento) já enviado → pula
      4. destinatários: perfis role IN ('admin','editor')
      5. digest HTML → net.http_post → Resend (chave lida do Vault)
      6. INSERT em envios_lembrete por evento notificado
```

Zero acoplamento com o worker/app: deploys do hub nunca afetam o cron e vice-versa. Contrapartida: o template HTML do e-mail automático vive em SQL (aceitável; template placeholder; refinamento na fase de layout).

**Por que pg_cron e não Cloudflare Cron:** escolha explícita do usuário — evita mexer no pipeline de build/deploy (que contém o `scripts/patch-cf-build.js`, ponto historicamente frágil). O worker gerado já exporta `scheduled()` mas ele permanece não utilizado.

### Duplicação da chave Resend (aceita e documentada)

A mesma `RESEND_API_KEY` existirá em dois lugares: wrangler secret (fluxo manual) e Vault do Supabase (fluxo cron). Documentar ambos no HANDOFF.md.

## 4. Fase 0 — Pré-voô (responsabilidade do usuário) — CONCLUÍDA em 2026-09-01

1. ~~Verificar domínio `lemaef.com.br`~~ → decidido: **testar sem DNS** com `onboarding@resend.dev`. O DNS do lemaef.com.br fica com o time de tecnologia; quando quiserem o remetente definitivo, registrar o domínio (ou subdomínio `lembretes.lemaef.com.br`) no Resend com o botão "Sign in to Cloudflare" (setup automático) e trocar o `from` no bloco 9.6 da migration. A conta já tem `compliance.lemaef.com.br` verificado (uso anterior) como fallback imediato.
2. ✅ API key criada (Sending access)
3. ✅ Extensões `pg_cron` + `pg_net` habilitadas
4. ✅ Remetente de teste: `LEMA Hub <onboarding@resend.dev>`

**Restrição do modo teste** (from em `@resend.dev` sem domínio verificado): o Resend entrega SOMENTE no e-mail dono da conta (`marketinglemaconsultoria@gmail.com`); qualquer outro destinatário → 403 e o e-mail inteiro é rejeitado. Destinatários devem ser endereços puros (sem nome de exibição) — a função já envia assim. Por isso o digest automático (2+ destinatários `@lemaef.com.br`) retornará 403 no modo teste — **esperado**; valida a cadeia via `net._http_response`, e a entrega real acontece sem mudança de código quando um domínio LEMA for verificado.

**Superado (2026-09-02):** remetente trocado para `lembretes@compliance.lemaef.com.br` (domínio já verificado na conta) — a restrição do modo teste não se aplica mais e a entrega ocorre em qualquer destinatário. Motivação: os e-mails do `onboarding@resend.dev` chegavam no spam do Gmail.

## 5. Fase 1 — Schema + agendamento (`supabase-migration.sql`, nova seção 9)

### 5.1 Tabela `destinatarios_lembrete` (lista global de contatos)

```sql
CREATE TABLE IF NOT EXISTS destinatarios_lembrete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE destinatarios_lembrete ENABLE ROW LEVEL SECURITY;
```

Policies no estilo `perfis_*` (sempre com guard `IF NOT EXISTS (pg_policies...)`):

```sql
-- SELECT / INSERT / UPDATE / DELETE, todos TO authenticated com:
EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND role IN ('admin', 'editor'))
-- UPDATE precisa de USING **e** WITH CHECK com o mesmo predicado
```

- GRANT `SELECT, INSERT, UPDATE, DELETE` para `authenticated` (seguir o bloco existente).
- Adicionar à publicação realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE destinatarios_lembrete;`
- **Não** adicionar trigger `log_historico` (não é tabela de domínio de negócio).

### 5.2 Tabela `envios_lembrete` (log de auditoria + dedupe + cooldown)

```sql
CREATE TABLE IF NOT EXISTS envios_lembrete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('castanha', 'vespera', 'dia')),
  referencia_id UUID,              -- id do pedido (castanha) ou do evento
  destinatarios TEXT[] NOT NULL,
  assunto TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'enviado' CHECK (status IN ('enviado', 'erro')),
  detalhe TEXT,                    -- id do e-mail no Resend ou mensagem de erro
  disparado_por TEXT NOT NULL DEFAULT 'Sistema',  -- nome do usuário ou 'pg_cron'
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE envios_lembrete ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_envios_lembrete_ref
  ON envios_lembrete (tipo, referencia_id, created_at DESC);

-- Policy: apenas SELECT para admin/editor.
-- SEM policies de INSERT/UPDATE/DELETE para clientes:
-- escrita acontece só via service role (server fn) e pg_cron (postgres).
```

`envios_lembrete` **não** entra no store do cliente nem no realtime (a UI consulta on-demand via cliente Supabase quando abre o popover).

### 5.3 Vault

```sql
SELECT vault.create_secret('<RESEND_API_KEY>', 'resend_api_key');
-- leitura dentro da função:
-- SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'resend_api_key';
```

Se o Vault não estiver disponível no projeto, fallback: tabela de config em schema não-exposto com `REVOKE` total (menos ideal — registrar no HANDOFF).

### 5.4 Função `lembretes.enviar_lembretes_eventos()`

Schema privado (fora do `public`, invisível à Data API):

```sql
CREATE SCHEMA IF NOT EXISTS lembretes;

CREATE OR REPLACE FUNCTION lembretes.enviar_lembretes_eventos()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_api_key text;
  v_destinatarios text[];
  v_assunto text := 'Lembrete — Eventos nos próximos dias';
  v_html text;
BEGIN
  -- 1. chave do Vault (RAISE EXCEPTION pt-BR se ausente)
  -- 2. destinatários: SELECT array_agg(email) FROM perfis WHERE role IN ('admin','editor')
  --    (se vazio → RETURN silencioso)
  -- 3. eventos pendentes:
  --    SELECT e.id, e.nome, e.data_inicio, e.cidade, e.estado,
  --           CASE WHEN e.data_inicio::date = hoje THEN 'dia' ELSE 'vespera' END AS fase
  --    FROM eventos e
  --    WHERE e.data_inicio::date IN (hoje, hoje + 1)
  --      AND NOT EXISTS (SELECT 1 FROM envios_lembrete el
  --                      WHERE el.tipo = <fase> AND el.referencia_id = e.id
  --                        AND el.status = 'enviado')
  --    (se nenhum → RETURN)
  -- 4. monta v_html: digest placeholder listando nome, cidade/estado e data (dd/mm) de cada evento
  -- 5. envio via pg_net (assinatura confirmada na doc oficial: body é jsonb):
  --    PERFORM net.http_post(
  --      url := 'https://api.resend.com/emails',
  --      body := jsonb_build_object(
  --        'from', 'LEMA Hub <onboarding@resend.dev>',  -- modo teste; ver §4
  --        'to', to_jsonb(v_destinatarios),
  --        'subject', v_assunto,
  --        'html', v_html,
  --        'tags', jsonb_build_array(jsonb_build_object('name','tipo','value','evento'))
  --      )::text,
  --      headers := jsonb_build_object('Authorization','Bearer '||v_api_key,'Content-Type','application/json')
  --    );
  -- 6. INSERT INTO envios_lembrete (tipo, referencia_id, destinatarios, assunto, status, disparado_por)
  --    SELECT fase, id, v_destinatarios, v_assunto, 'enviado', 'pg_cron' FROM <pendentes>
  -- Tudo dentro de EXCEPTION handling — a função nunca deve explodir o cron.
END $$;

REVOKE EXECUTE ON FUNCTION lembretes.enviar_lembretes_eventos() FROM PUBLIC, anon, authenticated;
```

**Fuso horário**: pg_cron dispara em UTC; a função calcula "hoje" via `(now() AT TIME ZONE 'America/Sao_Paulo')::date` — correto independente do horário do disparo.

**Dedupe "ever"** (por evento+fase, sem janela de data): um evento só recebe uma notificação de véspera e uma de dia, mesmo se o cron rodar 24x/dia. Efeito colateral aceito: evento com `data_inicio` **editada depois** de notificado não re-dispara.

### 5.5 Agendamento pg_cron (idempotente)

```sql
-- só agendar se não existir:
SELECT cron.schedule('lembretes-eventos-email', '0 * * * *',
  $$SELECT lembretes.enviar_lembretes_eventos()$$);
-- idempotência: IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lembretes-eventos-email')
```

Horário (e não diário) para capturar eventos cadastrados em cima da hora — o dedupe impede tempestade de e-mails.

### 5.6 Aplicação e teste da Fase 1 — via Supabase MCP

**MCP configurado e autenticado em 2026-09-01** (`~/.config/opencode/opencode.jsonc`, servidor remoto OAuth escopado ao projeto `uhlckghszxdioacrlehi`, ferramentas `execute_sql`/`get_advisors`/`search_docs`). O agente aplica e testa diretamente; alternativa manual continua sendo o SQL Editor do dashboard.

1. Aplicar a seção 9 via MCP `execute_sql` (o texto é idempotente) e rodar `get_advisors` para validar as policies/função novas.
2. `SELECT vault.create_secret('<chave real>', 'resend_api_key');` — o usuário fornece a chave na sessão ou roda esta linha ele mesmo no SQL Editor (nunca commitar).
3. **Teste 1** — envio pontual via `net.http_post` para `marketinglemaconsultoria@gmail.com` (dono da conta; único destinatário permitido no modo `onboarding@resend.dev`) → esperado: e-mail na caixa + `status_code 200` em `net._http_response`.
4. **Teste 2** — evento-teste com `data_inicio` = amanhã → `SELECT lembretes.enviar_lembretes_eventos();` → esperado: linha em `envios_lembrete` (tipo 'vespera', disparado_por 'pg_cron') + **403** em `net._http_response` (2 destinatários `@lemaef.com.br` no modo teste) → rodar de novo → dedupe (sem novas linhas) → conferir `cron.job`.
5. Limpeza: remover o evento-teste e as linhas de log de teste.

## 6. Fase 2 — Envio manual (backend)

### 6.1 Dependência e segredo

- `npm i resend` — **pinar versão e commitar lockfile** (regra da skill supabase).
- `npx wrangler secret put RESEND_API_KEY` (com `CLOUDFLARE_ACCOUNT_ID` setado).
- Local: `.dev.vars` com `RESEND_API_KEY=...` (gitignored). Antes, verificar como `SUPABASE_SERVICE_ROLE_KEY` chega às server functions no `npm run dev` hoje e replicar o mesmo mecanismo.

### 6.2 Novo arquivo `src/lib/lembretes.functions.ts`

Seguir o padrão de `src/lib/admin.functions.ts`:

- **Exportar** `getEnv`, `getAdminClient` e o núcleo de `requireAdmin` de `admin.functions.ts` (hoje são internos) para reuso — ou duplicar localmente se exportar gerar atrito com o bundler.
- `requireEditor(accessToken)`: igual ao `requireAdmin` mas aceitando perfis role IN ('admin','editor'). Erros sempre em pt-BR.
- `enviarLembreteCastanha`:

```ts
export const enviarLembreteCastanha = createServerFn({ method: "POST" })
	.validator((d: { accessToken: string; pedidoId: string; destinatarios: { nome: string; email: string }[] }) => d)
	.handler(async ({ data }) => {
		// 1. await requireEditor(data.accessToken)
		// 2. service client: buscar pedido por id (erro pt-BR se não existir)
		// 3. validar destinatários: regex de e-mail, dedupe, máx. 50 (limite Resend)
		// 4. cooldown: service client consulta envios_lembrete
		//    WHERE tipo='castanha' AND referencia_id=pedidoId
		//      AND created_at > now() - intervalo de 12h
		//      AND destinatarios && e-mails selecionados (overlap)
		//    → se houver: throw "Lembrete já enviado recentemente para <e-mail>."
		// 5. new Resend(getEnv("RESEND_API_KEY")).emails.send({
		//      from: "LEMA Hub <onboarding@resend.dev>",   // modo teste — ver §4; trocar quando verificarem domínio LEMA
		//      to: e-mails, subject: `Lembrete — Pedido de castanhas ${pedido.fornecedor}`,
		//      html: templateLembreteCastanha(pedido),        // placeholder pt-BR
		//      tags: [{ name: "tipo", value: "castanha" }],
		//    })  → error ? throw new Error(pt-BR) : null
		// 6. registrar em envios_lembrete (service client, disparado_por = user.email/nome)
		// return { ok: true }
	});
```

- **Template placeholder** `templateLembreteCastanha(pedido)`: HTML simples pt-BR com fornecedor, finalidade (ou nome do evento vinculado via `evento_id`), prazo de entrega (dd/mm), status das NFs e observação. Layout refinado depois.
- `.env.example`: adicionar `RESEND_API_KEY=` com comentário "server-only, nunca VITE_".

## 7. Fase 3 — Interface

### 7.1 Data layer

- `src/lib/types.ts`: novo tipo `DestinatarioLembrete = { id; nome; email; created_at; updated_at }`; adicionar `"destinatarios_lembrete"` em `TabelaNome`, `DBShape` e `LABELS` ("Destinatários de Lembrete").
- `src/lib/store.ts`: adicionar `"destinatarios_lembrete"` em `TABLES` e uma entrada `.on("postgres_changes", ...)` no canal realtime (refetch igual às demais).

### 7.2 Novo componente `src/components/lembrete-popover.tsx`

- `Popover` + `Command` (cmdk — mesmo padrão do `seletor-buscavel.tsx`), anchor no botão da linha.
- **Conteúdo**:
  - Header: "Enviar lembrete" + botão **"+"** (canto superior direito) que alterna um mini-formulário inline (nome + e-mail + "Salvar").
  - Lista buscável de destinatários (`db.destinatarios_lembrete`), cada item com `Checkbox` (seleção múltipla) e ícone de lixeira (remover — `deleteRow`, imediato + toast, consistente com o resto do app).
  - Footer: data/hora do **último envio** deste pedido (consulta on-demand a `envios_lembrete` via cliente Supabase ao abrir o popover) + botão **"Enviar (N)"** (`disabled` com N=0, label "Enviando..." durante o envio).
- **Cadastro via "+"**: validação simples de e-mail client-side; `insertRow("destinatarios_lembrete", { nome, email })` (exige todos os campos — só nome+email); violação do UNIQUE de e-mail → `toast.error("E-mail já cadastrado")`.
- **Envio**: `supabase.auth.getSession()` → `access_token` (padrão do `admin.tsx`) → `enviarLembreteCastanha` em try/catch → `toast.success`/`toast.error` → atualizar "último envio".

### 7.3 `src/routes/castanhas.tsx`

- Nova coluna entre "Notas" e a coluna `w-12` (⋮): header alinhado à direita, célula com o `LembretePopover` (o trigger é `Button variant="outline" size="sm"` com `<Mail className="size-4" />` + "Enviar lembrete"), respeitando o padding da tabela e com espaçamento antes do ⋮.
- **Visível somente para admin/editor**: buscar `currentConta()` uma vez (com `subscribeAuth` para invalidação, padrão de `perfil.tsx`/`admin.tsx`); leitor não vê a coluna.
- `RowActions` permanece **intocado** (componente compartilhado por 8 módulos).

## 8. Fase 4 — Verificação, deploy e docs

1. `npm run lint` (erros não; warnings ok) → `npx tsc --noEmit` → `npm run build:cf`.
2. Confirmar itens da Fase 0 (domínio Verified, API key, extensões on, from address).
3. `npx wrangler secret put RESEND_API_KEY` (se ainda não feito) + Vault (Fase 1).
4. Deploy: `$env:CLOUDFLARE_ACCOUNT_ID="1335a4fd63bf7c4626fb5686fac51b53"; npx wrangler deploy` → verificar URL live.
5. **Testes end-to-end** (ver §12 para a lista completa).
6. Atualizar `HANDOFF.md` (segredos: wrangler + Vault; cron jobname; mecanismo de lembretes) e este plano (marcar itens do checklist).
7. Commit + push (protocolo de deploy do AGENTS.md).

## 9. Segurança e estabilidade — riscos e mitigações

| Risco | Mitigação |
|---|---|
| Chave Resend exposta no browser | `RESEND_API_KEY` só como wrangler secret (manual) e Vault (cron); **nunca** prefixo `VITE_` |
| Envio por usuário não autorizado | `requireEditor` valida JWT + role admin/editor em toda server fn; RLS role-gated nas duas tabelas novas |
| Função SECURITY DEFINER virar endpoint público | Schema `lembretes` não-exposto à Data API + `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` |
| Log de envios forjado pelo cliente | `envios_lembrete` sem policies de escrita para `authenticated` — só service role/cron escrevem |
| Tempestade de e-mails | Dedupe "ever" por (evento, fase); cron horário não re-envia; manual tem cooldown de 12h por pedido+destinatário; máx. 50 destinatários por envio |
| Fuso horário errado no cron | "Hoje" calculado dentro da função em `America/Sao_Paulo` |
| Erro no cron derrubar algo | Função com exception handling total; cron roda no Supabase, totalmente isolado do worker do app |
| Falha silenciosa do pg_net | `envios_lembrete.status` registra o estado; monitorável via dashboard Resend + consulta ao log |
| RLS UPDATE sem WITH CHECK | Policies de update com `USING` **e** `WITH CHECK` (checklist da skill supabase) |

## 10. Limitações conhecidas e follow-ups

- **Castanhas sem mobile-card**: a rota usa só tabela (scroll horizontal no mobile); o botão funciona na tabela. Follow-up opcional: adicionar `MobileCardList` à rota (padrão já existente em `estoque-canetas`).
- **pg_net é assíncrono**: o log `status='enviado'` significa "entregue ao Resend", não "recebido pelo destinatário". A resposta HTTP fica em `net._http_response` se for preciso auditar.
- **Dedupe "ever"**: evento com `data_inicio` editada após a notificação não re-dispara (aceito por estabilidade).
- **Cooldown fixo de 12h** no manual (ajustável no código).
- **Templates placeholder**: fase de layout futura — React Email (`@react-email/components`) para o fluxo manual; para o cron, o template vive em SQL.

## 11. Skills e fontes consultadas

- **Skills para a execução**: `supabase` (fetch changelog + docs antes de escrever o SQL; já carregada na sessão de planejamento), `supabase-postgres-best-practices` (antes de criar tabelas/policies/pg_cron), `verification-before-completion` (antes de declarar concluído).
- **Docs oficiais** (confirmam o caminho da integração): `resend.com/docs/send-with-tanstack-start`, `resend.com/docs/send-with-cloudflare-workers`, `developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start`.
- **React Email** (`@react-email/components`): recomendado para os templates na fase de layout.
- Nenhuma alternativa melhor que Resend foi encontrada para esta stack (o usuário já possui conta + domínio).

## 12. Checklist de execução

**Fase 0 (usuário) — concluída 2026-09-01**
- [x] Modo de teste definido: `onboarding@resend.dev`, sem DNS (domínio definitivo fica para depois, via time de tecnologia; `compliance.lemaef.com.br` verificado como fallback)
- [x] API key Resend criada
- [x] Extensões `pg_cron` + `pg_net` habilitadas no Supabase
- [x] Remetente de teste: `LEMA Hub <onboarding@resend.dev>`; dono da conta Resend: `marketinglemaconsultoria@gmail.com` (único destinatário que recebe no modo teste)

**Fase 1 — Schema + cron**
- [x] Seção 9 no `supabase-migration.sql`: tabelas, RLS, GRANTs, realtime, índice, função + `REVOKE`s, `cron.schedule` (escrita completa; remetente de teste `onboarding@resend.dev`)
- [x] Supabase MCP configurado e autenticado (`~/.config/opencode/opencode.jsonc`) — aplicação e testes via `execute_sql` pelo agente
- [x] Aplicar seção 9 via MCP + `get_advisors` (validar policies/função) — feito 2026-09-02: extensão Vault neste projeto = `supabase_vault` (corrigido no arquivo); grants fechados com REVOKEs extras (default privileges do Supabase davam ALL a anon/authenticated)
- [x] Vault: `resend_api_key` (criado 2026-09-02 via MCP; extensão `supabase_vault`)
- [x] Teste 1: envio pontual → **200** + id de e-mail do Resend (`4c703121...`) — entrega no Gmail confirmada pelo usuário pendente
- [x] Teste 2: evento-teste → log criado (tipo 'vespera', 'pg_cron', 4 destinatários) + **403 esperado** (restrição do modo teste, chave válida) + dedupe verificado (count=1 após re-execução) + limpeza feita
- [x] `cron.job` conferido ('lembretes-eventos-email', '0 * * * *')

**Fase 2 — Backend manual**
- [x] `npm i resend` (resend@6.25.0 pinada com --save-exact; lockfile atualizado)
- [x] `wrangler secret put RESEND_API_KEY --name mktlema-lemahub` — secret no worker OK; dev local: `.env` (mesmo mecanismo da service key)
- [x] `src/lib/lembretes.functions.ts`: `requireEditor` + `enviarLembreteCastanha` (validações, cooldown 12h, log, tags)
- [x] `.env.example` atualizado

**Fase 3 — UI**
- [x] `types.ts` + `store.ts`: `destinatarios_lembrete` (TabelaNome, DBShape, LABELS, TABLES, realtime) + entrada `Mail` em `alerta-icone.tsx` (o Record é total em TabelaNome)
- [x] `src/components/lembrete-popover.tsx` (cmdk + checkboxes + "+" com mini-form + último envio + lixeira)
- [x] `castanhas.tsx`: coluna "Lembrete" à direita (antes do ⋮), só admin/editor via `currentConta` + `subscribeAuth`; `RowActions` intacto; colSpan vazio 9/8

**Fase 4 — Verificação + docs**
- [x] `npm run lint` (0 erros; warnings pré-existentes permitidos) + `npx tsc --noEmit` limpo + `npm run build:cf` OK (patch do CF aplicado)
- [x] Deploy + verificação live (versão `fbeb2a83`; `/castanhas` respondendo) — comando: `npx wrangler deploy --config .output/server/wrangler.json`
- [x] Fix pós-teste (deploy `a069ef61`): guard de idempotência no canal realtime (`store.ts`) — o erro "cannot add postgres_changes callbacks after subscribe()" vinha da re-hidratação pós-login chamando `.on()` em canal já inscrito (bug pré-existente, ruído no console). Evidência Resend: e-mail do Teste 1 com `last_event: delivered` (entregue no Gmail — se não visto, estava no spam)
- [x] **Teste 3**: confirmado pelo usuário 2026-09-02 — 2 lembretes manuais no log (por `andrefelipe@`, 17:06/17:13) e e-mails entregues no Gmail (`last_event: delivered` na API do Resend); o `onboarding@resend.dev` caía no spam → switch para `compliance.lemaef.com.br` (deploy `3824832a`)
- [x] `HANDOFF.md` atualizado (segredos, cron, mecanismo, comando deploy); checklist deste doc marcado
- [ ] Commit + push
