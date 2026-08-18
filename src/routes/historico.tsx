import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { HistoricoLista } from "@/components/historico-lista";
import { useDb } from "@/lib/store";
import { LABELS, type TabelaNome } from "@/lib/types";
import { exportCsv } from "@/lib/csv";
import { Download } from "lucide-react";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de edições — Hub LEMA" },
      { name: "description", content: "Log de criações, edições e exclusões feitas no hub." },
      { property: "og:title", content: "Histórico de edições — Hub LEMA" },
      { property: "og:description", content: "Auditoria completa das alterações por usuário." },
    ],
  }),
  component: HistoricoPage,
});

const FILTROS: (TabelaNome | "todos")[] = [
  "todos",
  "colaboradores",
  "compras_castanhas",
  "compras_financeiro",
  "eventos",
];

function HistoricoPage() {
  const db = useDb();
  const [filtro, setFiltro] = useState<TabelaNome | "todos">("todos");

  const itens = useMemo(
    () =>
      filtro === "todos"
        ? db.historico_edicoes
        : db.historico_edicoes.filter((h) => h.tabela === filtro),
    [db.historico_edicoes, filtro],
  );

  return (
    <>
      <div className="animate-rise mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Histórico de edições</h1>
          <p className="text-sm text-muted-foreground">
            Quem alterou o quê, quando, com valor anterior e novo.
          </p>
        </div>
        <Button variant="outline" onClick={() => exportCsv("historico", itens)}>
          <Download className="size-4" /> CSV
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filtro === f ? "default" : "outline"}
            onClick={() => setFiltro(f)}
          >
            {f === "todos" ? "Todos" : LABELS[f]}
          </Button>
        ))}
      </div>

      <div className="animate-rise rounded-xl border border-border bg-card px-4">
        <HistoricoLista itens={itens} />
      </div>
    </>
  );
}
