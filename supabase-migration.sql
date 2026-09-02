-- ============================================================
-- LEMA Demand Hub — Migração Supabase
-- Rodar este SQL uma única vez no SQL Editor do Supabase
-- ============================================================

-- 1. SCHEMA: Tabelas
-- ============================================================

CREATE TABLE IF NOT EXISTS colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  data_ingresso TEXT,
  data_aniversario TEXT,
  setor TEXT,
  email TEXT,
  empresa_grupo TEXT,
  formato_trabalho TEXT DEFAULT 'presencial',
  genero TEXT,
  tem_filhos BOOLEAN DEFAULT false,
  tamanho_farda TEXT,
  tipo_contratacao TEXT,
  curso_formacao TEXT,
  detalhes_filhos TEXT,
  endereco TEXT,
  contato_emergencia_parentesco TEXT,
  contato_emergencia_nome TEXT,
  contato_emergencia_telefone TEXT,
  restricao_alimentar TEXT,
  hobby TEXT,
  foto_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compras_castanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante TEXT,
  finalidade TEXT,
  valor NUMERIC(10,2) DEFAULT 0,
  fornecedor TEXT,
  prazo_entrega TEXT,
  data_solicitacao TEXT,
  observacao TEXT DEFAULT '',
  numero_nf TEXT DEFAULT '',
  vinculado_a TEXT,
  anexo_url TEXT DEFAULT '',
  nota_fiscal_emitida BOOLEAN DEFAULT false,
  nota_enviada_financeiro BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compras_financeiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comprovante_url TEXT DEFAULT '',
  valor NUMERIC(10,2) DEFAULT 0,
  fornecedor TEXT DEFAULT '',
  solicitante TEXT,
  data_compra TEXT,
  data_orcamento TEXT DEFAULT '',
  finalidade TEXT,
  nota_fiscal_emitida BOOLEAN DEFAULT false,
  nota_enviada_financeiro BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT,
  data_inicio TEXT,
  data_fim TEXT,
  cidade TEXT,
  estado TEXT,
  local TEXT,
  associacao_relacionada TEXT,
  participantes TEXT[] DEFAULT '{}',
  materiais TEXT[] DEFAULT '{}',
  acao_promocional BOOLEAN DEFAULT false,
  acao_tipo TEXT,
  acao_tem_brindes BOOLEAN DEFAULT false,
  acao_descricao_brindes TEXT,
  acao_custo NUMERIC(10,2) DEFAULT 0,
  acao_necessarias TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estoque_fardamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peca TEXT,
  tamanho TEXT,
  cor TEXT DEFAULT '',
  estado TEXT DEFAULT '',
  modelagem TEXT DEFAULT '',
  empresa TEXT DEFAULT '',
  quantidade NUMERIC(10,2) DEFAULT 0,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estoque_canetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo TEXT,
  cor TEXT,
  quantidade NUMERIC(10,2) DEFAULT 0,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estoque_copos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT,
  capacidade TEXT,
  cor TEXT,
  quantidade NUMERIC(10,2) DEFAULT 0,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gastos_endomarketing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_evento TEXT,
  mes TEXT,
  descritivo TEXT,
  valor NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS historico_edicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela TEXT NOT NULL,
  registro_id UUID,
  usuario_id UUID,
  usuario_nome TEXT,
  acao TEXT CHECK (acao IN ('criacao', 'edicao', 'exclusao')),
  campo_alterado TEXT,
  valor_anterior TEXT,
  valor_novo TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Tabela de perfis (papéis de acesso — ligada a auth.users)
CREATE TABLE IF NOT EXISTS perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor', 'leitor')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS: Habilitar Row Level Security em todas as tabelas
-- ============================================================

ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras_castanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras_financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_fardamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_canetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_copos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_endomarketing ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_edicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

