import { supabase } from "./supabase";

/** Verifica se há uma sessão Supabase ativa. Retorna o e-mail ou null. */
export async function getSupabaseSession(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}

/** Login via Supabase Auth (e-mail + senha individual). */
export async function loginSupabase(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Logout (encerra sessão Supabase). */
export async function logoutSupabase(): Promise<void> {
  await supabase.auth.signOut();
}
