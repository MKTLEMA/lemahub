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
import type { EstoqueCopo } from "@/lib/types";

export const Route = createFileRoute("/estoque-copos")({
  head: () => ({
    meta: [
      { title: "Estoque de Copos — Hub LEMA" },
      { name: "description", content: "Controle de copos, canecas e garrafas para brindes." },
      { property: "og:title", content: "Estoque de Copos — Hub LEMA" },
      { property: "og:description", content: "Saldo de copos, canecas e garrafas do marketing." },
    ],
  }),
  component: EstoqueCoposPage,
});

const FIELDS: FieldSpec[] = [
  { name: "tipo", label: "Tipo", type: "select", options: ["Copo", "Caneca", "Garrafa"] },
  { name: "capacidade", label: "Capacidade", type: "text" },
  { name: "cor", label: "Cor", type: "text" },
  { name: "quantidade", label: "Quantidade", type: "number" },
  { name: "observacao", label: "Observação", type: "text" },
];

function EstoqueCoposPage() {
  const db = useDb();
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<EstoqueCopo | null>(null);
  const [historicoId, setHistoricoId] = useState<string | null>(null);
  const [limite, setLimite] = useState(() => getThresholds()["copos"]);

  useEffect(() => {
    setLimite(getThresholds()["copos"]);
    return subscribeThresholds(() => setLimite(getThresholds()["copos"]));
  }, []);

  const rows = useMemo(() => {
    const q = busca.toLowerCase();
    return db.estoque_copos.filter((r) =>
      `${r.tipo} ${r.capacidade} ${r.cor} ${r.observacao}`.toLowerCase().includes(q),
    );
  }, [db.estoque_copos, busca]);

  return (
    <>
      <ModuleHeader
        titulo="Estoque de Copos"
        descricao="Copos, canecas e garrafas disponíveis."
        busca={busca}
        onBusca={setBusca}
        onNovo={() => {
          setEditando(null);
          setOpen(true);
        }}
        extra={
          <span className="flex items-center gap-2">
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
                setThreshold("copos", v);
              }}
            />
          </span>
        }
        onExportar={() => exportCsv("estoque-copos", rows)}
      />

      <div className="animate-rise overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Capacidade</TableHead>
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
                  <ProximityDot severidade={r.quantidade <= limite ? "alerta" : "ok"} label={r.tipo} />
                </TableCell>
                <TableCell>{r.capacidade}</TableCell>
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
                      deleteRow("estoque_copos", r.id);
                      toast.success("Item excluído.");
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
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
        title={editando ? "Editar item" : "Novo copo"}
        description="Controle de copos, canecas e garrafas."
        fields={FIELDS}
        initial={editando ? (editando as unknown as FormValues) : undefined}
        onSubmit={(values) => {
          if (editando) {
            updateRow("estoque_copos", editando.id, values as Partial<EstoqueCopo>);
            toast.success("Item atualizado.");
          } else {
            insertRow("estoque_copos", values as never);
            toast.success("Item cadastrado.");
          }
        }}
      />

      <HistoricoDialog registroId={historicoId} onOpenChange={() => setHistoricoId(null)} />
    </>
  );
}