-- Policies: todos autenticados têm CRUD completo nas tabelas de domínio
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all' AND tablename = 'colaboradores') THEN
    CREATE POLICY authenticated_all ON colaboradores FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all' AND tablename = 'compras_castanhas') THEN
    CREATE POLICY authenticated_all ON compras_castanhas FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all' AND tablename = 'compras_financeiro') THEN
    CREATE POLICY authenticated_all ON compras_financeiro FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all' AND tablename = 'eventos') THEN
    CREATE POLICY authenticated_all ON eventos FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all' AND tablename = 'estoque_fardamentos') THEN
    CREATE POLICY authenticated_all ON estoque_fardamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all' AND tablename = 'estoque_canetas') THEN
    CREATE POLICY authenticated_all ON estoque_canetas FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all' AND tablename = 'estoque_copos') THEN
    CREATE POLICY authenticated_all ON estoque_copos FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all' AND tablename = 'gastos_endomarketing') THEN
    CREATE POLICY authenticated_all ON gastos_endomarketing FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all' AND tablename = 'historico_edicoes') THEN
    CREATE POLICY authenticated_all ON historico_edicoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Policies para perfis: autenticados leem; admin gerencia
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'perfis_select' AND tablename = 'perfis') THEN
    CREATE POLICY perfis_select ON perfis FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'perfis_insert' AND tablename = 'perfis') THEN
    CREATE POLICY perfis_insert ON perfis FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = id OR EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.role = 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'perfis_update' AND tablename = 'perfis') THEN
    CREATE POLICY perfis_update ON perfis FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'perfis_delete' AND tablename = 'perfis') THEN
    CREATE POLICY perfis_delete ON perfis FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- 3. GRANT: Expor tabelas via Data API (PostgREST)
-- ============================================================

DO $$ BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON colaboradores TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON compras_castanhas TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON compras_financeiro TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON eventos TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON estoque_fardamentos TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON estoque_canetas TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON estoque_copos TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON gastos_endomarketing TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON historico_edicoes TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON perfis TO authenticated;
END $$;

-- 4. REALTIME: Habilitar streaming para todas as tabelas de domínio
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE colaboradores, compras_castanhas, compras_financeiro, eventos, estoque_fardamentos, estoque_canetas, estoque_copos, gastos_endomarketing, historico_edicoes;

-- 5. TRIGGER: Histórico de edições via Postgres
-- ============================================================

CREATE OR REPLACE FUNCTION log_historico() RETURNS TRIGGER AS $$
DECLARE
  v_campo TEXT;
  v_antigo TEXT;
  v_novo TEXT;
  v_usuario_id UUID;
  v_usuario_nome TEXT;
  rec RECORD;
BEGIN
  v_usuario_id := auth.uid();
  v_usuario_nome := COALESCE(
    (SELECT nome FROM perfis WHERE id = v_usuario_id),
    (SELECT email FROM auth.users WHERE id = v_usuario_id),
    'Sistema'
  );

  IF TG_OP = 'INSERT' THEN
    INSERT INTO historico_edicoes (tabela, registro_id, usuario_id, usuario_nome, acao, campo_alterado, valor_anterior, valor_novo)
    VALUES (TG_TABLE_NAME, NEW.id, v_usuario_id, v_usuario_nome, 'criacao', NULL, NULL, NULL);
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO historico_edicoes (tabela, registro_id, usuario_id, usuario_nome, acao, campo_alterado, valor_anterior, valor_novo)
    VALUES (TG_TABLE_NAME, OLD.id, v_usuario_id, v_usuario_nome, 'exclusao', NULL, NULL, NULL);
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    FOR rec IN
      SELECT * FROM jsonb_each(to_jsonb(NEW) - 'id' - 'created_at' - 'updated_at')
    LOOP
      v_campo := rec.key;
      v_antigo := to_jsonb(OLD) ->> v_campo;
      v_novo := rec.value #>> '{}';
      IF v_antigo IS DISTINCT FROM v_novo THEN
        INSERT INTO historico_edicoes (tabela, registro_id, usuario_id, usuario_nome, acao, campo_alterado, valor_anterior, valor_novo)
        VALUES (TG_TABLE_NAME, NEW.id, v_usuario_id, v_usuario_nome, 'edicao', v_campo, v_antigo, v_novo);
      END IF;
    END LOOP;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, extensions;

