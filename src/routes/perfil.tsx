import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as auth from "@/lib/auth";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Hub LEMA" },
      { name: "description", content: "Dados da sua conta e troca de senha no Hub LEMA." },
      { property: "og:title", content: "Perfil — Hub LEMA" },
      { property: "og:description", content: "Gerencie sua conta e senha no Hub de Demandas LEMA." },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const [conta, setConta] = useState<auth.Conta | null>(null);
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");

  useEffect(() => {
    setConta(auth.currentConta());
    return auth.subscribeAuth(() => setConta(auth.currentConta()));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!conta) return;
    if (nova !== confirma) {
      toast.error("A confirmação não confere.");
      return;
    }
    const res = await auth.alterarSenhaPropria(conta.email, atual, nova);
    if (res.ok) {
      toast.success("Senha alterada.");
      setAtual("");
      setNova("");
      setConfirma("");
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <div className="animate-rise mx-auto max-w-xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground">Sua conta de acesso ao hub.</p>
      </header>

      <div className="rounded-xl border border-border bg-card p-5">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Nome</dt>
            <dd className="text-sm">{conta?.nome ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">E-mail</dt>
            <dd className="text-sm">{conta?.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Permissão</dt>
            <dd className="text-sm capitalize">{conta?.role ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Alterar senha</h2>
        <div className="space-y-1.5">
          <Label htmlFor="atual">Senha atual</Label>
          <Input
            id="atual"
            type="password"
            required
            value={atual}
            onChange={(e) => setAtual(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nova">Nova senha</Label>
          <Input
            id="nova"
            type="password"
            required
            minLength={6}
            value={nova}
            onChange={(e) => setNova(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirma">Confirmar nova senha</Label>
          <Input
            id="confirma"
            type="password"
            required
            minLength={6}
            value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
          />
        </div>
        <Button type="submit">Salvar nova senha</Button>
      </form>
    </div>
  );
}
