import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AnexoViewer } from "@/components/anexo-viewer";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleHeader, RowActions } from "@/components/module-page";
import { EntityForm, type FieldSpec, type FormValues } from "@/components/entity-form";
import { HistoricoDialog } from "@/components/historico-dialog";
import { ProximityDot } from "@/components/proximity-dot";
import { deleteRow, insertRow, updateRow, useDb } from "@/lib/store";
import { exportCsv } from "@/lib/csv";
import {
  SortableHeader,
  applySort,
  type SortConfig,
  type SortOption,
} from "@/components/sort-controls";
import { isConcluidoFinanceiro, type CompraFinanceiro } from "@/lib/types";

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
  { name: "pagamento_solicitado_bitrix", label: "Pagamento aberto", type: "boolean" },
  {
    name: "data_abertura_pagamento",
    label: "Data abertura pagamento",
    type: "date",
    visibleIf: { field: "pagamento_solicitado_bitrix", equals: true },
  },
  {
    name: "link_bitrix",
    label: "Link Bitrix",
    type: "text",
    visibleIf: { field: "pagamento_solicitado_bitrix", equals: true },
  },
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
    { value: "data_orcamento", label: "Orçamento", type: "date" },
  ];
  const [sort, setSort] = useState<SortConfig | null>(null);
  const [aba, setAba] = useState<"pendentes" | "concluidos">("pendentes");
  const pendentesCount = useMemo(
    () => db.compras_financeiro.filter((f) => !isConcluidoFinanceiro(f)).length,
    [db.compras_financeiro],
  );
  const concluidosCount = db.compras_financeiro.length - pendentesCount;
  const rowsBase = useMemo(() => {
    const q = busca.toLowerCase();
    return db.compras_financeiro.filter((f) =>
      `${f.finalidade} ${f.fornecedor} ${f.solicitante}`.toLowerCase().includes(q),
    );
  }, [db.compras_financeiro, busca]);
  const rows = useMemo(() => {
    const filtrado =
      aba === "pendentes"
        ? rowsBase.filter((f) => !isConcluidoFinanceiro(f))
        : rowsBase.filter((f) => isConcluidoFinanceiro(f));
    return applySort(
      filtrado,
      sort,
      SORT_OPTS,
      (f, field) => (f as unknown as Record<string, string | number | null>)[field],
    );
  }, [rowsBase, aba, sort]);

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
        onExportar={() => exportCsv("compras-financeiro", db.compras_financeiro)}
        extra={null}
      />
      <Tabs
        value={aba}
        onValueChange={(v) => setAba(v as typeof aba)}
        className="animate-rise mb-4"
      >
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes ({pendentesCount})</TabsTrigger>
          <TabsTrigger value="concluidos">Concluídos ({concluidosCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="animate-rise overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader option={SORT_OPTS[0]!} value={sort} onChange={setSort} />
              <SortableHeader option={SORT_OPTS[1]!} value={sort} onChange={setSort} />
              <SortableHeader option={SORT_OPTS[2]!} value={sort} onChange={setSort} />
              <SortableHeader
                option={SORT_OPTS[3]!}
                value={sort}
                onChange={setSort}
                className="tabular-nums"
              />
              <SortableHeader
                option={SORT_OPTS[4]!}
                value={sort}
                onChange={setSort}
                className="tabular-nums"
              />
              <SortableHeader
                option={SORT_OPTS[5]!}
                value={sort}
                onChange={setSort}
                className="tabular-nums"
              />
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
                    severidade={isConcluidoFinanceiro(f) ? "ok" : "pendente"}
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
                    <AnexoViewer url={f.comprovante_url} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-3">
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
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`fbitrix-${f.id}`}
                        checked={!!f.pagamento_solicitado_bitrix}
                        onCheckedChange={(c) => {
                          const patch: Partial<CompraFinanceiro> = {
                            pagamento_solicitado_bitrix: c,
                          };
                          if (!c) {
                            (patch as Record<string, unknown>)["data_abertura_pagamento"] = "";
                            (patch as Record<string, unknown>)["link_bitrix"] = "";
                          }
                          updateRow("compras_financeiro", f.id, patch);
                          toast.success(c ? "Pagamento aberto." : "Pagamento pendente.");
                        }}
                      />
                      <Label htmlFor={`fbitrix-${f.id}`} className="text-xs">
                        Pagamento aberto
                      </Label>
                    </div>
                    {f.pagamento_solicitado_bitrix && f.link_bitrix ? (
                      <a
                        href={f.link_bitrix}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent underline hover:text-accent/80"
                      >
                        Bitrix
                      </a>
                    ) : null}
                    <Badge variant={isConcluidoFinanceiro(f) ? "secondary" : "destructive"}>
                      {isConcluidoFinanceiro(f) ? "ok" : "pendente"}
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
                    onExcluir={async () => {
                      const res = await deleteRow("compras_financeiro", f.id);
                      if (res.ok) {
                        toast.success("Registro excluído.");
                      } else {
                        toast.error(res.erro);
                      }
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  {aba === "pendentes" && concluidosCount > 0
                    ? `Nenhum registro pendente — ${concluidosCount} concluído(s) na aba Concluídos.`
                    : aba === "concluidos" && pendentesCount > 0
                      ? `Nenhum registro concluído — ${pendentesCount} pendente(s) na aba Pendentes.`
                      : "Nenhum registro encontrado."}
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
        onSubmit={async (values) => {
          const pagamentoAberto = Boolean(values["pagamento_solicitado_bitrix"]);
          const dados = {
            ...values,
            ...(!pagamentoAberto ? { data_abertura_pagamento: "", link_bitrix: "" } : {}),
          } as Partial<CompraFinanceiro>;
          if (editando) {
            const r = await updateRow("compras_financeiro", editando.id, dados);
            if (r.ok) {
              toast.success("Registro atualizado.");
            } else {
              toast.error(r.erro);
            }
          } else {
            const r = await insertRow("compras_financeiro", dados as never);
            if (r.ok) {
              toast.success("Compra registrada.");
            } else {
              toast.error(r.erro);
            }
          }
        }}
      />

      <HistoricoDialog registroId={historicoId} onOpenChange={() => setHistoricoId(null)} />
    </>
  );
}
