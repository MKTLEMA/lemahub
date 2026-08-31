import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Megaphone, Package, Plus, Link2, X } from "lucide-react";
import type { Evento } from "@/lib/types";
import { diasAte } from "@/lib/alerts";
import { ProximityDot } from "@/components/proximity-dot";
import { updateRow, useDb } from "@/lib/store";

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="grid gap-0.5 border-b border-border/60 py-2 last:border-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</span>
      <span className="text-sm">{valor || "—"}</span>
    </div>
  );
}

const br = (d: string) => (d ? d.split("-").reverse().join("/") : "");
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function EventoCard({
  evento,
  onOpenChange,
  onEditar,
}: {
  evento: Evento | null;
  onOpenChange: (open: boolean) => void;
  onEditar?: (evento: Evento) => void;
}) {
  const db = useDb();
  const [vinculoOpen, setVinculoOpen] = useState(false);
  const [pedidoId, setPedidoId] = useState("");
  const e = evento;
  const dias = e ? diasAte(e.data_inicio) : null;
  const sev = dias !== null && dias >= 0 && dias <= 3 ? "alerta" : "ok";

  const pedidos = useMemo(
    () => (e ? db.compras_castanhas.filter((k) => k.evento_id === e.id) : []),
    [db.compras_castanhas, e],
  );
  const disponiveis = useMemo(
    () => db.compras_castanhas.filter((k) => !k.evento_id),
    [db.compras_castanhas],
  );

  const eventoId = e?.id ?? null;
  useEffect(() => {
    if (!eventoId) {
      setVinculoOpen(false);
      setPedidoId("");
    }
  }, [eventoId]);

  return (
    <Dialog open={!!e} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        {e ? (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ProximityDot severidade={sev} />
                  <div>
                    <DialogTitle className="font-display">{e.nome}</DialogTitle>
                    <DialogDescription>
                      {e.cidade && e.estado ? `${e.cidade}/${e.estado}` : e.local || ""}
                    </DialogDescription>
                  </div>
                </div>
                {e.acao_promocional && (
                  <Badge
                    className="gap-1 shrink-0 border-transparent text-white"
                    style={{ backgroundColor: "var(--promocao)" }}
                  >
                    <Megaphone className="size-3" /> Promoção
                  </Badge>
                )}
              </div>
            </DialogHeader>

            <div className="grid gap-0 sm:grid-cols-2 sm:gap-x-6">
              <Linha rotulo="Início" valor={br(e.data_inicio)} />
              <Linha rotulo="Fim" valor={br(e.data_fim)} />
              <Linha rotulo="Local" valor={e.local} />
              <Linha
                rotulo="Cidade/Estado"
                valor={
                  e.cidade && e.estado ? `${e.cidade}/${e.estado}` : e.cidade || e.estado || ""
                }
              />
              <Linha rotulo="Associação" valor={e.associacao_relacionada} />
              <Linha rotulo="Participantes" valor={e.participantes.join(", ")} />
              <Linha rotulo="Materiais" valor={e.materiais.join(", ")} />
              {e.acao_promocional && (
                <>
                  <Linha rotulo="Tipo de ação" valor={e.acao_tipo} />
                  <Linha rotulo="Haverá brindes" valor={e.acao_tem_brindes ? "Sim" : "Não"} />
                  {e.acao_descricao_brindes && (
                    <Linha rotulo="Descrição dos brindes" valor={e.acao_descricao_brindes} />
                  )}
                  {e.acao_custo > 0 && (
                    <Linha
                      rotulo="Custo da ação"
                      valor={`R$ ${e.acao_custo.toLocaleString("pt-BR")}`}
                    />
                  )}
                  {e.acao_necessarias && (
                    <Linha rotulo="Ações necessárias" valor={e.acao_necessarias} />
                  )}
                </>
              )}
            </div>

            <div className="mt-4 rounded-lg border border-border/60 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pedidos de castanha
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disponiveis.length === 0}
                  title={
                    disponiveis.length === 0
                      ? "Nenhum pedido disponível para vincular"
                      : "Vincular um pedido de castanha a este evento"
                  }
                  onClick={() => {
                    setPedidoId("");
                    setVinculoOpen(true);
                  }}
                >
                  <Plus className="size-4" /> Vincular pedido
                </Button>
              </div>
              {pedidos.length === 0 ? (
                <p className="py-1 text-sm text-muted-foreground">
                  Nenhum pedido de castanha vinculado a este evento.
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {pedidos.map((k) => (
                    <li key={k.id} className="flex items-center gap-3 py-2">
                      <Package className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {k.fornecedor || k.finalidade || "Pedido"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {k.finalidade} · {brl(k.valor)} · NF{" "}
                          {k.nota_fiscal_emitida ? "emitida" : "pendente"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Desvincular pedido"
                        title="Desvincular pedido"
                        onClick={async () => {
                          const r = await updateRow("compras_castanhas", k.id, {
                            evento_id: null,
                          });
                          if (r.ok) {
                            toast.success("Pedido desvinculado do evento.");
                          } else {
                            toast.error(r.erro);
                          }
                        }}
                      >
                        <X className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {onEditar && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onEditar(e);
                  }}
                >
                  <Pencil className="size-4" /> Editar
                </Button>
              </div>
            )}

            <Dialog open={vinculoOpen} onOpenChange={setVinculoOpen}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Vincular pedido de castanha</DialogTitle>
                  <DialogDescription>
                    A finalidade do pedido passa a ser o nome deste evento.
                  </DialogDescription>
                </DialogHeader>
                <Select value={pedidoId} onValueChange={setPedidoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o pedido" />
                  </SelectTrigger>
                  <SelectContent>
                    {disponiveis.map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.fornecedor || "Pedido"} · {k.finalidade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setVinculoOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    disabled={!pedidoId}
                    onClick={async () => {
                      if (!e) return;
                      const r = await updateRow("compras_castanhas", pedidoId, {
                        evento_id: e.id,
                        finalidade: e.nome,
                      });
                      if (r.ok) {
                        toast.success(`Pedido vinculado a ${e.nome}.`);
                        setVinculoOpen(false);
                      } else {
                        toast.error(r.erro);
                      }
                    }}
                  >
                    <Link2 className="size-4" /> Vincular
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
