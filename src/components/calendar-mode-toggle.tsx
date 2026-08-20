import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { CalendarModo } from "@/components/calendar-board";

export function CalendarModeToggle({
  value,
  onValueChange,
}: {
  value: CalendarModo;
  onValueChange: (v: CalendarModo) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v as CalendarModo)}
      variant="outline"
      size="sm"
    >
      <ToggleGroupItem value="eventos">Eventos</ToggleGroupItem>
      <ToggleGroupItem value="aniversarios">Aniversários</ToggleGroupItem>
      <ToggleGroupItem value="ambos">Ambos</ToggleGroupItem>
    </ToggleGroup>
  );
}