-- Criar triggers para cada tabela de domínio
DO $$ BEGIN
  CREATE TRIGGER historico_colaboradores AFTER INSERT OR UPDATE OR DELETE ON colaboradores FOR EACH ROW EXECUTE FUNCTION log_historico();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER historico_compras_castanhas AFTER INSERT OR UPDATE OR DELETE ON compras_castanhas FOR EACH ROW EXECUTE FUNCTION log_historico();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER historico_compras_financeiro AFTER INSERT OR UPDATE OR DELETE ON compras_financeiro FOR EACH ROW EXECUTE FUNCTION log_historico();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER historico_eventos AFTER INSERT OR UPDATE OR DELETE ON eventos FOR EACH ROW EXECUTE FUNCTION log_historico();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER historico_estoque_fardamentos AFTER INSERT OR UPDATE OR DELETE ON estoque_fardamentos FOR EACH ROW EXECUTE FUNCTION log_historico();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER historico_estoque_canetas AFTER INSERT OR UPDATE OR DELETE ON estoque_canetas FOR EACH ROW EXECUTE FUNCTION log_historico();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER historico_estoque_copos AFTER INSERT OR UPDATE OR DELETE ON estoque_copos FOR EACH ROW EXECUTE FUNCTION log_historico();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER historico_gastos_endomarketing AFTER INSERT OR UPDATE OR DELETE ON gastos_endomarketing FOR EACH ROW EXECUTE FUNCTION log_historico();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos-colaboradores', 'fotos-colaboradores', true),
       ('comprovantes-financeiro', 'comprovantes-financeiro', true),
       ('anexos-castanhas', 'anexos-castanhas', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_upload_read_fotos' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY authenticated_upload_read_fotos ON storage.objects FOR ALL TO authenticated
      USING (bucket_id = 'fotos-colaboradores')
      WITH CHECK (bucket_id = 'fotos-colaboradores');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_upload_read_comprovantes' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY authenticated_upload_read_comprovantes ON storage.objects FOR ALL TO authenticated
      USING (bucket_id = 'comprovantes-financeiro')
      WITH CHECK (bucket_id = 'comprovantes-financeiro');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_upload_read_anexos' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY authenticated_upload_read_anexos ON storage.objects FOR ALL TO authenticated
      USING (bucket_id = 'anexos-castanhas')
      WITH CHECK (bucket_id = 'anexos-castanhas');
  END IF;
END $$;

-- 7. SEED: Dados iniciais (roda uma única vez)
-- ============================================================

-- Colaboradores reais (base: LISTAGEM DE COLABORADORES - GRUPOS LEMA)
INSERT INTO colaboradores (id, nome, email, empresa_grupo, setor, formato_trabalho, data_aniversario, data_ingresso, tem_filhos, tamanho_farda, genero, tipo_contratacao, curso_formacao, detalhes_filhos, endereco, contato_emergencia_parentesco, contato_emergencia_nome, contato_emergencia_telefone, restricao_alimentar, hobby, foto_url)
VALUES
  ('col-1', 'John Wanderson Lima Couto', 'john@lemaef.com.br', 'LEMA', 'Financeiro', 'presencial', '2023-08-23', '2023-01-11', false, 'M', 'Masculino', 'Estágiário(a) - 6h', 'Economia - andamento', '', 'Rua 32, Casa 325A, Jereissate 1, Maracanaú CE', 'Pai/Mãe', 'Afoncina Lima Cavalcante', '85988840797', '', 'Comer assistindo e treinar na academia', ''),
  ('col-2', 'Matheus Crisóstomo Holanda', 'matheus@lemaef.com.br', 'LEMA', 'Técnico', 'presencial', '1995-02-22', '2017-08-07', true, 'M', 'Masculino', 'Sócio(a)', '', '', '', '', '', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- Compras de castanhas de exemplo
INSERT INTO compras_castanhas (id, solicitante, finalidade, valor, fornecedor, prazo_entrega, nota_fiscal_emitida, nota_enviada_financeiro)
VALUES
  ('k1', 'Ana Beatriz Lima', 'Brindes feira do agro', 2450.90, 'Castanhas do Vale', CURRENT_DATE + INTERVAL '1 day', false, false),
  ('k2', 'Rafael Torres', 'Kit clientes premium', 890.00, 'Amazônia Nuts', CURRENT_DATE + INTERVAL '20 days', true, true)
ON CONFLICT (id) DO NOTHING;

-- Compras financeiro de exemplo
INSERT INTO compras_financeiro (id, comprovante_url, valor, fornecedor, solicitante, data_compra, finalidade, nota_fiscal_emitida, nota_enviada_financeiro)
VALUES
  ('f1', '', 320.45, 'Gráfica Vale Print', 'Marketing', CURRENT_DATE - INTERVAL '3 days', 'Materiais gráficos do estande', false, false)
ON CONFLICT (id) DO NOTHING;

-- Eventos de exemplo
INSERT INTO eventos (id, nome, data_inicio, data_fim, cidade, estado, local, associacao_relacionada, participantes, materiais, acao_promocional, acao_tipo, acao_tem_brindes, acao_descricao_brindes, acao_custo, acao_necessarias)
VALUES
  ('e1', 'Agrishow LEMA', CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '6 days', 'Ribeirão Preto', 'SP', 'Parque de Exposições', 'ABAG', ARRAY['Ana Beatriz Lima', 'Rafael Torres']::TEXT[], ARRAY['Banner roll-up', 'Folders', 'Brindes']::TEXT[], true, 'Sorteio no estande', true, 'Kits de castanha e canecas', 3200.00, 'Urna, formulários, banner da promoção')
ON CONFLICT (id) DO NOTHING;

-- Estoque de fardamentos
INSERT INTO estoque_fardamentos (id, peca, tamanho, cor, estado, modelagem, empresa, quantidade, observacao)
VALUES ('ef1', 'Camiseta', 'M', 'Navy', 'Novo', 'T-shirt', 'LEMA', 40, 'Estoque do evento Agrishow')
ON CONFLICT (id) DO NOTHING;

-- Estoque de canetas
INSERT INTO estoque_canetas (id, modelo, cor, quantidade, observacao)
VALUES ('ec1', 'Metal fosca', 'Azul', 250, 'Brinde padrão')
ON CONFLICT (id) DO NOTHING;

-- Estoque de copos
INSERT INTO estoque_copos (id, tipo, capacidade, cor, quantidade, observacao)
VALUES ('ecp1', 'Caneca', '300ml', 'Branca', 80, 'Logo LEMA')
ON CONFLICT (id) DO NOTHING;

-- Gastos de endomarketing
INSERT INTO gastos_endomarketing (id, nome_evento, mes, descritivo, valor)
VALUES
  ('g1', 'Festa junina interna', EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-06-01', 'Decoração e comidas típicas', 5400.00),
  ('g2', 'Café com o time', TO_CHAR(CURRENT_DATE, 'YYYY-MM') || '-01', 'Coffee break mensal', 1250.00)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. VÍNCULO PEDIDO DE CASTANHA ↔ EVENTO
-- ============================================================
-- Se o schema já estava aplicado, rodar apenas o ALTER abaixo no SQL Editor.

ALTER TABLE compras_castanhas ADD COLUMN IF NOT EXISTS evento_id TEXT;

-- ============================================================
-- 9. LEMBRETES POR E-MAIL (Resend + pg_cron)
-- ============================================================
-- Lembretes automáticos de eventos (véspera + dia) para perfis admin/editor,
-- enviados via Resend (pg_net) e agendados com pg_cron.
-- Lembretes manuais por pedido de castanhas: ver src/lib/lembretes.functions.ts.
--
-- PRÉ-REQUISITO (rodar UMA vez no SQL Editor, com a chave real — não commitar):
--   select vault.create_secret('<RESEND_API_KEY>', 'resend_api_key');
-- A função lê sempre o secret mais recente com esse nome.

-- 9.1 Extensões (no-op se já habilitadas via Dashboard)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault; -- no projeto LEMA o Vault é "supabase_vault" (o schema criado é "vault")

-- 9.2 Tabelas
CREATE TABLE IF NOT EXISTS destinatarios_lembrete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS envios_lembrete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('castanha', 'vespera', 'dia')),
  referencia_id UUID,
  destinatarios TEXT[] NOT NULL DEFAULT '{}',
  assunto TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'enviado' CHECK (status IN ('enviado', 'erro')),
  detalhe TEXT,
  disparado_por TEXT NOT NULL DEFAULT 'Sistema',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_envios_lembrete_ref ON envios_lembrete (tipo, referencia_id, created_at DESC);

-- 9.3 RLS
ALTER TABLE destinatarios_lembrete ENABLE ROW LEVEL SECURITY;
ALTER TABLE envios_lembrete ENABLE ROW LEVEL SECURITY;

-- Destinatários: leitura/escrita somente para admin/editor
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'destinatarios_select' AND tablename = 'destinatarios_lembrete') THEN
    CREATE POLICY destinatarios_select ON destinatarios_lembrete FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor')));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'destinatarios_insert' AND tablename = 'destinatarios_lembrete') THEN
    CREATE POLICY destinatarios_insert ON destinatarios_lembrete FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor')));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'destinatarios_update' AND tablename = 'destinatarios_lembrete') THEN
    CREATE POLICY destinatarios_update ON destinatarios_lembrete FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor')))
      WITH CHECK (EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor')));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'destinatarios_delete' AND tablename = 'destinatarios_lembrete') THEN
    CREATE POLICY destinatarios_delete ON destinatarios_lembrete FOR DELETE TO authenticated
      USING (EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor')));
  END IF;
END $$;

-- Log de envios: leitura para admin/editor. SEM policies de escrita para
-- clientes — somente service role (server functions) e pg_cron (postgres) gravam.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'envios_select' AND tablename = 'envios_lembrete') THEN
    CREATE POLICY envios_select ON envios_lembrete FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor')));
  END IF;
END $$;

-- 9.4 GRANTs (obrigatórios: novas tabelas não são expostas à Data API desde 2026-04)
-- Nota: os default privileges do Supabase concedem ALL para anon/authenticated em
-- tabelas novas — os REVOKEs fecham o que excede o desenhado (RLS já cobre; isto é
-- defense-in-depth: envios sem escrita por clientes, anon sem nada).
DO $$ BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON destinatarios_lembrete TO authenticated;
  GRANT SELECT ON envios_lembrete TO authenticated;
  GRANT SELECT, INSERT ON envios_lembrete TO service_role;
  REVOKE ALL ON destinatarios_lembrete FROM anon;
  REVOKE ALL ON envios_lembrete FROM anon;
  REVOKE INSERT, UPDATE, DELETE ON envios_lembrete FROM authenticated;
END $$;

-- 9.5 Realtime (somente destinatários — envios é consultado on-demand)
DO $pub$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'destinatarios_lembrete'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE destinatarios_lembrete;
  END IF;
END $pub$;

-- 9.6 Função de envio (schema privado `lembretes` — fora da Data API)
CREATE SCHEMA IF NOT EXISTS lembretes;

CREATE OR REPLACE FUNCTION lembretes.enviar_lembretes_eventos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_api_key text;
  v_destinatarios text[];
  v_assunto text := 'Lembrete — Eventos nos próximos dias';
  v_html text;
  v_ids uuid[] := '{}';
  v_fases text[] := '{}';
  v_ev record;
BEGIN
  -- Chave da API no Vault (a mais recente com esse nome)
  SELECT decrypted_secret INTO v_api_key
  FROM vault.decrypted_secrets
  WHERE name = 'resend_api_key'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_api_key IS NULL OR v_api_key = '' THEN
    RAISE WARNING 'lembretes: secret resend_api_key não encontrado no Vault';
    RETURN;
  END IF;

  -- Destinatários: perfis admin/editor com e-mail plausível
  SELECT array_agg(email) INTO v_destinatarios
  FROM perfis
  WHERE role IN ('admin', 'editor')
    AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$';

  IF v_destinatarios IS NULL THEN
    RAISE WARNING 'lembretes: nenhum destinatário (perfis admin/editor)';
    RETURN;
  END IF;

  -- Corpo do e-mail (template placeholder — layout definitivo virá depois)
  v_html := '<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">'
    || '<h2 style="color: #0a2540;">Eventos nos próximos dias</h2>'
    || '<p>Olá! Estamos nos aproximando dos seguintes eventos do calendário LEMA:</p><ul>';

  -- Eventos que começam hoje ('dia') ou amanhã ('vespera'), ainda não notificados
  -- (datas são TEXT yyyy-mm-dd; o regex protege o cast de linhas vazias/inválidas)
  FOR v_ev IN
    SELECT ev.id, ev.nome, ev.cidade, ev.estado, ev.data_evento,
           CASE WHEN ev.data_evento = v_hoje THEN 'dia' ELSE 'vespera' END AS fase
    FROM (
      SELECT e.id, e.nome, e.cidade, e.estado, e.data_inicio::date AS data_evento
      FROM eventos e
      WHERE e.data_inicio ~ '^\d{4}-\d{2}-\d{2}$'
    ) ev
    WHERE ev.data_evento IN (v_hoje, v_hoje + 1)
      AND NOT EXISTS (
        SELECT 1 FROM envios_lembrete el
        WHERE el.referencia_id = ev.id
          AND el.tipo = (CASE WHEN ev.data_evento = v_hoje THEN 'dia' ELSE 'vespera' END)
          AND el.status = 'enviado'
      )
    ORDER BY ev.data_evento
  LOOP
    v_html := v_html || format(
      '<li><strong>%s</strong> — %s/%s · %s%s</li>',
      v_ev.nome, v_ev.cidade, v_ev.estado,
      to_char(v_ev.data_evento, 'DD/MM/YYYY'),
      CASE WHEN v_ev.fase = 'dia' THEN ' (começa hoje)' ELSE ' (começa amanhã)' END
    );
    v_ids := array_append(v_ids, v_ev.id);
    v_fases := array_append(v_fases, v_ev.fase);
  END LOOP;

  IF array_length(v_ids, 1) IS NULL THEN
    RETURN; -- nada a notificar agora
  END IF;

  v_html := v_html || '</ul>'
    || '<p style="color: #5a6b7d; font-size: 13px;">Este é um lembrete automático do LEMA Demand Hub.</p></div>';

  -- Envio via Resend. pg_net é assíncrono: a requisição sai após o commit desta transação.
  -- REMETENTE: compliance.lemaef.com.br é domínio já verificado na conta Resend (entrega
  -- em qualquer destinatário). Quando o time de tecnologia verificar lemaef.com.br (ou
  -- subdomínio), trocar o 'from' abaixo e rodar de novo o bloco 9.6.
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    body := jsonb_build_object(
      'from', 'LEMA Hub <lembretes@compliance.lemaef.com.br>',
      'to', to_jsonb(v_destinatarios),
      'subject', v_assunto,
      'html', v_html,
      'tags', jsonb_build_array(jsonb_build_object('name', 'tipo', 'value', 'evento'))
    ),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_api_key,
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 5000
  );

  -- Registra o envio por evento (dedupe "ever" por evento+fase + auditoria)
  INSERT INTO envios_lembrete (tipo, referencia_id, destinatarios, assunto, status, disparado_por)
  SELECT f.fase, f.id, v_destinatarios, v_assunto, 'enviado', 'pg_cron'
  FROM unnest(v_ids, v_fases) AS f(id, fase);

  RAISE LOG 'lembretes: % evento(s) notificado(s) por e-mail', array_length(v_ids, 1);

EXCEPTION WHEN OTHERS THEN
  -- Nunca propagar erro: um falho no cron não pode interromper nada
  RAISE WARNING 'lembretes: falha ao enviar lembretes de eventos — %', SQLERRM;
END;
$fn$;

-- Bloquear execução direta por clientes (apenas pg_cron/postgres)
REVOKE EXECUTE ON FUNCTION lembretes.enviar_lembretes_eventos() FROM PUBLIC, anon, authenticated;
REVOKE USAGE ON SCHEMA lembretes FROM PUBLIC, anon, authenticated;

-- 9.7 Agendamento: horário (captura eventos cadastrados em cima da hora;
-- o dedupe por evento+fase impede reenvio). "Hoje" é calculado em
-- America/Sao_Paulo dentro da função, então o horário UTC do cron não afeta.
DO $cronblock$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lembretes-eventos-email') THEN
    PERFORM cron.schedule(
      'lembretes-eventos-email',
      '0 * * * *',
      $job$SELECT lembretes.enviar_lembretes_eventos();$job$
    );
  END IF;
END $cronblock$;
