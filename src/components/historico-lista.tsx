import { LABELS, type HistoricoEdicao } from "@/lib/types";

const ACAO_LABEL: Record<HistoricoEdicao["acao"], string> = {
  criacao: "Criação",
  edicao: "Edição",
  exclusao: "Exclusão",
};

const ACAO_COLOR: Record<HistoricoEdicao["acao"], string> = {
  criacao: "text-[var(--ok)]",
  edicao: "text-[var(--alerta)]",
  exclusao: "text-[var(--pendente)]",
};

export function HistoricoLista({ itens }: { itens: HistoricoEdicao[] }) {
  if (itens.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma alteração registrada.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {itens.map((h) => (
        <li key={h.id} className="animate-rise flex flex-wrap items-baseline gap-x-2 gap-y-1 py-3 text-sm">
          <span className={`font-medium ${ACAO_COLOR[h.acao]}`}>{ACAO_LABEL[h.acao]}</span>
          <span className="text-muted-foreground">em</span>
          <span className="font-medium">{LABELS[h.tabela]}</span>
          {h.campo_alterado && (
            <span className="text-muted-foreground">
              · <span className="text-foreground">{h.campo_alterado}</span>:{" "}
              <s>{h.valor_anterior || "vazio"}</s> → {h.valor_novo || "vazio"}
            </span>
          )}
          <span className="ml-auto tabular-nums text-xs text-muted-foreground">
            {new Date(h.timestamp).toLocaleString("pt-BR")} · {h.usuario_nome}
          </span>
        </li>
      ))}
    </ul>
  );
}
