import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ModuleHeader, RowActions } from "@/components/module-page";
import { EntityForm, type FieldSpec, type FormValues } from "@/components/entity-form";
import { HistoricoDialog } from "@/components/historico-dialog";
import { ProximityDot } from "@/components/proximity-dot";
import { deleteRow, insertRow, updateRow, useDb } from "@/lib/store";
import { exportCsv } from "@/lib/csv";
import {
  SortControls,
  applySort,
  type SortConfig,
  type SortOption,
} from "@/components/sort-controls";
import type { CompraFinanceiro } from "@/lib/types";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Compras Financeiro — Hub LEMA" },
      { name: "description", content: "Comprovantes de compra e envio de notas ao financeiro." },
      { property: "og:title", content: "Compras Financeiro — Hub LEMA" },
      {
        property: "og:description",
        content: "Controle de comprovantes e notas do marketing LEMA.",
      },
    ],
  }),
  component: FinanceiroPage,
});

const FIELDS: FieldSpec[] = [
  { name: "finalidade", label: "Finalidade", type: "text" },
  { name: "fornecedor", label: "Fornecedor", type: "text" },
  { name: "solicitante", label: "Solicitante", type: "text" },
  { name: "valor", label: "Valor (R$)", type: "number" },
  { name: "data_compra", label: "Data da compra", type: "date" },
  { name: "data_orcamento", label: "Data do orçamento", type: "date" },
  { name: "comprovante_url", label: "Comprovante (PDF/JPG/PNG)", type: "file" },
  { name: "nota_fiscal_emitida", label: "Nota fiscal emitida pelo fornecedor", type: "boolean" },
  { name: "nota_enviada_financeiro", label: "Nota enviada ao financeiro", type: "boolean" },
];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function FinanceiroPage() {
  const db = useDb();
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<CompraFinanceiro | null>(null);
  const [historicoId, setHistoricoId] = useState<string | null>(null);

  const SORT_OPTS: SortOption[] = [
    { value: "finalidade", label: "Finalidade", type: "text" },
    { value: "fornecedor", label: "Fornecedor", type: "text" },
    { value: "solicitante", label: "Solicitante", type: "text" },
    { value: "valor", label: "Valor", type: "number" },
    { value: "data_compra", label: "Data", type: "date" },
  ];
  const [sort, setSort] = useState<SortConfig | null>(null);
  const rows = useMemo(() => {
    const q = busca.toLowerCase();
    const filtered = db.compras_financeiro.filter((f) =>
      `${f.finalidade} ${f.fornecedor} ${f.solicitante}`.toLowerCase().includes(q),
    );
    return applySort(
      filtered,
      sort,
      SORT_OPTS,
      (f, field) => (f as unknown as Record<string, string | number | null>)[field],
    );
  }, [db.compras_financeiro, busca, sort]);

  return (
    <>
      <ModuleHeader
        titulo="Compras Financeiro"
        descricao="Comprovantes de compra e acompanhamento do envio de notas."
        busca={busca}
        onBusca={setBusca}
        onNovo={() => {
          setEditando(null);
          setOpen(true);
        }}
        onExportar={() => exportCsv("compras-financeiro", rows)}
        extra={<SortControls options={SORT_OPTS} value={sort} onChange={setSort} />}
      />

      <div className="animate-rise overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Finalidade</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead className="tabular-nums">Valor</TableHead>
              <TableHead className="tabular-nums">Data</TableHead>
              <TableHead className="tabular-nums">Orçamento</TableHead>
              <TableHead>Comprovante</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((f) => (
              <TableRow key={f.id} className="animate-rise">
                <TableCell className="font-medium">
                  <ProximityDot
                    severidade={
                      f.nota_enviada_financeiro && f.nota_fiscal_emitida ? "ok" : "pendente"
                    }
                    label={f.finalidade}
                  />
                </TableCell>
                <TableCell>{f.fornecedor}</TableCell>
                <TableCell>{f.solicitante}</TableCell>
                <TableCell className="tabular-nums">{brl(f.valor)}</TableCell>
                <TableCell className="tabular-nums">
                  {f.data_compra.split("-").reverse().join("/")}
                </TableCell>
                <TableCell className="tabular-nums">
                  {f.data_orcamento ? f.data_orcamento.split("-").reverse().join("/") : "—"}
                </TableCell>
                <TableCell>
                  {f.comprovante_url ? (
                    <a
                      className="text-accent underline-offset-4 hover:underline"
                      href={f.comprovante_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`fnf-${f.id}`}
                        checked={f.nota_fiscal_emitida}
                        onCheckedChange={(c) => {
                          updateRow("compras_financeiro", f.id, { nota_fiscal_emitida: c });
                          toast.success(`NF ${c ? "emitida" : "pendente"}.`);
                        }}
                      />
                      <Label htmlFor={`fnf-${f.id}`} className="text-xs">
                        NF
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`ffin-${f.id}`}
                        checked={f.nota_enviada_financeiro}
                        onCheckedChange={(c) => {
                          updateRow("compras_financeiro", f.id, { nota_enviada_financeiro: c });
                          toast.success(`Financeiro ${c ? "notificado" : "pendente"}.`);
                        }}
                      />
                      <Label htmlFor={`ffin-${f.id}`} className="text-xs">
                        Fin
                      </Label>
                    </div>
                    <Badge
                      variant={
                        f.nota_fiscal_emitida && f.nota_enviada_financeiro
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {f.nota_fiscal_emitida && f.nota_enviada_financeiro ? "ok" : "pendente"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <RowActions
                    onEditar={() => {
                      setEditando(f);
                      setOpen(true);
                    }}
                    onHistorico={() => setHistoricoId(f.id)}
                    onExcluir={() => {
                      deleteRow("compras_financeiro", f.id);
                      toast.success("Registro excluído.");
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <EntityForm
        open={open}
        onOpenChange={setOpen}
        title={editando ? "Editar registro" : "Nova compra"}
        description="Anexe o comprovante (PDF/JPG/PNG, até 2MB) e acompanhe as notas."
        fields={FIELDS}
        initial={editando ? (editando as unknown as FormValues) : undefined}
        onSubmit={(values) => {
          if (editando) {
            updateRow("compras_financeiro", editando.id, values as Partial<CompraFinanceiro>);
            toast.success("Registro atualizado.");
          } else {
            insertRow("compras_financeiro", values as never);
            toast.success("Compra registrada.");
          }
        }}
      />

      <HistoricoDialog registroId={historicoId} onOpenChange={() => setHistoricoId(null)} />
    </>
  );
}
