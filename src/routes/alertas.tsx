import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { ProximityDot } from "@/components/proximity-dot";
import { calcularAlertas } from "@/lib/alerts";
import { useDb } from "@/lib/store";
import { LABELS, type TabelaNome } from "@/lib/types";

export const Route = createFileRoute("/alertas")({
  head: () => ({
    meta: [
      { title: "Central de Alertas — Hub LEMA" },
      { name: "description", content: "Datas próximas e pendências abertas do marketing LEMA." },
      { property: "og:title", content: "Central de Alertas — Hub LEMA" },
      { property: "og:description", content: "Itens na janela de 3 dias e pendências de nota." },
    ],
  }),
  component: AlertasPage,
});

function AlertasPage() {
  const db = useDb();
  const alertas = useMemo(() => calcularAlertas(db), [db]);

  const grupos = useMemo(() => {
    const map = new Map<TabelaNome, typeof alertas>();
    alertas.forEach((a) => {
      map.set(a.tabela, [...(map.get(a.tabela) ?? []), a]);
    });
    return [...map.entries()];
  }, [alertas]);

  return (
    <>
      <div className="animate-rise mb-6">
        <h1 className="font-display text-2xl font-bold">Central de Alertas</h1>
        <p className="text-sm text-muted-foreground">
          Janela de proximidade de 3 dias e pendências que seguem abertas.
        </p>
      </div>

      {grupos.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
          Nenhum alerta no momento. Tudo em dia.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {grupos.map(([tabela, itens]) => (
            <section
              key={tabela}
              className="animate-rise rounded-xl border border-border bg-card p-4"
            >
              <h2 className="font-display mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {LABELS[tabela]} · {itens.length}
              </h2>
              <ul className="divide-y divide-border">
                {itens.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 py-3">
                    <ProximityDot severidade={a.severidade} className="mt-1" />
                    <div>
                      <p className="text-sm font-medium">{a.titulo}</p>
                      <p className="text-xs text-muted-foreground">{a.descricao}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
