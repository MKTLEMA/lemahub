import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { CalendarDays, Package, Receipt, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { CalendarBoard } from "@/components/calendar-board";
import { ColaboradorCard } from "@/components/colaborador-card";
import { ProximityDot } from "@/components/proximity-dot";
import { calcularAlertas, diasAte, diasAteAniversario } from "@/lib/alerts";
import { useDb } from "@/lib/store";
import { LABELS, type Colaborador } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hub de Demandas de Marketing — LEMA" },
      {
        name: "description",
        content:
          "Painel interno da equipe de marketing LEMA: colaboradores, compras, eventos e alertas de prazo.",
      },
      { property: "og:title", content: "Hub de Demandas de Marketing — LEMA" },
      {
        property: "og:description",
        content: "Cadastre e monitore demandas recorrentes do marketing LEMA em um só lugar.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const db = useDb();
  const router = useRouter();
  const [detalhe, setDetalhe] = useState<Colaborador | null>(null);
  const alertas = useMemo(() => calcularAlertas(db), [db]);
  const [cursor, setCursor] = useState(() => {
    const h = new Date();
    return new Date(h.getFullYear(), h.getMonth(), 1);
  });

  const aniversarios = db.colaboradores.filter((c) => {
    const d = diasAteAniversario(c.data_aniversario);
    return d !== null && d <= 3;
  }).length;
  const castanhasPendentes = db.compras_castanhas.filter(
    (k) => !k.nota_fiscal_emitida || !k.nota_enviada_financeiro,
  ).length;
  const financeiroPendente = db.compras_financeiro.filter(
    (f) => !f.nota_enviada_financeiro,
  ).length;
  const eventosProximos = db.eventos.filter((e) => {
    const d = diasAte(e.data_inicio);
    return d !== null && d >= 0 && d <= 3;
  }).length;

  const kpis = [
    {
      to: "/colaboradores" as const,
      label: "Aniversários próximos",
      value: aniversarios,
      total: `${db.colaboradores.length} colaboradores`,
      icon: Users,
      sev: aniversarios > 0 ? ("alerta" as const) : ("ok" as const),
    },
    {
      to: "/castanhas" as const,
      label: "Castanhas pendentes",
      value: castanhasPendentes,
      total: `${db.compras_castanhas.length} compras`,
      icon: Package,
      sev: castanhasPendentes > 0 ? ("pendente" as const) : ("ok" as const),
    },
    {
      to: "/financeiro" as const,
      label: "Notas ao financeiro",
      value: financeiroPendente,
      total: `${db.compras_financeiro.length} registros`,
      icon: Receipt,
      sev: financeiroPendente > 0 ? ("pendente" as const) : ("ok" as const),
    },
    {
      to: "/eventos" as const,
      label: "Eventos em 3 dias",
      value: eventosProximos,
      total: `${db.eventos.length} eventos`,
      icon: CalendarDays,
      sev: eventosProximos > 0 ? ("alerta" as const) : ("ok" as const),
    },
  ];

  return (
    <>
      <div className="animate-rise mb-6">
        <h1 className="font-display text-2xl font-bold">Visão geral</h1>
        <p className="text-sm text-muted-foreground">
          Demandas recorrentes do marketing LEMA, com indicador de proximidade em cada registro.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ to, label, value, total, icon: Icon, sev }) => (
          <Link
            key={to}
            to={to}
            className="animate-rise group rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
          >
            <div className="mb-3 flex items-center justify-between">
              <Icon className="size-4 text-muted-foreground" />
              <ProximityDot severidade={sev} />
            </div>
            <p className="font-display text-3xl font-bold tabular-nums">{value}</p>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{total}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
      <section className="animate-rise">
        <CalendarBoard
          compact
          modo="ambos"
          cursor={cursor}
          onCursor={setCursor}
          eventos={db.eventos}
          aniversariantes={db.colaboradores}
          onPickEvento={(id) => {
            void router.navigate({ to: "/eventos", state: { destacarEventoId: id } as never });
          }}
          onPickAniversariante={(id) =>
            setDetalhe(db.colaboradores.find((c) => c.id === id) ?? null)
          }
        />
      </section>

      <section className="animate-rise rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Central de Alertas</h2>
          <Link to="/alertas" className="text-sm text-accent hover:underline">
            Ver tudo
          </Link>
        </div>
        {alertas.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum alerta no momento.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {alertas.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-start gap-3 py-3">
                <ProximityDot severidade={a.severidade} className="mt-1" />
                <div>
                  <p className="text-sm font-medium">{a.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {LABELS[a.tabela]} · {a.descricao}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>

      <ColaboradorCard colaborador={detalhe} onOpenChange={(o) => !o && setDetalhe(null)} />
    </>
  );
}
