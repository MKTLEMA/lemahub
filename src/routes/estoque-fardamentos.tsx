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
import type { EstoqueFardamento } from "@/lib/types";

export const Route = createFileRoute("/estoque-fardamentos")({
  head: () => ({
    meta: [
      { title: "Estoque de Fardamentos — Hub LEMA" },
      { name: "description", content: "Controle de peças, tamanhos e quantidades de fardamento." },
      { property: "og:title", content: "Estoque de Fardamentos — Hub LEMA" },
      { property: "og:description", content: "Peças, tamanhos e saldo do fardamento LEMA." },
    ],
  }),
  component: EstoqueFardamentosPage,
});

const FIELDS: FieldSpec[] = [
  {
    name: "peca",
    label: "Peça",
    type: "select",
    options: ["Camiseta", "Calça", "Jaqueta", "Meia", "Outro"],
  },
  { name: "tamanho", label: "Tamanho", type: "select", options: ["PP", "P", "M", "G", "GG", "XG"] },
  { name: "cor", label: "Cor", type: "text" },
  { name: "estado", label: "Estado", type: "select", options: ["Novo", "Usado", "Danificado"] },
  {
    name: "modelagem",
    label: "Modelagem",
    type: "select",
    options: ["Masculina", "Feminina", "Unissex"],
  },
  { name: "empresa", label: "Empresa do grupo", type: "text" },
  { name: "quantidade", label: "Quantidade", type: "number" },
  { name: "observacao", label: "Observação", type: "text" },
];

function EstoqueFardamentosPage() {
  const db = useDb();
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<EstoqueFardamento | null>(null);
  const [historicoId, setHistoricoId] = useState<string | null>(null);
  const [limite, setLimite] = useState(() => getThresholds()["fardamentos"]);

  useEffect(() => {
    setLimite(getThresholds()["fardamentos"]);
    return subscribeThresholds(() => setLimite(getThresholds()["fardamentos"]));
  }, []);

  const SORT_OPTS: SortOption[] = [
    { value: "peca", label: "Peça", type: "text" },
    { value: "tamanho", label: "Tamanho", type: "text" },
    { value: "cor", label: "Cor", type: "text" },
    { value: "empresa", label: "Empresa", type: "text" },
    { value: "quantidade", label: "Quantidade", type: "number" },
  ];
  const [sort, setSort] = useState<SortConfig | null>(null);
  const rows = useMemo(() => {
    const q = busca.toLowerCase();
    const filtered = db.estoque_fardamentos.filter((r) =>
      `${r.peca} ${r.tamanho} ${r.cor} ${r.estado} ${r.modelagem} ${r.empresa} ${r.observacao}`
        .toLowerCase()
        .includes(q),
    );
    return applySort(
      filtered,
      sort,
      SORT_OPTS,
      (r, f) => (r as unknown as Record<string, string | number | null>)[f],
    );
  }, [db.estoque_fardamentos, busca, sort]);

  return (
    <>
      <ModuleHeader
        titulo="Estoque de Fardamentos"
        descricao="Peças, tamanhos e quantidades disponíveis."
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
                setThreshold("fardamentos", v);
              }}
            />
          </div>
        }
        onExportar={() => exportCsv("estoque-fardamentos", rows)}
      />

      <div className="animate-rise overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Peça</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Modelagem</TableHead>
              <TableHead>Empresa</TableHead>
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
                    label={r.peca}
                  />
                </TableCell>
                <TableCell>{r.tamanho}</TableCell>
                <TableCell>{r.cor}</TableCell>
                <TableCell>{r.estado || "—"}</TableCell>
                <TableCell>{r.modelagem || "—"}</TableCell>
                <TableCell>{r.empresa || "—"}</TableCell>
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
                      deleteRow("estoque_fardamentos", r.id);
                      toast.success("Item excluído.");
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
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
        title={editando ? "Editar item" : "Novo item de fardamento"}
        description="Controle de peças por tamanho e cor."
        fields={FIELDS}
        initial={editando ? (editando as unknown as FormValues) : undefined}
        onSubmit={(values) => {
          if (editando) {
            updateRow("estoque_fardamentos", editando.id, values as Partial<EstoqueFardamento>);
            toast.success("Item atualizado.");
          } else {
            insertRow("estoque_fardamentos", values as never);
            toast.success("Item cadastrado.");
          }
        }}
      />

      <HistoricoDialog registroId={historicoId} onOpenChange={() => setHistoricoId(null)} />
    </>
  );
}
