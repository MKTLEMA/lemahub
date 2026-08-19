import { createFileRoute, useLocation, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CalendarBoard, type CalendarModo } from "@/components/calendar-board";
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
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

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

  const rows = useMemo(() => {
    const q = busca.toLowerCase();
    return db.eventos.filter((e) =>
      `${e.nome} ${e.cidade} ${e.estado} ${e.local} ${e.associacao_relacionada}`
        .toLowerCase()
        .includes(q),
    );
  }, [db.eventos, busca]);

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
      />

      <Tabs value={tab} onValueChange={setTab} className="animate-rise">
        <TabsList className="mb-4">
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead className="tabular-nums">Início</TableHead>
                  <TableHead className="tabular-nums">Fim</TableHead>
                  <TableHead>Participantes</TableHead>
                  <TableHead>Materiais</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => {
                  const dias = diasAte(e.data_inicio);
                  const sev = dias !== null && dias >= 0 && dias <= 3 ? "alerta" : "ok";
                  return (
                    <TableRow
                      key={e.id}
                      ref={(node) => {
                        rowRefs.current[e.id] = node;
                      }}
                      className={
                        destaque === e.id
                          ? "animate-rise bg-accent/10 ring-2 ring-accent"
                          : "animate-rise"
                      }
                    >
                      <TableCell className="font-medium">
                        <span className="flex flex-wrap items-center gap-2">
                          <ProximityDot severidade={sev} label={e.nome} />
                          {e.acao_promocional ? <PromoBadge /> : null}
                        </span>
                        <span className="block pl-[18px] text-xs text-muted-foreground">
                          {e.associacao_relacionada}
                        </span>
                      </TableCell>
                      <TableCell>
                        {e.local}
                        <span className="block text-xs text-muted-foreground">
                          {e.cidade}/{e.estado}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {e.data_inicio.split("-").reverse().join("/")}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {e.data_fim.split("-").reverse().join("/")}
                      </TableCell>
                      <TableCell className="max-w-40 truncate">
                        {e.participantes.join(", ") || "—"}
                      </TableCell>
                      <TableCell className="max-w-40 truncate">
                        {e.materiais.join(", ") || "—"}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Nenhum evento encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="calendario">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ToggleGroup
              type="single"
              value={modo}
              onValueChange={(v) => v && setModo(v as CalendarModo)}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="eventos">Eventos</ToggleGroupItem>
              <ToggleGroupItem value="aniversarios">Aniversários</ToggleGroupItem>
              <ToggleGroupItem value="ambos">Ambos</ToggleGroupItem>
            </ToggleGroup>
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
              if (!e) return;
              setNovoInicial(undefined);
              setEditando(e);
              setOpen(true);
            }}
          />
        </TabsContent>
      </Tabs>

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
