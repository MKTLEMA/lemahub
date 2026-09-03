import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleHeader, RowActions } from "@/components/module-page";
import { EntityForm, type FieldSpec, type FormValues } from "@/components/entity-form";
import { HistoricoDialog } from "@/components/historico-dialog";
import { ProximityDot } from "@/components/proximity-dot";
import { deleteRow, insertRow, updateRow, useDb } from "@/lib/store";

import { exportCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { AnexoViewer } from "@/components/anexo-viewer";
import {
  SortableHeader,
  applySort,
  type SortConfig,
  type SortOption,
} from "@/components/sort-controls";
import { isConcluidoCastanha, type CompraCastanha, type Evento } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileCardList } from "@/components/mobile-card-list";
import { LembretePopover } from "@/components/lembrete-popover";
import * as auth from "@/lib/auth";

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

const VAZIO_CASTANHA = {
  data_solicitacao: "",
  observacao: "",
  numero_nf: "",
  vinculado_a: null as string | null,
  anexo_url: "",
  pagamento_solicitado_bitrix: false,
  data_abertura_pagamento: "",
  link_bitrix: "",
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const br = (d: string) => (d ? d.split("-").reverse().join("/") : "");

function CastanhasPage() {
  const db = useDb();
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<CompraCastanha | null>(null);
  const [historicoId, setHistoricoId] = useState<string | null>(null);
  const [destaque, setDestaque] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [conta, setConta] = useState<auth.Conta | null>(null);

  useEffect(() => {
    let vivo = true;
    const carregar = () =>
      void auth.currentConta().then((c) => {
        if (vivo) setConta(c);
      });
    carregar();
    const unsub = auth.subscribeAuth(carregar);
    return () => {
      vivo = false;
      unsub();
    };
  }, []);

  const podeLembrete = conta?.role === "admin" || conta?.role === "editor";

  const hojeIso = useMemo(() => {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
  }, []);

  const fields = useMemo<FieldSpec[]>(() => {
    const outros = db.compras_castanhas
      .filter((k) => k.id !== editando?.id)
      .map((k) => ({ value: k.id, label: `${k.fornecedor} · ${k.finalidade}` }));
    const deEvento = (e: Evento, encerrado: boolean) => ({
      value: e.id,
      label: `${e.nome}${e.data_inicio ? ` · ${br(e.data_inicio)}` : ""}`,
      grupo: encerrado ? "Eventos encerrados" : "Próximos eventos",
      keywords: [e.nome, e.data_inicio, br(e.data_inicio)].filter(Boolean),
    });
    const encerrados = db.eventos
      .filter((e) => !!e.data_inicio && e.data_inicio < hojeIso)
      .sort((a, b) => (b.data_inicio ?? "").localeCompare(a.data_inicio ?? ""))
      .map((e) => deEvento(e, true));
    const proximos = db.eventos
      .filter((e) => !e.data_inicio || e.data_inicio >= hojeIso)
      .sort((a, b) => (a.data_inicio ?? "9999-12-31").localeCompare(b.data_inicio ?? "9999-12-31"))
      .map((e) => deEvento(e, false));
    return [
      ...BASE_FIELDS,
      {
        name: "vinculado_a",
        label: "Vinculado a outro pedido",
        type: "select",
        optionsKV: outros,
      },
      {
        name: "evento_id",
        label: "Evento vinculado",
        type: "combobox",
        optionsKV: [...proximos, ...encerrados],
        gruposOcultos: ["Eventos encerrados"],
      },
    ];
  }, [db.compras_castanhas, db.eventos, editando, hojeIso]);

  /** Pedidos ligados por vinculação explícita (simétrica) ou mesmo nº de NF. */
  const paresDe = (k: CompraCastanha) =>
    db.compras_castanhas.filter(
      (o) =>
        o.id !== k.id &&
        (o.vinculado_a === k.id ||
          k.vinculado_a === o.id ||
          (!!k.numero_nf?.trim() && o.numero_nf?.trim() === k.numero_nf.trim())),
    );

  const SORT_OPTS: SortOption[] = [
    { value: "fornecedor", label: "Fornecedor", type: "text" },
    { value: "finalidade", label: "Finalidade", type: "text" },
    { value: "solicitante", label: "Solicitante", type: "text" },
    { value: "valor", label: "Valor", type: "number" },
    { value: "prazo_entrega", label: "Prazo", type: "text" },
  ];
  const [sort, setSort] = useState<SortConfig | null>(null);
  const [aba, setAba] = useState<"pendentes" | "concluidos">("pendentes");
  const pendentesCount = useMemo(
    () => db.compras_castanhas.filter((k) => !isConcluidoCastanha(k)).length,
    [db.compras_castanhas],
  );
  const concluidosCount = db.compras_castanhas.length - pendentesCount;
  const rowsBase = useMemo(() => {
    const q = busca.toLowerCase();
    return db.compras_castanhas.filter((k) =>
      `${k.fornecedor} ${k.finalidade} ${k.solicitante}`.toLowerCase().includes(q),
    );
  }, [db.compras_castanhas, busca]);
  const rows = useMemo(() => {
    const filtrado =
      aba === "pendentes"
        ? rowsBase.filter((k) => !isConcluidoCastanha(k))
        : rowsBase.filter((k) => isConcluidoCastanha(k));
    return applySort(
      filtrado,
      sort,
      SORT_OPTS,
      (k, f) => (k as unknown as Record<string, string | number | null>)[f],
    );
  }, [rowsBase, aba, sort]);

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
        onExportar={() => exportCsv("compras-castanhas", db.compras_castanhas)}
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
              pagamento_solicitado_bitrix: /^(true|sim|1)$/i.test(
                linha["pagamento_solicitado_bitrix"] ?? "",
              ),
              data_abertura_pagamento: linha["data_abertura_pagamento"] ?? "",
              link_bitrix: linha["link_bitrix"] ?? "",
            });
            total += 1;
          });
          toast.success(`${total} compra(s) importada(s).`);
        }}
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
              <TableHead>NF</TableHead>
              <TableHead>Notas</TableHead>
              {podeLembrete && <TableHead className="text-right">Lembrete</TableHead>}
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((k) => {
              const concluido = isConcluidoCastanha(k);
              const pendente = !concluido;
              const sev = pendente ? "pendente" : "ok";
              const pares = paresDe(k);
              const eventoVinculado = k.evento_id
                ? db.eventos.find((e) => e.id === k.evento_id)
                : undefined;
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
                  <TableCell>
                    {eventoVinculado ? (
                      <Badge
                        variant="outline"
                        className="cursor-pointer gap-1"
                        title={`Vinculado ao evento ${eventoVinculado.nome} — clique para abrir`}
                        onClick={() => {
                          void router.navigate({
                            to: "/eventos",
                            state: { destacarEventoId: eventoVinculado.id } as never,
                          });
                        }}
                      >
                        <Link2 className="size-3" />
                        {eventoVinculado.nome}
                      </Badge>
                    ) : (
                      k.finalidade
                    )}
                  </TableCell>
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
                    <div className="flex flex-wrap items-center gap-3">
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
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`bitrix-${k.id}`}
                          checked={!!k.pagamento_solicitado_bitrix}
                          onCheckedChange={(c) => {
                            const patch: Partial<CompraCastanha> = {
                              pagamento_solicitado_bitrix: c,
                            };
                            if (!c) {
                              (patch as Record<string, unknown>)["data_abertura_pagamento"] = "";
                              (patch as Record<string, unknown>)["link_bitrix"] = "";
                            }
                            updateRow("compras_castanhas", k.id, patch);
                            toast.success(c ? "Pagamento aberto." : "Pagamento pendente.");
                          }}
                        />
                        <Label htmlFor={`bitrix-${k.id}`} className="text-xs">
                          Pagamento aberto
                        </Label>
                      </div>
                      {k.pagamento_solicitado_bitrix && k.link_bitrix ? (
                        <a
                          href={k.link_bitrix}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent underline hover:text-accent/80"
                        >
                          Bitrix
                        </a>
                      ) : null}
                      <AnexoViewer url={k.anexo_url} />
                      <Badge variant={pendente ? "destructive" : "secondary"}>
                        {pendente ? "pendente" : "ok"}
                      </Badge>
                    </div>
                  </TableCell>
                  {podeLembrete && (
                    <TableCell className="whitespace-nowrap text-right">
                      <LembretePopover pedido={k} />
                    </TableCell>
                  )}
                  <TableCell>
                    <RowActions
                      onEditar={() => {
                        setEditando(k);
                        setOpen(true);
                      }}
                      onHistorico={() => setHistoricoId(k.id)}
                      onExcluir={async () => {
                        const res = await deleteRow("compras_castanhas", k.id);
                        if (res.ok) {
                          toast.success("Compra excluída.");
                        } else {
                          toast.error(res.erro);
                        }
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={podeLembrete ? 9 : 8}
                  className="py-10 text-center text-muted-foreground"
                >
                  {aba === "pendentes" && concluidosCount > 0
                    ? `Nenhum pedido pendente — ${concluidosCount} concluído(s) na aba Concluídos.`
                    : aba === "concluidos" && pendentesCount > 0
                      ? `Nenhum pedido concluído — ${pendentesCount} pendente(s) na aba Pendentes.`
                      : "Nenhuma compra encontrada."}
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
        onSubmit={async (values) => {
          const eventoId = String(values["evento_id"] ?? "") || null;
          const ev = db.eventos.find((x) => x.id === eventoId);
          const desvinculando = !!editando?.evento_id && !eventoId;
          const pagamentoAberto = Boolean(values["pagamento_solicitado_bitrix"]);
          const dados = {
            ...values,
            vinculado_a: String(values["vinculado_a"] ?? "") || null,
            finalidade: ev ? ev.nome : String(values["finalidade"] ?? ""),
            ...(eventoId || desvinculando ? { evento_id: eventoId } : {}),
            ...(!pagamentoAberto ? { data_abertura_pagamento: "", link_bitrix: "" } : {}),
          } as Partial<CompraCastanha>;
          if (editando) {
            const r = await updateRow("compras_castanhas", editando.id, dados);
            if (r.ok) {
              toast.success(
                ev ? `Compra atualizada e vinculada a ${ev.nome}.` : "Compra atualizada.",
              );
            } else {
              toast.error(r.erro);
            }
          } else {
            const r = await insertRow("compras_castanhas", {
              ...VAZIO_CASTANHA,
              ...dados,
            } as never);
            if (r.ok) {
              toast.success(
                ev ? `Compra registrada e vinculada a ${ev.nome}.` : "Compra registrada.",
              );
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
