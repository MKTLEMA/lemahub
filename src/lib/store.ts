import { useSyncExternalStore } from "react";
import { colaboradoresSeed } from "./colaboradores-seed";
import type { DBShape, HistoricoEdicao, TabelaNome } from "./types";

const STORAGE_KEY = "lema-hub-db-v3";

const CHANNEL = "lema-hub-sync";

const EMPTY: DBShape = {
  colaboradores: [],
  compras_castanhas: [],
  compras_financeiro: [],
  eventos: [],
  estoque_fardamentos: [],
  estoque_canetas: [],
  estoque_copos: [],
  gastos_endomarketing: [],
  historico_edicoes: [],
};

function seed(): DBShape {
  const hoje = new Date();
  const iso = (offsetDays: number) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };
  const now = new Date().toISOString();
  return {
    colaboradores: colaboradoresSeed(now),

    compras_castanhas: [
      {
        id: "k1",
        solicitante: "Ana Beatriz Lima",
        finalidade: "Brindes feira do agro",
        valor: 2450.9,
        fornecedor: "Castanhas do Vale",
        prazo_entrega: iso(1),
        data_solicitacao: iso(-5),
        observacao: "Pedido confirmado por telefone.",
        numero_nf: "",
        vinculado_a: null,
        anexo_url: "",
        nota_fiscal_emitida: false,
        nota_enviada_financeiro: false,
        created_at: now,
        updated_at: now,
      },
      {
        id: "k2",
        solicitante: "Rafael Torres",
        finalidade: "Kit clientes premium",
        valor: 890,
        fornecedor: "Amazônia Nuts",
        prazo_entrega: iso(20),
        data_solicitacao: iso(-12),
        observacao: "",
        numero_nf: "12345",
        vinculado_a: null,
        anexo_url: "",
        nota_fiscal_emitida: true,
        nota_enviada_financeiro: true,
        created_at: now,
        updated_at: now,
      },
    ],
    compras_financeiro: [
      {
        id: "f1",
        comprovante_url: "",
        valor: 320.45,
        fornecedor: "Gráfica Vale Print",
        solicitante: "Marketing",
        data_compra: iso(-3),
        data_orcamento: iso(-10),
        finalidade: "Materiais gráficos do estande",
        nota_fiscal_emitida: false,
        nota_enviada_financeiro: false,
        created_at: now,
        updated_at: now,
      },
    ],
    eventos: [
      {
        id: "e1",
        nome: "Agrishow LEMA",
        data_inicio: iso(3),
        data_fim: iso(6),
        cidade: "Ribeirão Preto",
        estado: "SP",
        local: "Parque de Exposições",
        associacao_relacionada: "ABAG",
        participantes: ["Ana Beatriz Lima", "Rafael Torres"],
        materiais: ["Banner roll-up", "Folders", "Brindes"],
        acao_promocional: true,
        acao_tipo: "Sorteio no estande",
        acao_tem_brindes: true,
        acao_descricao_brindes: "Kits de castanha e canecas",
        acao_custo: 3200,
        acao_necessarias: "Urna, formulários, banner da promoção",
        created_at: now,
        updated_at: now,
      },
    ],
    estoque_fardamentos: [
      {
        id: "ef1",
        peca: "Camiseta",
        tamanho: "M",
        cor: "Navy",
        estado: "Novo",
        modelagem: "T-shirt",
        empresa: "LEMA",
        quantidade: 40,
        observacao: "Estoque do evento Agrishow",
        created_at: now,
        updated_at: now,
      },
    ],
    estoque_canetas: [
      {
        id: "ec1",
        modelo: "Metal fosca",
        cor: "Azul",
        quantidade: 250,
        observacao: "Brinde padrão",
        created_at: now,
        updated_at: now,
      },
    ],
    estoque_copos: [
      {
        id: "ecp1",
        tipo: "Caneca",
        capacidade: "300ml",
        cor: "Branca",
        quantidade: 80,
        observacao: "Logo LEMA",
        created_at: now,
        updated_at: now,
      },
    ],
    gastos_endomarketing: [
      {
        id: "g1",
        nome_evento: "Festa junina interna",
        mes: `${hoje.getFullYear()}-06-01`,
        descritivo: "Decoração e comidas típicas",
        valor: 5400,
        created_at: now,
        updated_at: now,
      },
      {
        id: "g2",
        nome_evento: "Café com o time",
        mes: `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`,
        descritivo: "Coffee break mensal",
        valor: 1250,
        created_at: now,
        updated_at: now,
      },
    ],
    historico_edicoes: [],
  };
}

