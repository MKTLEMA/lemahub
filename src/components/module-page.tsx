import {
  Download,
  FileUp,
  FileDown,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  History,
} from "lucide-react";
import { useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { parseCsv } from "@/lib/csv-import";

export function ModuleHeader({
  titulo,
  descricao,
  busca,
  onBusca,
  onNovo,
  onExportar,
  onImportar,
  templateHeaders,
  extra,
}: {
  titulo: string;
  descricao: string;
  busca: string;
  onBusca: (value: string) => void;
  onNovo: () => void;
  onExportar: () => void;
  onImportar?: (rows: Record<string, string>[]) => void;
  templateHeaders?: string[];
  extra?: ReactNode;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const baixarTemplate = () => {
    if (!templateHeaders?.length) return;
    const blob = new Blob([`\uFEFF${templateHeaders.join(",")}\n`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `template-${titulo.toLowerCase().replace(/\s+/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-rise mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">{titulo}</h1>
        <p className="text-sm text-muted-foreground">{descricao}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {extra}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => onBusca(e.target.value)}
            placeholder="Buscar..."
            className="w-56 pl-9"
          />
        </div>
        {templateHeaders?.length ? (
          <Button variant="outline" onClick={baixarTemplate}>
            <FileDown className="size-4" /> Template
          </Button>
        ) : null}
        {onImportar ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                onImportar(parseCsv(await file.text()));
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <FileUp className="size-4" /> Importar CSV
            </Button>
          </>
        ) : null}
        <Button variant="outline" onClick={onExportar}>
          <Download className="size-4" /> CSV
        </Button>
        <Button onClick={onNovo}>
          <Plus className="size-4" /> Novo
        </Button>
      </div>
    </div>
  );
}

export function RowActions({
  onEditar,
  onExcluir,
  onHistorico,
}: {
  onEditar: () => void;
  onExcluir: () => void;
  onHistorico: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ações">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEditar}>
          <Pencil className="size-4" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onHistorico}>
          <History className="size-4" /> Ver histórico
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onExcluir}>
          <Trash2 className="size-4" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
