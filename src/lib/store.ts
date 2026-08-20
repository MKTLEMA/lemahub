import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import type { DBShape, HistoricoEdicao, TabelaNome } from "./types";

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

const TABLES: TabelaNome[] = [
  "colaboradores",
  "compras_castanhas",
  "compras_financeiro",
  "eventos",
  "estoque_fardamentos",
  "estoque_canetas",
  "estoque_copos",
  "gastos_endomarketing",
];

type Row = { id: string; created_at: string; updated_at: string };

let db: DBShape = { ...EMPTY };
let hydrated = false;
let loading = true;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setDb(partial: Partial<DBShape>) {
  db = { ...db, ...partial };
  emit();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
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

export function useLoading(): boolean {
  return loading;
}

async function hydrate() {
  if (hydrated) return;
  hydrated = true;
  loading = true;
  emit();

  const results = await Promise.all(
    TABLES.map(async (t) => {
      const { data, error } = await supabase
        .from(t)
        .select("*")
        .order("created_at", { ascending: false });
      return { t, data: error ? [] : (data ?? []) };
    }),
  );

  const partial: Partial<DBShape> = {};
  for (const { t, data } of results) {
    (partial as Record<string, unknown>)[t] = data;
  }

  const { data: histData } = await supabase
    .from("historico_edicoes")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(500);
  (partial as Record<string, unknown>)["historico_edicoes"] = histData ?? [];

  db = { ...EMPTY, ...partial };
  loading = false;
  emit();
  subscribeRealtime();
}

function subscribeRealtime() {
  const channel = supabase
    .channel("db-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "colaboradores" }, () =>
      refetch("colaboradores"),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "compras_castanhas" }, () =>
      refetch("compras_castanhas"),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "compras_financeiro" }, () =>
      refetch("compras_financeiro"),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "eventos" }, () =>
      refetch("eventos"),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "estoque_fardamentos" }, () =>
      refetch("estoque_fardamentos"),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "estoque_canetas" }, () =>
      refetch("estoque_canetas"),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "estoque_copos" }, () =>
      refetch("estoque_copos"),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "gastos_endomarketing" }, () =>
      refetch("gastos_endomarketing"),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "historico_edicoes" },
      async () => {
        const { data } = await supabase
          .from("historico_edicoes")
          .select("*")
          .order("timestamp", { ascending: false })
          .limit(500);
        setDb({ historico_edicoes: (data as HistoricoEdicao[]) ?? [] });
      },
    )
    .subscribe();
  void channel;
}

async function refetch(t: TabelaNome) {
  const { data, error } = await supabase
    .from(t)
    .select("*")
    .order("created_at", { ascending: false });
  if (!error) {
    setDb({ [t]: data ?? [] } as Partial<DBShape>);
  }
}

export type ResultadoOperacao = { ok: true } | { ok: false; erro: string };

export function currentUser(): string {
  return "Equipe LEMA";
}

export function setCurrentUser(_nome: string) {
  // No-op: user identity comes from Supabase Auth now.
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function log(entry: Omit<HistoricoEdicao, "id" | "timestamp" | "usuario_nome">) {
  const now = new Date().toISOString();
  const rec: HistoricoEdicao = {
    ...entry,
    id: uid(),
    usuario_nome: "Equipe LEMA",
    timestamp: now,
  };
  db.historico_edicoes = [rec, ...db.historico_edicoes].slice(0, 500);
}

export async function insertRow<T extends TabelaNome>(
  tabela: T,
  values: Omit<DBShape[T][number], "id" | "created_at" | "updated_at">,
): Promise<ResultadoOperacao> {
  const now = new Date().toISOString();
  const row = { ...values, id: uid(), created_at: now, updated_at: now };
  const { error } = await supabase.from(tabela).insert(row);
  if (error) {
    console.error("insertRow error:", error.message);
    return { ok: false, erro: error.message };
  }
  const tableRows = db[tabela] as Row[];
  setDb({ [tabela]: [row as DBShape[T][number], ...tableRows] } as Partial<DBShape>);
  log({
    tabela,
    registro_id: (row as Row).id,
    acao: "criacao",
    campo_alterado: null,
    valor_anterior: null,
    valor_novo: null,
  });
  return { ok: true };
}

export async function updateRow<T extends TabelaNome>(
  tabela: T,
  id: string,
  values: Partial<DBShape[T][number]>,
): Promise<ResultadoOperacao> {
  const rows = db[tabela] as unknown as Record<string, unknown>[];
  const prev = rows.find((r) => r["id"] === id);
  if (prev) {
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
  }
  const { error } = await supabase
    .from(tabela)
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("updateRow error:", error.message);
    return { ok: false, erro: error.message };
  }
  const tableRows = db[tabela] as Record<string, unknown>[];
  const updated = tableRows.map((r) =>
    r["id"] === id ? { ...r, ...values, updated_at: new Date().toISOString() } : r,
  );
  setDb({ [tabela]: updated as DBShape[T] });
  return { ok: true };
}

export async function deleteRow(tabela: TabelaNome, id: string): Promise<ResultadoOperacao> {
  const { error } = await supabase.from(tabela).delete().eq("id", id);
  if (error) {
    console.error("deleteRow error:", error.message);
    return { ok: false, erro: error.message };
  }
  const tableRows = db[tabela] as Row[];
  setDb({ [tabela]: tableRows.filter((r) => r.id !== id) as DBShape[TabelaNome] });
  log({
    tabela,
    registro_id: id,
    acao: "exclusao",
    campo_alterado: null,
    valor_anterior: null,
    valor_novo: null,
  });
  return { ok: true };
}

// Auto-hydrate on import (client-side only)
if (typeof window !== "undefined") {
  void hydrate();

  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN") {
      hydrated = false;
      void hydrate();
    } else if (event === "SIGNED_OUT") {
      db = { ...EMPTY };
      hydrated = false;
      loading = true;
      emit();
    }
  });
}
