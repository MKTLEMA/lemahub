import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Lock, Mail } from "lucide-react";
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
import { BrandLogo } from "@/components/brand";
import { supabase } from "@/lib/supabase";
import * as auth from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Hub de Demandas LEMA" },
      {
        name: "description",
        content: "Acesso restrito à equipe de marketing da LEMA. Entre com seu e-mail corporativo.",
      },
      { property: "og:title", content: "Entrar — Hub de Demandas LEMA" },
      {
        property: "og:description",
        content: "Área interna do marketing LEMA: entre com seu e-mail corporativo.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetEnviando, setResetEnviando] = useState(false);

  useEffect(() => {
    void auth.currentEmail().then((e) => {
      if (e) void router.navigate({ to: "/", replace: true });
    });
  }, [router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCarregando(true);
    setErro(false);
    try {
      const res = await auth.login(email, password);
      if (res.ok) {
        await router.invalidate();
        await router.navigate({ to: "/", replace: true });
      } else {
        setErro(true);
      }
    } finally {
      setCarregando(false);
    }
  }

  async function onReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResetEnviando(true);
    try {
      const redirectTo = `${window.location.origin}/reset-callback`;
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Se o e-mail existir, você receberá um link de redefinição.");
        setResetOpen(false);
        setResetEmail("");
      }
    } finally {
      setResetEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={onSubmit}
        className="animate-rise w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo className="mb-2" />
          <p className="mt-1 text-sm text-muted-foreground">
            Acesso restrito à equipe de marketing.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@lemaef.com.br"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {erro && <p className="text-sm text-destructive">E-mail ou senha inválidos.</p>}
          <Button type="submit" className="w-full" disabled={carregando}>
            <Lock className="size-4" /> {carregando ? "Entrando..." : "Entrar"}
          </Button>
          <button
            type="button"
            className="mx-auto block text-sm text-muted-foreground hover:text-foreground hover:underline"
            onClick={() => {
              setResetEmail(email);
              setResetOpen(true);
            }}
          >
            Esqueci a senha?
          </button>
        </div>
      </form>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Redefinir senha</DialogTitle>
            <DialogDescription>
              Enviaremos um link de redefinição para o e-mail cadastrado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onReset} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">E-mail</Label>
              <Input
                id="reset-email"
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="voce@lemaef.com.br"
              />
            </div>
            <Button type="submit" className="w-full" disabled={resetEnviando}>
              <Mail className="size-4" /> {resetEnviando ? "Enviando..." : "Enviar link"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
