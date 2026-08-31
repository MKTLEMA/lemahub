export type Colaborador = {
  id: string;
  nome: string;
  data_ingresso: string;
  data_aniversario: string;
  setor: string;
  email: string;
  empresa_grupo: string;
  formato_trabalho: "hibrido" | "presencial" | "remoto";
  genero: string;
  tem_filhos: boolean;
  tamanho_farda: string;
  tipo_contratacao: string;
  curso_formacao: string;
  detalhes_filhos: string;
  endereco: string;
  contato_emergencia_parentesco: string;
  contato_emergencia_nome: string;
  contato_emergencia_telefone: string;
  restricao_alimentar: string;
  hobby: string;
  foto_url: string;
  created_at: string;
  updated_at: string;
};

export type CompraCastanha = {
  id: string;
  solicitante: string;
  finalidade: string;
  valor: number;
  fornecedor: string;
  prazo_entrega: string;
  data_solicitacao: string;
  observacao: string;
  numero_nf: string;
  vinculado_a: string | null;
  evento_id?: string | null;
  anexo_url: string;
  nota_fiscal_emitida: boolean;
  nota_enviada_financeiro: boolean;
  created_at: string;
  updated_at: string;
};

export type CompraFinanceiro = {
  id: string;
  comprovante_url: string;
  valor: number;
  fornecedor: string;
  solicitante: string;
  data_compra: string;
  data_orcamento: string;
  finalidade: string;
  nota_fiscal_emitida: boolean;
  nota_enviada_financeiro: boolean;
  created_at: string;
  updated_at: string;
};

export type Evento = {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  cidade: string;
  estado: string;
  local: string;
  associacao_relacionada: string;
  participantes: string[];
  materiais: string[];
  acao_promocional: boolean;
  acao_tipo: string;
  acao_tem_brindes: boolean;
  acao_descricao_brindes: string;
  acao_custo: number;
  acao_necessarias: string;
  created_at: string;
  updated_at: string;
};

export type EstoqueFardamento = {
  id: string;
  peca: string;
  tamanho: string;
  cor: string;
  estado: string;
  modelagem: string;
  empresa: string;
  quantidade: number;
  observacao: string;
  created_at: string;
  updated_at: string;
};

export type EstoqueCaneta = {
  id: string;
  modelo: string;
  cor: string;
  quantidade: number;
  observacao: string;
  created_at: string;
  updated_at: string;
};

export type EstoqueCopo = {
  id: string;
  tipo: string;
  capacidade: string;
  cor: string;
  quantidade: number;
  observacao: string;
  created_at: string;
  updated_at: string;
};

export type GastoEndomarketing = {
  id: string;
  nome_evento: string;
  mes: string;
  descritivo: string;
  valor: number;
  created_at: string;
  updated_at: string;
};

export type TabelaNome =
  | "colaboradores"
  | "compras_castanhas"
  | "compras_financeiro"
  | "eventos"
  | "estoque_fardamentos"
  | "estoque_canetas"
  | "estoque_copos"
  | "gastos_endomarketing";

export type HistoricoEdicao = {
  id: string;
  tabela: TabelaNome;
  registro_id: string;
  usuario_id?: string | null;
  usuario_nome: string;
  acao: "criacao" | "edicao" | "exclusao";
  campo_alterado: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  timestamp: string;
};

export type DBShape = {
  colaboradores: Colaborador[];
  compras_castanhas: CompraCastanha[];
  compras_financeiro: CompraFinanceiro[];
  eventos: Evento[];
  estoque_fardamentos: EstoqueFardamento[];
  estoque_canetas: EstoqueCaneta[];
  estoque_copos: EstoqueCopo[];
  gastos_endomarketing: GastoEndomarketing[];
  historico_edicoes: HistoricoEdicao[];
};

export const LABELS: Record<TabelaNome, string> = {
  colaboradores: "Colaboradores",
  compras_castanhas: "Compras Castanhas",
  compras_financeiro: "Compras Financeiro",
  eventos: "Eventos",
  estoque_fardamentos: "Estoque de Fardamentos",
  estoque_canetas: "Estoque de Canetas",
  estoque_copos: "Estoque de Copos",
  gastos_endomarketing: "Gastos de Endomarketing",
};
