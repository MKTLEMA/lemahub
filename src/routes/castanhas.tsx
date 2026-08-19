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
import { diasAte, severidadePorDias } from "@/lib/alerts";
import { exportCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import type { CompraCastanha } from "@/lib/types";

export const Route = createFileRoute("/castanhas")({
  head: () => ({
    meta: [
      { title: "Compras Castanhas — Hub LEMA" },
      { name: "description", content: "Controle de compras de castanhas, prazos e notas fiscais." },
      { property: "og:title", content: "Compras Castanhas — Hub LEMA" },
      { property: "og:description", content: "Prazos de entrega e pendências de nota fiscal." },
    ],
  }),
  component: CastanhasPage,
});

const BASE_FIELDS: FieldSpec[] = [
  { name: "solicitante", label: "Solicitante", type: "text" },
  { name: "finalidade", label: "Finalidade", type: "text" },
  { name: "valor", label: "Valor (R$)", type: "number" },
  { name: "fornecedor", label: "Fornecedor", type: "text" },
  { name: "data_solicitacao", label: "Data da solicitação", type: "date" },
  { name: "prazo_entrega", label: "Prazo de entrega", type: "date" },
  { name: "observacao", label: "Observação", type: "text" },
  { name: "numero_nf", label: "Número da NF", type: "text" },
  { name: "anexo_url", label: "Anexo (PDF/JPG/PNG)", type: "file" },
  { name: "nota_fiscal_emitida", label: "Nota fiscal emitida", type: "boolean" },
  { name: "nota_enviada_financeiro", label: "Nota enviada ao financeiro", type: "boolean" },
];

const VAZIO_CASTANHA = {
  data_solicitacao: "",
  observacao: "",
  numero_nf: "",
  vinculado_a: null as string | null,
  anexo_url: "",
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function CastanhasPage() {
  const db = useDb();
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<CompraCastanha | null>(null);
  const [historicoId, setHistoricoId] = useState<string | null>(null);
  const [destaque, setDestaque] = useState<string | null>(null);

  const fields = useMemo<FieldSpec[]>(() => {
    const outros = db.compras_castanhas
      .filter((k) => k.id !== editando?.id)
      .map((k) => ({ value: k.id, label: `${k.fornecedor} · ${k.finalidade}` }));
    return [
      ...BASE_FIELDS,
      {
        name: "vinculado_a",
        label: "Vinculado a outro pedido",
        type: "select",
        optionsKV: outros,
      },
    ];
  }, [db.compras_castanhas, editando]);

  /** Pedidos ligados por vinculação explícita (simétrica) ou mesmo nº de NF. */
  const paresDe = (k: CompraCastanha) =>
    db.compras_castanhas.filter(
      (o) =>
        o.id !== k.id &&
        (o.vinculado_a === k.id ||
          k.vinculado_a === o.id ||
          (!!k.numero_nf?.trim() && o.numero_nf?.trim() === k.numero_nf.trim())),
    );

  const rows = useMemo(() => {
    const q = busca.toLowerCase();
    return db.compras_castanhas.filter((k) =>
      `${k.fornecedor} ${k.finalidade} ${k.solicitante}`.toLowerCase().includes(q),
    );
  }, [db.compras_castanhas, busca]);

  return (
    <>
      <ModuleHeader
        titulo="Compras Castanhas"
        descricao="Pedidos, prazos de entrega e status de nota fiscal."
        busca={busca}
        onBusca={setBusca}
        onNovo={() => {
          setEditando(null);
          setOpen(true);
        }}
        onExportar={() => exportCsv("compras-castanhas", rows)}
        templateHeaders={BASE_FIELDS.map((f) => f.name)}
        onImportar={(linhas) => {
          let total = 0;
          linhas.forEach((linha) => {
            if (!linha["fornecedor"] && !linha["finalidade"]) return;
            insertRow("compras_castanhas", {
              solicitante: linha["solicitante"] ?? "",
              finalidade: linha["finalidade"] ?? "",
              valor: Number(linha["valor"] ?? 0) || 0,
              fornecedor: linha["fornecedor"] ?? "",
              prazo_entrega: linha["prazo_entrega"] ?? "",
              data_solicitacao: linha["data_solicitacao"] ?? "",
              observacao: linha["observacao"] ?? "",
              numero_nf: linha["numero_nf"] ?? "",
              vinculado_a: null,
              anexo_url: "",
              nota_fiscal_emitida: /^(true|sim|1)$/i.test(linha["nota_fiscal_emitida"] ?? ""),
              nota_enviada_financeiro: /^(true|sim|1)$/i.test(
                linha["nota_enviada_financeiro"] ?? "",
              ),
            });
            total += 1;
          });
          toast.success(`${total} compra(s) importada(s).`);
        }}
      />

      <div className="animate-rise overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Finalidade</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead className="tabular-nums">Valor</TableHead>
              <TableHead className="tabular-nums">Prazo</TableHead>
              <TableHead>NF</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((k) => {
              const dias = diasAte(k.prazo_entrega);
              const pendente = !k.nota_fiscal_emitida || !k.nota_enviada_financeiro;
              const sev = pendente ? "pendente" : severidadePorDias(dias);
              const pares = paresDe(k);
              return (
                <TableRow
                  key={k.id}
                  className={cn(
                    "animate-rise",
                    destaque === k.id && "bg-accent/10 ring-1 ring-accent",
                  )}
                >
                  <TableCell className="font-medium">
                    <ProximityDot severidade={sev} label={k.fornecedor} />
                  </TableCell>
                  <TableCell>{k.finalidade}</TableCell>
                  <TableCell>{k.solicitante}</TableCell>
                  <TableCell className="tabular-nums">{brl(k.valor)}</TableCell>
                  <TableCell className="tabular-nums">
                    {k.prazo_entrega.split("-").reverse().join("/")}
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="tabular-nums">{k.numero_nf || "—"}</span>
                      {pares.length > 0 ? (
                        <Badge
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => setDestaque(pares[0]!.id)}
                          title={pares.map((p) => `${p.fornecedor} · ${p.finalidade}`).join(", ")}
                        >
                          Vinculado
                        </Badge>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`nf-${k.id}`}
                          checked={k.nota_fiscal_emitida}
                          onCheckedChange={(c) => {
                            updateRow("compras_castanhas", k.id, { nota_fiscal_emitida: c });
                            toast.success(`NF ${c ? "emitida" : "pendente"}.`);
                          }}
                        />
                        <Label htmlFor={`nf-${k.id}`} className="text-xs">
                          NF
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`fin-${k.id}`}
                          checked={k.nota_enviada_financeiro}
                          onCheckedChange={(c) => {
                            updateRow("compras_castanhas", k.id, { nota_enviada_financeiro: c });
                            toast.success(`Financeiro ${c ? "notificado" : "pendente"}.`);
                          }}
                        />
                        <Label htmlFor={`fin-${k.id}`} className="text-xs">
                          Fin
                        </Label>
                      </div>
                      <Badge variant={pendente ? "destructive" : "secondary"}>
                        {pendente ? "pendente" : "ok"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RowActions
                      onEditar={() => {
                        setEditando(k);
                        setOpen(true);
                      }}
                      onHistorico={() => setHistoricoId(k.id)}
                      onExcluir={() => {
                        deleteRow("compras_castanhas", k.id);
                        toast.success("Compra excluída.");
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Nenhuma compra encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <EntityForm
        open={open}
        onOpenChange={setOpen}
        title={editando ? "Editar compra" : "Nova compra de castanhas"}
        description="Registre o pedido e acompanhe as pendências de nota."
        fields={fields}
        initial={editando ? (editando as unknown as FormValues) : undefined}
        onSubmit={(values) => {
          if (editando) {
            updateRow("compras_castanhas", editando.id, values as Partial<CompraCastanha>);
            toast.success("Compra atualizada.");
          } else {
            insertRow("compras_castanhas", { ...VAZIO_CASTANHA, ...values } as never);
            toast.success("Compra registrada.");
          }
        }}
      />

      <HistoricoDialog registroId={historicoId} onOpenChange={() => setHistoricoId(null)} />
    </>
  );
}
