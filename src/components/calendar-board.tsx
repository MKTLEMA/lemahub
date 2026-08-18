import { Cake, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalEvento = {
  id: string;
  nome: string;
  data_inicio: string;
  acao_promocional?: boolean;
};

export type CalAniversariante = {
  id: string;
  nome: string;
  data_aniversario: string;
};

export type CalendarModo = "eventos" | "aniversarios" | "ambos";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function CalendarBoard({
  eventos = [],
  aniversariantes = [],
  cursor,
  onCursor,
  onPickDate,
  onPickEvento,
  onPickAniversariante,
  destaqueEventoId,
  modo = "ambos",
  compact = false,
}: {
  eventos?: CalEvento[];
  aniversariantes?: CalAniversariante[];
  cursor: Date;
  onCursor: (d: Date) => void;
  onPickDate?: (iso: string) => void;
  onPickEvento?: (id: string) => void;
  onPickAniversariante?: (id: string) => void;
  destaqueEventoId?: string | null;
  modo?: CalendarModo;
  compact?: boolean;
}) {
  const hoje = new Date();

  const celulas = useMemo(() => {
    const primeiro = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const inicio = new Date(primeiro);
    inicio.setDate(1 - primeiro.getDay());
    const total = compact ? 35 : 42;
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d;
    });
  }, [cursor, compact]);

  const mostrarEventos = modo !== "aniversarios";
  const mostrarAniversarios = modo !== "eventos";

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className={cn("font-display font-semibold", compact ? "text-base" : "text-lg")}>
          {MESES[cursor.getMonth()]} {cursor.getFullYear()}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="Mês anterior"
            onClick={() => onCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => onCursor(new Date(hoje.getFullYear(), hoje.getMonth(), 1))}
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Próximo mês"
            onClick={() => onCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {DIAS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celulas.map((d) => {
          const key = isoDate(d);
          const doMes = d.getMonth() === cursor.getMonth();
          const ehHoje = key === isoDate(hoje);
          const evs = mostrarEventos ? eventos.filter((e) => e.data_inicio === key) : [];
          const anivs = mostrarAniversarios
            ? aniversariantes.filter((c) => (c.data_aniversario ?? "").slice(5) === key.slice(5))
            : [];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPickDate?.(key)}
              className={cn(
                "rounded-lg border border-border p-1.5 text-left align-top transition-colors hover:bg-accent/10",
                compact ? "min-h-16" : "min-h-24",
                !doMes && "opacity-40",
                ehHoje && "border-accent ring-1 ring-accent",
              )}
            >
              <span className={cn("text-xs tabular-nums", ehHoje && "font-bold text-accent")}>
                {d.getDate()}
              </span>
              <span className="mt-1 flex flex-col gap-1">
                {evs.map((e) => (
                  <span
                    key={`e-${e.id}`}
                    role="button"
                    tabIndex={0}
                    ref={(node) => {
                      if (node && destaqueEventoId === e.id)
                        node.scrollIntoView({ block: "center", behavior: "smooth" });
                    }}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onPickEvento?.(e.id);
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter") {
                        ev.stopPropagation();
                        onPickEvento?.(e.id);
                      }
                    }}
                    className={cn(
                      "truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-white",
                      destaqueEventoId === e.id && "ring-2 ring-accent ring-offset-1",
                    )}
                    style={{
                      backgroundColor: e.acao_promocional ? "var(--promocao)" : "var(--accent)",
                    }}
                    title={e.nome}
                  >
                    {e.acao_promocional ? "★ " : ""}
                    {e.nome}
                  </span>
                ))}
                {anivs.map((c) => (
                  <span
                    key={`a-${c.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onPickAniversariante?.(c.id);
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter") {
                        ev.stopPropagation();
                        onPickAniversariante?.(c.id);
                      }
                    }}
                    className="flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-black/80"
                    style={{ backgroundColor: "var(--alerta)" }}
                    title={`Aniversário de ${c.nome}`}
                  >
                    <Cake className="size-3 shrink-0" />
                    <span className="truncate">{c.nome}</span>
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
