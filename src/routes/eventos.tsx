import { createFileRoute, useLocation, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleHeader, RowActions } from "@/components/module-page";
import { EntityForm, type FieldSpec, type FormValues } from "@/components/entity-form";
import { HistoricoDialog } from "@/components/historico-dialog";
import { ProximityDot } from "@/components/proximity-dot";
import { deleteRow, insertRow, updateRow, useDb } from "@/lib/store";
import { diasAte } from "@/lib/alerts";
import { exportCsv } from "@/lib/csv";
import {
  SortControls,
  applySort,
  type SortConfig,
  type SortOption,
} from "@/components/sort-controls";
import { CalendarBoard, type CalendarModo } from "@/components/calendar-board";
import { CalendarModeToggle } from "@/components/calendar-mode-toggle";
import { EventoCard } from "@/components/evento-card";
import type { Evento } from "@/lib/types";

export const Route = createFileRoute("/eventos")({
  head: () => ({
    meta: [
      { title: "Eventos — Hub LEMA" },
      {
        name: "description",
        content: "Agenda de eventos, participantes e materiais do marketing.",
      },
      { property: "og:title", content: "Eventos — Hub LEMA" },
      { property: "og:description", content: "Agenda de eventos e checklist de materiais." },
    ],
  }),
  component: EventosPage,
});

const FIELDS: FieldSpec[] = [
  { name: "nome", label: "Nome do evento", type: "text" },
  { name: "data_inicio", label: "Data de início", type: "date" },
  { name: "data_fim", label: "Data de fim", type: "date" },
  { name: "cidade", label: "Cidade", type: "text" },
  { name: "estado", label: "Estado", type: "text" },
  { name: "local", label: "Local", type: "text" },
  { name: "associacao_relacionada", label: "Associação relacionada", type: "text" },
  { name: "participantes", label: "Participantes", type: "list" },
  { name: "materiais", label: "Materiais", type: "list" },
  { name: "acao_promocional", label: "Ação promocional", type: "boolean" },
  {
    name: "acao_tipo",
    label: "Tipo de ação",
    type: "text",
    visibleIf: { field: "acao_promocional", equals: true },
  },
  {
    name: "acao_tem_brindes",
    label: "Haverá brindes",
    type: "boolean",
    visibleIf: { field: "acao_promocional", equals: true },
  },
  {
    name: "acao_descricao_brindes",
    label: "Descrição dos brindes",
    type: "text",
    visibleIf: { field: "acao_promocional", equals: true },
  },
  {
    name: "acao_custo",
    label: "Custo da ação (R$)",
    type: "number",
    visibleIf: { field: "acao_promocional", equals: true },
  },
  {
    name: "acao_necessarias",
    label: "Ações necessárias",
    type: "text",
    visibleIf: { field: "acao_promocional", equals: true },
  },
];

function PromoBadge() {
  return (
    <Badge
      className="gap-1 border-transparent text-white"
      style={{ backgroundColor: "var(--promocao)" }}
    >
      <Megaphone className="size-3" /> Promoção
    </Badge>
  );
}

const br = (d: string) => (d ? d.split("-").reverse().join("/") : "");

