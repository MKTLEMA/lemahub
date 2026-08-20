import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Megaphone } from "lucide-react";
import type { Evento } from "@/lib/types";
import { diasAte } from "@/lib/alerts";
import { ProximityDot } from "@/components/proximity-dot";

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="grid gap-0.5 border-b border-border/60 py-2 last:border-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</span>
      <span className="text-sm">{valor || "—"}</span>
    </div>
  );
}

const br = (d: string) => (d ? d.split("-").reverse().join("/") : "");

export function EventoCard({
  evento,
  onOpenChange,
  onEditar,
}: {
  evento: Evento | null;
  onOpenChange: (open: boolean) => void;
  onEditar?: (evento: Evento) => void;
}) {
  const e = evento;
  const dias = e ? diasAte(e.data_inicio) : null;
  const sev = dias !== null && dias >= 0 && dias <= 3 ? "alerta" : "ok";

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
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
