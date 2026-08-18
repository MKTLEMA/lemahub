import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { iniciais } from "@/components/entity-form";
import type { Colaborador } from "@/lib/types";

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="grid gap-0.5 border-b border-border/60 py-2 last:border-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</span>
      <span className="text-sm">{valor || "—"}</span>
    </div>
  );
}

const br = (d: string) => (d ? d.split("-").reverse().join("/") : "");

export function ColaboradorCard({
  colaborador,
  onOpenChange,
}: {
  colaborador: Colaborador | null;
  onOpenChange: (open: boolean) => void;
}) {
  const c = colaborador;
  return (
    <Dialog open={!!c} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        {c ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-4">
                {c.foto_url ? (
                  <img
                    src={c.foto_url}
                    alt={`Foto de ${c.nome}`}
                    className="size-16 rounded-full border border-border object-cover"
                  />
                ) : (
                  <span className="flex size-16 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
                    {iniciais(c.nome)}
                  </span>
                )}
                <div className="text-left">
                  <DialogTitle className="font-display">{c.nome}</DialogTitle>
                  <DialogDescription>
                    {c.setor} · {c.empresa_grupo}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="grid gap-0 sm:grid-cols-2 sm:gap-x-6">
              <Linha rotulo="E-mail" valor={c.email} />
              <Linha rotulo="Formato de trabalho" valor={c.formato_trabalho} />
              <Linha rotulo="Ingresso" valor={br(c.data_ingresso)} />
              <Linha rotulo="Aniversário" valor={br(c.data_aniversario)} />
              <Linha rotulo="Gênero" valor={c.genero} />
              <Linha rotulo="Tamanho de camisa" valor={c.tamanho_farda} />
              <Linha rotulo="Contratação" valor={c.tipo_contratacao} />
              <Linha rotulo="Formação" valor={c.curso_formacao} />
              <Linha rotulo="Tem filhos" valor={c.tem_filhos ? "Sim" : "Não"} />
              <Linha rotulo="Detalhes dos filhos" valor={c.detalhes_filhos} />
              <Linha rotulo="Restrição alimentar" valor={c.restricao_alimentar} />
              <Linha rotulo="Hobby" valor={c.hobby} />
              <Linha rotulo="Contato de emergência" valor={c.contato_emergencia_nome} />
              <Linha rotulo="Parentesco" valor={c.contato_emergencia_parentesco} />
              <Linha rotulo="Telefone de emergência" valor={c.contato_emergencia_telefone} />
              <Linha rotulo="Endereço" valor={c.endereco} />
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
