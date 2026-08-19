/**
 * AUTENTICACAO — Supabase Auth.
 *
 * Sessao gerenciada pelo Supabase SDK (cookies + refresh token).
 * Perfis/papeis ficam na tabela `perfis` vinculada a auth.users.
 */

import { supabase } from "./supabase";

export type Role = "admin" | "editor" | "leitor";

export type Conta = {
  id: string;
  email: string;
  nome: string;
  role: Role;
};

const listeners = new Set<() => void>();

let cachedConta: Conta | null = null;
let contaFetched = false;

export function subscribeAuth(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  listeners.forEach((l) => l());
}

supabase.auth.onAuthStateChange(() => {
  cachedConta = null;
  contaFetched = false;
  emit();
});

export async function currentEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}

export async function currentConta(): Promise<Conta | null> {
  if (contaFetched) return cachedConta;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    contaFetched = true;
    cachedConta = null;
    return null;
  }
  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome, role")
    .eq("id", user.id)
    .maybeSingle();
  contaFetched = true;
  cachedConta = {
    id: user.id,
    email: user.email ?? "",
    nome: perfil?.nome ?? user.email?.split("@")[0] ?? "",
    role: (perfil?.role as Role) ?? "editor",
  };
  return cachedConta;
}

export async function currentNome(): Promise<string> {
  const conta = await currentConta();
  return conta?.nome ?? "Equipe LEMA";
}

export async function login(
  email: string,
  senha: string,
): Promise<{ ok: boolean; erro?: string; conta?: Conta }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error) return { ok: false, erro: error.message };
  const user = data.user;
  let { data: perfil } = await supabase
    .from("perfis")
    .select("nome, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil) {
    await supabase.from("perfis").insert({
      id: user.id,
      email: user.email ?? email,
      nome: email.split("@")[0],
      role: "editor",
    });
    perfil = { nome: email.split("@")[0], role: "editor" };
  }
  const conta: Conta = {
    id: user.id,
    email: user.email ?? email,
    nome: perfil.nome,
    role: perfil.role as Role,
  };
  cachedConta = conta;
  contaFetched = true;
  return { ok: true, conta };
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
  cachedConta = null;
  contaFetched = false;
  emit();
}

export async function alterarSenhaPropria(
  email: string,
  atual: string,
  nova: string,
): Promise<{ ok: boolean; erro?: string }> {
  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) return { ok: false, erro: error.message };
  return { ok: true };
}
