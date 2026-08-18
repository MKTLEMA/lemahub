export type EstoqueModulo = "fardamentos" | "canetas" | "copos";

export type Thresholds = Record<EstoqueModulo, number>;

const KEY = "lema-hub-thresholds";

export const THRESHOLDS_PADRAO: Thresholds = {
  fardamentos: 20,
  canetas: 500,
  copos: 100,
};

const listeners = new Set<() => void>();

export function getThresholds(): Thresholds {
  if (typeof window === "undefined") return THRESHOLDS_PADRAO;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return THRESHOLDS_PADRAO;
    return { ...THRESHOLDS_PADRAO, ...(JSON.parse(raw) as Partial<Thresholds>) };
  } catch {
    return THRESHOLDS_PADRAO;
  }
}

export function setThreshold(modulo: EstoqueModulo, valor: number) {
  const next = { ...getThresholds(), [modulo]: Number.isFinite(valor) ? valor : 0 };
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export function subscribeThresholds(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