let db: DBShape = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    channel?.postMessage("sync");
  } catch {
    /* storage indisponível */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    db = raw ? { ...EMPTY, ...(JSON.parse(raw) as DBShape) } : seed();
    if (!raw) persist();
  } catch {
    db = seed();
  }
  if ("BroadcastChannel" in window) {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          db = JSON.parse(raw) as DBShape;
          emit();
        }
      } catch {
        /* noop */
      }
    };
  }
  emit();
}

export function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): DBShape {
  return db;
}

function getServerSnapshot(): DBShape {
  return EMPTY;
}

export function useDb(): DBShape {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function currentUser(): string {
  if (typeof window === "undefined") return "Equipe LEMA";
  return localStorage.getItem("lema-hub-user") ?? "Equipe LEMA";
}

export function setCurrentUser(nome: string) {
  localStorage.setItem("lema-hub-user", nome);
  emit();
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function log(entry: Omit<HistoricoEdicao, "id" | "timestamp" | "usuario_nome">) {
  db.historico_edicoes = [
    {
      ...entry,
      id: uid(),
      usuario_nome: currentUser(),
      timestamp: new Date().toISOString(),
    },
    ...db.historico_edicoes,
  ].slice(0, 500);
}

type Row = { id: string; created_at: string; updated_at: string };

export function insertRow<T extends TabelaNome>(
  tabela: T,
  values: Omit<DBShape[T][number], "id" | "created_at" | "updated_at">,
) {
  const now = new Date().toISOString();
  const record = { ...values, id: uid(), created_at: now, updated_at: now } as Row;
  (db[tabela] as unknown as Row[]) = [record, ...(db[tabela] as unknown as Row[])];
  log({
    tabela,
    registro_id: record.id,
    acao: "criacao",
    campo_alterado: null,
    valor_anterior: null,
    valor_novo: null,
  });
  persist();
  emit();
  return record.id;
}

export function updateRow<T extends TabelaNome>(
  tabela: T,
  id: string,
  values: Partial<DBShape[T][number]>,
) {
  const rows = db[tabela] as unknown as Record<string, unknown>[];
  const index = rows.findIndex((r) => r["id"] === id);
  if (index === -1) return;
  const prev = rows[index]!;
  Object.entries(values).forEach(([campo, novo]) => {
    const anterior = prev[campo];
    if (String(anterior) === String(novo)) return;
    log({
      tabela,
      registro_id: id,
      acao: "edicao",
      campo_alterado: campo,
      valor_anterior: anterior === undefined ? null : String(anterior),
      valor_novo: novo === undefined ? null : String(novo),
    });
  });
  rows[index] = { ...prev, ...values, updated_at: new Date().toISOString() };
  persist();
  emit();
}

export function deleteRow(tabela: TabelaNome, id: string) {
  const rows = db[tabela] as unknown as Record<string, unknown>[];
  (db[tabela] as unknown as Record<string, unknown>[]) = rows.filter((r) => r["id"] !== id);
  log({
    tabela,
    registro_id: id,
    acao: "exclusao",
    campo_alterado: null,
    valor_anterior: null,
    valor_novo: null,
  });
  persist();
  emit();
}
