import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortConfig = {
  field: string;
  direction: "asc" | "desc";
};

export type SortOption = {
  value: string;
  label: string;
  type: "text" | "number" | "date";
};

export function applySort<T>(
  items: T[],
  config: SortConfig | null,
  options: SortOption[],
  getVal: (item: T, field: string) => string | number | null | undefined,
): T[] {
  if (!config) return items;
  const opt = options.find((o) => o.value === config.field);
  if (!opt) return items;
  const dir = config.direction === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const va = getVal(a, config.field);
    const vb = getVal(b, config.field);
    if (opt.type === "number") {
      return ((Number(va) || 0) - (Number(vb) || 0)) * dir;
    }
    if (opt.type === "date") {
      const sa = String(va ?? "");
      const sb = String(vb ?? "");
      if (!sa) return 1;
      if (!sb) return -1;
      return sa.localeCompare(sb) * dir;
    }
    return String(va ?? "").localeCompare(String(vb ?? ""), "pt-BR") * dir;
  });
}

export function SortControls({
  options,
  value,
  onChange,
}: {
  options: SortOption[];
  value: SortConfig | null;
  onChange: (v: SortConfig | null) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={value?.field ?? ""}
        onValueChange={(f) => onChange({ field: f, direction: value?.direction ?? "asc" })}
      >
        <SelectTrigger className="w-32" aria-label="Ordenar por">
          <SelectValue placeholder="Ordenar" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        className="size-9 shrink-0"
        aria-label={value?.direction === "asc" ? "Crescente" : "Decrescente"}
        onClick={() =>
          onChange(
            value
              ? { ...value, direction: value.direction === "asc" ? "desc" : "asc" }
              : { field: options[0]!.value, direction: "desc" },
          )
        }
      >
        {!value ? (
          <ArrowUpDown className="size-4" />
        ) : value.direction === "asc" ? (
          <ArrowUp className="size-4" />
        ) : (
          <ArrowDown className="size-4" />
        )}
      </Button>
    </div>
  );
}
