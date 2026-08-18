import { cn } from "@/lib/utils";
import type { Severidade } from "@/lib/alerts";

const COLORS: Record<Severidade, string> = {
  ok: "text-[var(--ok)]",
  alerta: "text-[var(--alerta)]",
  pendente: "text-[var(--pendente)]",
};

/**
 * Elemento-assinatura do app: dot colorido com anel pulsante sutil.
 */
export function ProximityDot({
  severidade,
  label,
  className,
}: {
  severidade: Severidade;
  label?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("relative inline-flex size-2.5", COLORS[severidade])}>
        <span
          className="absolute inset-0 rounded-full"
          style={
            severidade === "ok"
              ? undefined
              : { animation: "lema-pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite" }
          }
        />
        <span className="size-2.5 rounded-full bg-current" />
      </span>
      {label ? <span className="text-sm">{label}</span> : null}
    </span>
  );
}
