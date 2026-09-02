import {
  Cake,
  Package,
  Receipt,
  CalendarDays,
  Shirt,
  Pen,
  CupSoda,
  TrendingUp,
  Mail,
  type LucideIcon,
} from "lucide-react";
import type { TabelaNome } from "@/lib/types";

const ICONES: Record<TabelaNome, LucideIcon> = {
  colaboradores: Cake,
  compras_castanhas: Package,
  compras_financeiro: Receipt,
  eventos: CalendarDays,
  estoque_fardamentos: Shirt,
  estoque_canetas: Pen,
  estoque_copos: CupSoda,
  gastos_endomarketing: TrendingUp,
  destinatarios_lembrete: Mail,
};

export function AlertaIcone({ tabela, className }: { tabela: TabelaNome; className?: string }) {
  const Icon = ICONES[tabela] ?? CalendarDays;
  return <Icon className={className ?? "size-4 shrink-0 text-muted-foreground"} />;
}
