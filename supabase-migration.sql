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
  nota_fiscal_emitida BOOLEAN DEFAULT false,
  nota_enviada_financeiro BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compras_financeiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comprovante_url TEXT DEFAULT '',
  valor NUMERIC(10,2) DEFAULT 0,
  comprador TEXT,
  solicitante TEXT,
  data_compra TEXT,
  finalidade TEXT,
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
  cor TEXT,
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

-- Policies: todos autenticados têm CRUD completo
-- (TO authenticated em vez de auth.role() —后者 está deprecated)

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
    (SELECT email FROM auth.users WHERE id = v_usuario_id),
    'Equipe LEMA'
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
$$ LANGUAGE plpgsql SECURITY INVOKER;

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

-- Policies de Storage: authenticated pode upload/read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.policies WHERE name = 'authenticated_upload_read' AND bucket_id = 'fotos-colaboradores') THEN
    CREATE POLICY authenticated_upload_read ON storage.objects FOR ALL TO authenticated
      USING (bucket_id = 'fotos-colaboradores')
      WITH CHECK (bucket_id = 'fotos-colaboradores');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.policies WHERE name = 'authenticated_upload_read' AND bucket_id = 'comprovantes-financeiro') THEN
    CREATE POLICY authenticated_upload_read ON storage.objects FOR ALL TO authenticated
      USING (bucket_id = 'comprovantes-financeiro')
      WITH CHECK (bucket_id = 'comprovantes-financeiro');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.policies WHERE name = 'authenticated_upload_read' AND bucket_id = 'anexos-castanhas') THEN
    CREATE POLICY authenticated_upload_read ON storage.objects FOR ALL TO authenticated
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
INSERT INTO compras_financeiro (id, comprovante_url, valor, comprador, solicitante, data_compra, finalidade, nota_enviada_financeiro)
VALUES
  ('f1', '', 320.45, 'Ana Beatriz Lima', 'Marketing', CURRENT_DATE - INTERVAL '3 days', 'Materiais gráficos do estande', false)
ON CONFLICT (id) DO NOTHING;

-- Eventos de exemplo
INSERT INTO eventos (id, nome, data_inicio, data_fim, cidade, estado, local, associacao_relacionada, participantes, materiais, acao_promocional, acao_tipo, acao_tem_brindes, acao_descricao_brindes, acao_custo, acao_necessarias)
VALUES
  ('e1', 'Agrishow LEMA', CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '6 days', 'Ribeirão Preto', 'SP', 'Parque de Exposições', 'ABAG', ARRAY['Ana Beatriz Lima', 'Rafael Torres']::TEXT[], ARRAY['Banner roll-up', 'Folders', 'Brindes']::TEXT[], true, 'Sorteio no estande', true, 'Kits de castanha e canecas', 3200.00, 'Urna, formulários, banner da promoção')
ON CONFLICT (id) DO NOTHING;

-- Estoque de fardamentos
INSERT INTO estoque_fardamentos (id, peca, tamanho, cor, quantidade, observacao)
VALUES ('ef1', 'Camiseta', 'M', 'Navy', 40, 'Estoque do evento Agrishow')
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