function parseDate(iso: string): Date | null {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function getWeekEnd(d: Date): Date {
  const end = new Date(d);
  const day = end.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  end.setDate(end.getDate() + diff);
  end.setHours(23, 59, 59, 999);
  return end;
}

function EventosPage() {
  const db = useDb();
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Evento | null>(null);
  const [novoInicial, setNovoInicial] = useState<FormValues | undefined>(undefined);
  const [historicoId, setHistoricoId] = useState<string | null>(null);
  const hoje = new Date();
  const [modo, setModo] = useState<CalendarModo>("ambos");
  const [cursor, setCursor] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const router = useRouter();
  const stateDestaque = useLocation({
    select: (l) => (l.state as { destacarEventoId?: string } | undefined)?.destacarEventoId,
  });
  const [destaque, setDestaque] = useState<string | null>(null);
  const [tab, setTab] = useState("lista");
  const [detalhe, setDetalhe] = useState<Evento | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!stateDestaque) return;
    setDestaque(stateDestaque);
    rowRefs.current[stateDestaque]?.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = setTimeout(() => {
      setDestaque(null);
      void router.navigate({ to: "/eventos", replace: true, state: {} as never });
    }, 3000);
    return () => clearTimeout(t);
  }, [stateDestaque, router]);

  const SORT_OPTS: SortOption[] = [
    { value: "nome", label: "Evento", type: "text" },
    { value: "data_inicio", label: "Início", type: "date" },
    { value: "data_fim", label: "Fim", type: "date" },
    { value: "local", label: "Local", type: "text" },
  ];
  const [sort, setSort] = useState<SortConfig | null>(null);
  const rows = useMemo(() => {
    const q = busca.toLowerCase();
    const filtered = db.eventos.filter((e) =>
      `${e.nome} ${e.cidade} ${e.estado} ${e.local} ${e.associacao_relacionada}`
        .toLowerCase()
        .includes(q),
    );
    return applySort(
      filtered,
      sort,
      SORT_OPTS,
      (e, f) => (e as unknown as Record<string, string | number | null>)[f],
    );
  }, [db.eventos, busca, sort]);

  const hojeInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const semanaFim = getWeekEnd(hoje);
  const mesInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const mesFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  const colunas: { titulo: string; filtro: (e: Evento) => boolean }[] = useMemo(
    () => [
      {
        titulo: "Hoje",
        filtro: (e) => {
          const dt = parseDate(e.data_inicio);
          if (!dt) return false;
          return dt.getTime() === hojeInicio.getTime();
        },
      },
      {
        titulo: "Essa semana",
        filtro: (e) => {
          const dt = parseDate(e.data_inicio);
          if (!dt) return false;
          return dt > hojeInicio && dt <= semanaFim;
        },
      },
      {
        titulo: "Esse mês",
        filtro: (e) => {
          const dt = parseDate(e.data_inicio);
          if (!dt) return false;
          return (
            dt > semanaFim &&
            dt.getMonth() === hoje.getMonth() &&
            dt.getFullYear() === hoje.getFullYear()
          );
        },
      },
      {
        titulo: "Próximos meses",
        filtro: (e) => {
          const dt = parseDate(e.data_inicio);
          if (!dt) return false;
          return dt > mesFim;
        },
      },
      {
        titulo: "Encerrados",
        filtro: (e) => {
          const dt = parseDate(e.data_inicio);
          if (!dt) return false;
          return dt < hojeInicio;
        },
      },
    ],
    [hojeInicio, semanaFim, mesFim, hoje],
  );

  const abrirNovo = (dataInicio?: string) => {
    setEditando(null);
    setNovoInicial(dataInicio ? ({ data_inicio: dataInicio } as FormValues) : undefined);
    setOpen(true);
  };

  return (
    <>
      <ModuleHeader
        titulo="Eventos"
        descricao="Agenda, participantes e materiais necessários por evento."
        busca={busca}
        onBusca={setBusca}
        onNovo={() => abrirNovo()}
        onExportar={() => exportCsv("eventos", rows)}
        templateHeaders={[
          "nome",
          "data_inicio",
          "data_fim",
          "cidade",
          "estado",
          "local",
          "associacao_relacionada",
          "participantes",
          "materiais",
        ]}
        onImportar={(linhas) => {
          let total = 0;
          linhas.forEach((linha) => {
            if (!linha["nome"]) return;
            insertRow("eventos", {
              nome: linha["nome"] ?? "",
              data_inicio: linha["data_inicio"] ?? "",
              data_fim: linha["data_fim"] ?? "",
              cidade: linha["cidade"] ?? "",
              estado: linha["estado"] ?? "",
              local: linha["local"] ?? "",
              associacao_relacionada: linha["associacao_relacionada"] ?? "",
              participantes: (linha["participantes"] ?? "")
                .split("|")
                .map((s) => s.trim())
                .filter(Boolean),
              materiais: (linha["materiais"] ?? "")
                .split("|")
                .map((s) => s.trim())
                .filter(Boolean),
              acao_promocional: false,
              acao_tipo: "",
              acao_tem_brindes: false,
              acao_descricao_brindes: "",
              acao_custo: 0,
              acao_necessarias: "",
            });
            total += 1;
          });
          toast.success(`${total} evento(s) importado(s).`);
        }}
        extra={<SortControls options={SORT_OPTS} value={sort} onChange={setSort} />}
      />

      <Tabs value={tab} onValueChange={setTab} className="animate-rise">
        <TabsList className="mb-4">
          <TabsTrigger
            value="lista"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors hover:bg-accent/10"
          >
            Lista
          </TabsTrigger>
          <TabsTrigger
            value="kanban"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors hover:bg-accent/10"
          >
            Kanban
          </TabsTrigger>
          <TabsTrigger
            value="calendario"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors hover:bg-accent/10"
          >
            Calendário
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          <div className="space-y-3">
            {rows.map((e) => {
              const dias = diasAte(e.data_inicio);
              const sev = dias !== null && dias >= 0 && dias <= 3 ? "alerta" : "ok";
              return (
                <div
                  key={e.id}
                  ref={(node) => {
                    rowRefs.current[e.id] = node;
                  }}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetalhe(e)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") setDetalhe(e);
                  }}
                  className={`animate-rise cursor-pointer rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md ${
                    destaque === e.id ? "ring-2 ring-accent bg-accent/10" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <ProximityDot severidade={sev} label={e.nome} />
                        {e.acao_promocional ? <PromoBadge /> : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {e.associacao_relacionada && `${e.associacao_relacionada} · `}
                        {e.cidade ? `${e.cidade}/${e.estado ?? ""}` : e.local || ""}
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {br(e.data_inicio)}
                        {e.data_fim ? ` – ${br(e.data_fim)}` : ""}
                      </p>
                      {e.participantes.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Quem vai:</span>{" "}
                          {e.participantes.join(", ")}
                        </p>
                      )}
                      {e.materiais.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Materiais:</span>{" "}
                          {e.materiais.join(", ")}
                        </p>
                      )}
                    </div>
                    <div onClick={(ev) => ev.stopPropagation()}>
                      <RowActions
                        onEditar={() => {
                          setNovoInicial(undefined);
                          setEditando(e);
                          setOpen(true);
                        }}
                        onHistorico={() => setHistoricoId(e.id)}
                        onExcluir={() => {
                          deleteRow("eventos", e.id);
                          toast.success("Evento excluído.");
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && (
              <div className="rounded-xl border border-border bg-card py-10 text-center text-muted-foreground">
                Nenhum evento encontrado.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="kanban">
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-4" style={{ minWidth: "max-content" }}>
              {colunas.map(({ titulo, filtro }) => {
                const itens = rows.filter(filtro);
                return (
                  <div key={titulo} className="w-72 shrink-0">
                    <div className="mb-3 flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{titulo}</h3>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {itens.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {itens.map((e) => {
                        const dias = diasAte(e.data_inicio);
                        const sev = dias !== null && dias >= 0 && dias <= 3 ? "alerta" : "ok";
                        return (
                          <div
                            key={e.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setDetalhe(e)}
                            onKeyDown={(ev) => {
                              if (ev.key === "Enter") setDetalhe(e);
                            }}
                            className="cursor-pointer rounded-xl border border-border bg-card p-3 transition-shadow hover:shadow-md"
                          >
                            <div className="flex items-center gap-2">
                              <ProximityDot severidade={sev} />
                              {e.acao_promocional ? <PromoBadge /> : null}
                            </div>
                            <p className="mt-1 text-sm font-medium">{e.nome}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {br(e.data_inicio)}
                              {e.data_fim ? ` – ${br(e.data_fim)}` : ""}
                            </p>
                            {e.participantes.length > 0 && (
                              <p className="mt-1 text-xs text-muted-foreground truncate">
                                {e.participantes.join(", ")}
                              </p>
                            )}
                          </div>
                        );
                      })}
                      {itens.length === 0 && (
                        <div className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                          Nenhum evento
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendario">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <CalendarModeToggle value={modo} onValueChange={setModo} />
          </div>
          <CalendarBoard
            modo={modo}
            cursor={cursor}
            onCursor={setCursor}
            eventos={rows}
            destaqueEventoId={destaque}
            aniversariantes={db.colaboradores}
            onPickDate={(iso) => abrirNovo(iso)}
            onPickEvento={(id) => {
              const e = db.eventos.find((x) => x.id === id);
              if (e) setDetalhe(e);
            }}
          />
        </TabsContent>
      </Tabs>

      <EventoCard
        evento={detalhe}
        onOpenChange={(o) => !o && setDetalhe(null)}
        onEditar={(e) => {
          setDetalhe(null);
          setNovoInicial(undefined);
          setEditando(e);
          setOpen(true);
        }}
      />

      <EntityForm
        open={open}
        onOpenChange={setOpen}
        title={editando ? "Editar evento" : "Novo evento"}
        description="Participantes e materiais aceitam vários itens separados por vírgula."
        fields={FIELDS}
        initial={editando ? (editando as unknown as FormValues) : novoInicial}
        onSubmit={(values) => {
          if (editando) {
            updateRow("eventos", editando.id, values as Partial<Evento>);
            toast.success("Evento atualizado.");
          } else {
            insertRow("eventos", values as never);
            toast.success("Evento criado.");
          }
        }}
      />

      <HistoricoDialog registroId={historicoId} onOpenChange={() => setHistoricoId(null)} />
    </>
  );
}
