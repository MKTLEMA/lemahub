import { createFileRoute } from "@tanstack/react-router";
import { Copy, KeyRound, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as auth from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração — Hub LEMA" },
      { name: "description", content: "Gestão de contas e permissões do Hub de Demandas LEMA." },
      { property: "og:title", content: "Administração — Hub LEMA" },
      { property: "og:description", content: "Crie contas, defina permissões e redefina senhas." },
    ],
  }),
  component: AdminPage,
});

const ROLES: auth.Role[] = ["admin", "editor", "leitor"];

function AdminPage() {
  const [contas, setContas] = useState<auth.Conta[]>([]);
  const [eu, setEu] = useState<auth.Conta | null>(null);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [role, setRole] = useState<auth.Role>("editor");
  const [senhaGerada, setSenhaGerada] = useState<{ email: string; senha: string } | null>(null);

  useEffect(() => {
    const sync = () => {
      setContas(auth.listarContas());
      setEu(auth.currentConta());
    };
    void auth.garantirSeed().then(sync);
    sync();
    return auth.subscribeAuth(sync);
  }, []);

  const souAdmin = eu?.role === "admin";

  if (eu && !souAdmin) {
    return (
      <div className="animate-rise mx-auto max-w-xl rounded-xl border border-border bg-card p-6 text-center">
        <h1 className="font-display text-xl font-semibold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Apenas contas com permissão de administrador podem gerenciar acessos.
        </p>
      </div>
    );
  }

  async function criar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await auth.criarConta({ email, nome, role });
    if (!res.ok) {
      toast.error(res.erro);
      return;
    }
    setSenhaGerada({ email: email.trim().toLowerCase(), senha: res.senha });
    setEmail("");
    setNome("");
    toast.success("Conta criada.");
  }

  return (
    <div className="animate-rise space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Administração</h1>
        <p className="text-sm text-muted-foreground">
          Contas de acesso ao hub. As senhas ficam apenas neste navegador (acesso mock).
        </p>
      </header>

      <form
        onSubmit={criar}
        className="grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-[1fr_1fr_10rem_auto] sm:items-end"
      >
        <div className="space-y-1.5">
          <Label htmlFor="novo-email">E-mail</Label>
          <Input
            id="novo-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="pessoa@lemaef.com.br"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="novo-nome">Nome</Label>
          <Input id="novo-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="novo-role">Permissão</Label>
          <Select value={role} onValueChange={(v) => setRole(v as auth.Role)}>
            <SelectTrigger id="novo-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit">
          <UserPlus className="size-4" /> Criar
        </Button>
      </form>

      <Dialog open={!!senhaGerada} onOpenChange={(o) => !o && setSenhaGerada(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Senha gerada</DialogTitle>
            <DialogDescription>
              Copie agora; não será mostrada novamente.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{senhaGerada?.email}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 font-mono text-base tracking-wide">
              {senhaGerada?.senha}
            </code>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(senhaGerada?.senha ?? "");
                  toast.success("Senha copiada.");
                } catch {
                  toast.error("Não foi possível copiar. Selecione e copie manualmente.");
                }
              }}
            >
              <Copy className="size-4" /> Copiar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead className="w-40">Permissão</TableHead>
              <TableHead className="w-52 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contas.map((c) => (
              <TableRow key={c.email}>
                <TableCell className="font-medium">
                  <Input
                    defaultValue={c.nome}
                    aria-label={`Nome de ${c.email}`}
                    onBlur={(e) => {
                      const nome = e.target.value.trim();
                      if (nome && nome !== c.nome) {
                        auth.atualizarConta(c.email, { nome });
                        toast.success("Nome atualizado.");
                      }
                    }}
                  />
                </TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>
                  <Select
                    value={c.role}
                    onValueChange={(v) => {
                      auth.atualizarConta(c.email, { role: v as auth.Role });
                      toast.success("Permissão atualizada.");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const senha = await auth.resetarSenha(c.email);
                        setSenhaGerada({ email: c.email, senha });
                      }}
                    >
                      <KeyRound className="size-4" /> Senha
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={c.email === eu?.email}
                      onClick={() => {
                        auth.excluirConta(c.email);
                        toast.success("Conta removida.");
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {contas.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Nenhuma conta cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
