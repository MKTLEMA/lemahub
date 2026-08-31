import { useMemo } from "react";
import { Bell, BellRing } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertaIcone } from "@/components/alerta-icone";
import { ProximityDot } from "@/components/proximity-dot";
import { diasAte, type AlertaItem } from "@/lib/alerts";
import type { Evento } from "@/lib/types";

const quando = (d: number) => (d === 0 ? "hoje" : d === 1 ? "amanhã" : `em ${d} dias`);

export function AlertaPopup({
  aberto,
  onOpenChange,
  alertas,
  eventos,
  onVerCentral,
}: {
  aberto: boolean;
  onOpenChange: (open: boolean) => void;
  alertas: AlertaItem[];
  eventos: Evento[];
  onVerCentral: () => void;
}) {
  const proximos = alertas.filter((a) => a.severidade === "alerta").length;
  const pendentes = alertas.filter((a) => a.severidade === "pendente").length;
  const cor = pendentes > 0 ? "pendente" : "alerta";

  const lembretes = useMemo(
    () =>
      eventos
        .map((e) => ({ evento: e, dias: diasAte(e.data_inicio) }))
        .filter((x) => x.dias !== null && x.dias >= 0 && x.dias <= 3)
        .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0))
        .map((x) => ({ evento: x.evento, dias: x.dias ?? 0 })),
    [eventos],
  );

  const outros = alertas.filter((a) => a.tabela !== "eventos");

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="flex items-center gap-4 border-b border-border p-5">
          <span
            className="relative flex size-11 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `var(--${cor})` }}
          >
            <span
              className="absolute inset-0 animate-ping rounded-full opacity-30"
              style={{ backgroundColor: `var(--${cor})` }}
            />
            <BellRing className="relative size-5 text-white" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="font-display text-lg font-bold leading-tight">
              Central de Alertas
            </DialogTitle>
            <DialogDescription>
              {proximos} item(ns) na janela de 3 dias · {pendentes} pendência(s) em aberto.
            </DialogDescription>
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto">
          {lembretes.length > 0 && (
            <div className="p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Lembretes de eventos
              </p>
              <ul className="space-y-2">
                {lembretes.map(({ evento, dias }) => (
                  <li key={evento.id} className="rounded-lg border border-border bg-muted/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{evento.nome}</p>
                      <Badge
                        className="shrink-0 border-transparent text-white"
                        style={{ backgroundColor: "var(--alerta)" }}
                      >
                        {quando(dias)}
                      </Badge>
                    </div>
                    {evento.participantes.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Quem vai:</span>{" "}
                        {evento.participantes.join(", ")}
                      </p>
                    )}
                    {evento.materiais.length > 0 && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Materiais:</span>{" "}
                        {evento.materiais.join(", ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-5 pt-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Outros alertas
            </p>
            {outros.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Nenhum outro alerta em aberto.</p>
            ) : (
              <ul className="divide-y divide-border">
                {outros.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 py-2.5">
                    <AlertaIcone tabela={a.tabela} className="mt-0.5 size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{a.titulo}</p>
                      <p className="text-xs text-muted-foreground">{a.descricao}</p>
                    </div>
                    <ProximityDot severidade={a.severidade} className="mt-1.5" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Dispensar
          </Button>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onVerCentral();
            }}
          >
            <Bell className="size-4" /> Ver Central de Alertas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
