import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/reset-callback")({
  head: () => ({
    meta: [{ title: "Redefinindo senha — Hub LEMA" }],
  }),
  component: ResetCallbackPage,
});

function ResetCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"processando" | "ok" | "erro">("processando");

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const type = params.get("type");

    if (type === "recovery" || params.get("access_token")) {
      supabase.auth
        .getSession()
        .then(() => {
          setStatus("ok");
          setTimeout(() => {
            void router.navigate({ to: "/perfil", replace: true });
          }, 1500);
        })
        .catch(() => setStatus("erro"));
    } else if (params.get("error")) {
      setStatus("erro");
    } else {
      setStatus("erro");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">
        {status === "processando" && (
          <p className="text-sm text-muted-foreground">Processando redefinição de senha...</p>
        )}
        {status === "ok" && (
          <>
            <h1 className="font-display text-xl font-semibold">Senha redefinida</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Defina sua nova senha na página de perfil. Redirecionando...
            </p>
          </>
        )}
        {status === "erro" && (
          <>
            <h1 className="font-display text-xl font-semibold">Link expirado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              O link de redefinição é inválido ou expirou. Solicite um novo.
            </p>
            <button
              onClick={() => void router.navigate({ to: "/login", replace: true })}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Voltar para o login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
