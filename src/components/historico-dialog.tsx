import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDb } from "@/lib/store";
import { HistoricoLista } from "@/components/historico-lista";

export function HistoricoDialog({
  registroId,
  onOpenChange,
}: {
  registroId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const db = useDb();
  const itens = db.historico_edicoes.filter((h) => h.registro_id === registroId);

  return (
    <Dialog open={Boolean(registroId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Histórico do registro</DialogTitle>
          <DialogDescription>Todas as alterações registradas neste item.</DialogDescription>
        </DialogHeader>
        <HistoricoLista itens={itens} />
      </DialogContent>
    </Dialog>
  );
}
