import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type OpcaoBuscavel = {
  value: string;
  label: string;
  grupo?: string;
  keywords?: string[];
};

export function SeletorBuscavel({
  id,
  value,
  onValueChange,
  options,
  gruposOcultos = [],
  placeholder = "Selecione",
  comNenhum = true,
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: OpcaoBuscavel[];
  gruposOcultos?: string[];
  placeholder?: string;
  comNenhum?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [mostrarOcultos, setMostrarOcultos] = useState(false);

  const selecionado = options.find((o) => o.value === value);

  const grupos = useMemo(() => {
    const map = new Map<string, OpcaoBuscavel[]>();
    options.forEach((o) => {
      const g = o.grupo ?? "";
      map.set(g, [...(map.get(g) ?? []), o]);
    });
    const entradas = [...map.entries()];
    const visiveis = entradas.filter(([g]) => !gruposOcultos.includes(g));
    const ocultos = entradas.filter(([g]) => gruposOcultos.includes(g));
    return [...visiveis, ...ocultos];
  }, [options, gruposOcultos]);

  const valores = useMemo(() => {
    const vistos = new Map<string, number>();
    const unicos = new Map<string, string>();
    options.forEach((o) => {
      const n = vistos.get(o.label) ?? 0;
      vistos.set(o.label, n + 1);
      unicos.set(o.value, n === 0 ? o.label : `${o.label} (${n + 1})`);
    });
    return unicos;
  }, [options]);

  const rotuloOculto = useMemo(
    () => gruposOcultos.map((g) => g.toLowerCase()).join(", "),
    [gruposOcultos],
  );

  const itemDe = (o: OpcaoBuscavel) => (
    <CommandItem
      key={o.value}
      value={valores.get(o.value) ?? o.label}
      keywords={o.keywords ?? []}
      onSelect={() => {
        onValueChange(o.value);
        setAberto(false);
      }}
    >
      <Check className={cn(value === o.value ? "opacity-100" : "opacity-0")} />
      {o.label}
    </CommandItem>
  );

  const gruposVisiveis = grupos.filter(([g]) => !gruposOcultos.includes(g) || mostrarOcultos);

  return (
    <Popover
      open={aberto}
      onOpenChange={(o) => {
        setAberto(o);
        if (!o) setMostrarOcultos(false);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !selecionado && "text-muted-foreground")}>
            {selecionado ? selecionado.label : comNenhum ? "Nenhum" : placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-48 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por nome ou data..." />
          <CommandList>
            {comNenhum && (
              <CommandGroup>
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onValueChange("");
                    setAberto(false);
                  }}
                >
                  <Check className={cn(value === "" ? "opacity-100" : "opacity-0")} />
                  Nenhum
                </CommandItem>
              </CommandGroup>
            )}
            {gruposVisiveis.map(([g, itens]) =>
              g ? (
                <CommandGroup key={g} heading={g}>
                  {itens.map(itemDe)}
                </CommandGroup>
              ) : (
                <CommandGroup key="__sem-grupo__">{itens.map(itemDe)}</CommandGroup>
              ),
            )}
            <CommandEmpty>
              Nenhum resultado.
              {gruposOcultos.length > 0 && !mostrarOcultos
                ? ` Ative "Mostrar ${rotuloOculto}" para ampliar a busca.`
                : ""}
            </CommandEmpty>
          </CommandList>
          {gruposOcultos.length > 0 && (
            <div className="border-t border-border p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => setMostrarOcultos((m) => !m)}
              >
                {mostrarOcultos ? "Ocultar" : "Mostrar"} {rotuloOculto}
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
