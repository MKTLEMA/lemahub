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
import { supabase } from "@/lib/supabase";
import * as auth from "@/lib/auth";
import { listUsers, createUser, deleteUser, resetPassword } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração — Hub LEMA" },
      { name: "description", content: "Gestão de contas e permissões do Hub de Demandas LEMA." },
      { property: "og:title", content: "Administração — Hub LEMA" },
      {
        property: "og:description",
        content: "Crie contas, defina permissões e redefina senhas.",
      },
    ],
  }),
  component: AdminPage,
});

type Perfil = {
  id: string;
  email: string;
  nome: string;
  role: auth.Role;
};

const ROLES: auth.Role[] = ["admin", "editor", "leitor"];

function AdminPage() {
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [eu, setEu] = useState<auth.Conta | null>(null);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [role, setRole] = useState<auth.Role>("editor");
  const [senhaGerada, setSenhaGerada] = useState<{
    email: string;
    senha: string;
  } | null>(null);

  async function carregar() {
    const conta = await auth.currentConta();
    setEu(conta);
    const { data } = await supabase.from("perfis").select("id, email, nome, role").order("email");
    setPerfis((data as Perfil[]) ?? []);
  }

  useEffect(() => {
    void carregar();
    return auth.subscribeAuth(() => void carregar());
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
    try {
      const res = await createUser({
        data: { email, password: "Temp1234!" },
      });
      await supabase.from("perfis").upsert({
        id: res.id,
        email,
        nome: nome || email.split("@")[0],
        role,
      });
      setSenhaGerada({ email, senha: "Temp1234!" });
      setEmail("");
      setNome("");
      toast.success("Conta criada.");
      void carregar();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar conta";
      toast.error(msg);
    }
  }

  return (
    <div className="animate-rise space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Administração</h1>
        <p className="text-sm text-muted-foreground">Contas de acesso ao hub via Supabase Auth.</p>
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
            <DialogTitle className="font-display">Conta criada</DialogTitle>
            <DialogDescription>
              Senha temporária. O usuário deve redefinir no primeiro acesso.
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
            {perfis.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  <Input
                    defaultValue={p.nome}
                    aria-label={`Nome de ${p.email}`}
                    onBlur={async (e) => {
                      const novoNome = e.target.value.trim();
                      if (novoNome && novoNome !== p.nome) {
                        await supabase.from("perfis").update({ nome: novoNome }).eq("id", p.id);
                        toast.success("Nome atualizado.");
                        void carregar();
                      }
                    }}
                  />
                </TableCell>
                <TableCell>{p.email}</TableCell>
                <TableCell>
                  <Select
                    value={p.role}
                    onValueChange={async (v) => {
                      await supabase.from("perfis").update({ role: v }).eq("id", p.id);
                      toast.success("Permissão atualizada.");
                      void carregar();
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
                        const nova = "Temp1234!";
                        try {
                          await resetPassword({
                            data: { userId: p.id, password: nova },
                          });
                          setSenhaGerada({ email: p.email, senha: nova });
                          toast.success("Senha redefinida.");
                        } catch {
                          toast.error("Erro ao redefinir senha.");
                        }
                      }}
                    >
                      <KeyRound className="size-4" /> Senha
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={p.id === eu?.id}
                      onClick={async () => {
                        try {
                          await deleteUser({ data: { userId: p.id } });
                          await supabase.from("perfis").delete().eq("id", p.id);
                          toast.success("Conta removida.");
                          void carregar();
                        } catch {
                          toast.error("Erro ao remover conta.");
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {perfis.length === 0 && (
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
