import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ModuleHeader, RowActions } from "@/components/module-page";
import { EntityForm, type FieldSpec, type FormValues } from "@/components/entity-form";
import { HistoricoDialog } from "@/components/historico-dialog";
import { ProximityDot } from "@/components/proximity-dot";
import { deleteRow, insertRow, updateRow, useDb } from "@/lib/store";
import { exportCsv } from "@/lib/csv";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getThresholds, setThreshold, subscribeThresholds } from "@/lib/thresholds";
import {
  SortControls,
  applySort,
  type SortConfig,
  type SortOption,
} from "@/components/sort-controls";
import type { EstoqueCaneta } from "@/lib/types";

export const Route = createFileRoute("/estoque-canetas")({
  head: () => ({
    meta: [
      { title: "Estoque de Canetas — Hub LEMA" },
      { name: "description", content: "Controle de modelos, cores e quantidades de canetas." },
      { property: "og:title", content: "Estoque de Canetas — Hub LEMA" },
      { property: "og:description", content: "Saldo de canetas para brindes e eventos." },
    ],
  }),
  component: EstoqueCanetasPage,
});

const FIELDS: FieldSpec[] = [
  { name: "modelo", label: "Modelo", type: "text" },
  { name: "cor", label: "Cor", type: "text" },
  { name: "quantidade", label: "Quantidade", type: "number" },
  { name: "observacao", label: "Observação", type: "text" },
];

function EstoqueCanetasPage() {
  const db = useDb();
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<EstoqueCaneta | null>(null);
  const [historicoId, setHistoricoId] = useState<string | null>(null);
  const [limite, setLimite] = useState(() => getThresholds()["canetas"]);

  useEffect(() => {
    setLimite(getThresholds()["canetas"]);
    return subscribeThresholds(() => setLimite(getThresholds()["canetas"]));
  }, []);

  const SORT_OPTS: SortOption[] = [
    { value: "modelo", label: "Modelo", type: "text" },
    { value: "cor", label: "Cor", type: "text" },
    { value: "quantidade", label: "Quantidade", type: "number" },
  ];
  const [sort, setSort] = useState<SortConfig | null>(null);
  const rows = useMemo(() => {
    const q = busca.toLowerCase();
    const filtered = db.estoque_canetas.filter((r) =>
      `${r.modelo} ${r.cor} ${r.observacao}`.toLowerCase().includes(q),
    );
    return applySort(
      filtered,
      sort,
      SORT_OPTS,
      (r, f) => (r as unknown as Record<string, string | number | null>)[f],
    );
  }, [db.estoque_canetas, busca, sort]);

  return (
    <>
      <ModuleHeader
        titulo="Estoque de Canetas"
        descricao="Modelos, cores e quantidades disponíveis."
        busca={busca}
        onBusca={setBusca}
        onNovo={() => {
          setEditando(null);
          setOpen(true);
        }}
        extra={
          <div className="flex items-center gap-2">
            <SortControls options={SORT_OPTS} value={sort} onChange={setSort} />
            <Label htmlFor="limite" className="whitespace-nowrap text-xs text-muted-foreground">
              Estoque baixo &le;
            </Label>
            <Input
              id="limite"
              type="number"
              min={0}
              className="w-24"
              value={limite}
              onChange={(e) => {
                const v = Number(e.target.value);
                setLimite(v);
                setThreshold("canetas", v);
              }}
            />
          </div>
        }
        onExportar={() => exportCsv("estoque-canetas", rows)}
      />

      <div className="animate-rise overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Modelo</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead className="tabular-nums">Quantidade</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} className="animate-rise">
                <TableCell className="font-medium">
                  <ProximityDot
                    severidade={r.quantidade <= limite ? "alerta" : "ok"}
                    label={r.modelo}
                  />
                </TableCell>
                <TableCell>{r.cor}</TableCell>
                <TableCell className="tabular-nums">{r.quantidade}</TableCell>
                <TableCell className="max-w-60 truncate">{r.observacao || "—"}</TableCell>
                <TableCell>
                  <RowActions
                    onEditar={() => {
                      setEditando(r);
                      setOpen(true);
                    }}
                    onHistorico={() => setHistoricoId(r.id)}
                    onExcluir={() => {
                      deleteRow("estoque_canetas", r.id);
                      toast.success("Item excluído.");
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Nenhum item encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <EntityForm
        open={open}
        onOpenChange={setOpen}
        title={editando ? "Editar item" : "Nova caneta"}
        description="Controle de canetas para brindes."
        fields={FIELDS}
        initial={editando ? (editando as unknown as FormValues) : undefined}
        onSubmit={(values) => {
          if (editando) {
            updateRow("estoque_canetas", editando.id, values as Partial<EstoqueCaneta>);
            toast.success("Item atualizado.");
          } else {
            insertRow("estoque_canetas", values as never);
            toast.success("Item cadastrado.");
          }
        }}
      />

      <HistoricoDialog registroId={historicoId} onOpenChange={() => setHistoricoId(null)} />
    </>
  );
}
