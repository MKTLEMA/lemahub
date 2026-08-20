import React from "react";
import { MoreHorizontal, Pencil, Trash2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDb } from "@/lib/store";
import { TabelaNome } from "@/lib/types";

type MobileColumn = {
  key: string;
  label: string;
  render?: (
    value: string | number | boolean | null,
    row: Record<string, unknown>,
  ) => React.ReactNode;
};

type MobileCardOptions = {
  columns: MobileColumn[];
  rows: Record<string, unknown>[];
  onEditar?: (id: string) => void;
  onExcluir?: (id: string) => void;
  onHistorico?: (id: string, tabela: TabelaNome) => void;
  tabela?: TabelaNome;
};

export function MobileCardList({
  columns,
  rows,
  onEditar,
  onExcluir,
  onHistorico,
  tabela,
}: MobileCardOptions) {
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const id = (row as { id?: string }).id || (row as { id?: string })["id"] || "";
        return (
          <div
            key={id}
            className="p-4 border rounded-xl border-border bg-card hover:bg-card/50 transition-colors"
          >
            <div className="grid grid-cols-2 gap-2 text-sm">
              {columns.map((col) => {
                const value = col.render
                  ? col.render(
                      row[col.key as keyof Record<string, unknown>] as
                        string | number | boolean | null,
                      row,
                    )
                  : String(row[col.key] ?? "");
                return (
                  <div key={col.key} className="text-gray-600">
                    <span className="font-medium text-gray-500 col-span-1">{col.label}:</span>
                    <span className="font-normal col-span-1">{value}</span>
                  </div>
                );
              })}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Ações" className="mt-2">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEditar && (
                  <DropdownMenuItem onClick={() => onEditar(id as string)}>
                    <Pencil className="size-4" /> Editar
                  </DropdownMenuItem>
                )}
                {onHistorico && (
                  <DropdownMenuItem
                    onClick={() => onHistorico(id as string, tabela ?? "colaboradores")}
                  >
                    <History className="size-4" /> Ver histórico
                  </DropdownMenuItem>
                )}
                {onExcluir && (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onExcluir(id as string)}
                  >
                    <Trash2 className="size-4" /> Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}
    </div>
  );
}
