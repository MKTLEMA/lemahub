import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function getEnv(name: string): string | undefined {
  const viteVal = import.meta.env[name] as string | undefined;
  if (viteVal) return viteVal;
  if (typeof globalThis !== "undefined") {
    const env = (globalThis as Record<string, unknown>)["__env__"] as
      Record<string, string> | undefined;
    if (env?.[name]) return env[name];
  }
  return undefined;
}

function getAdminClient() {
  const url = getEnv("VITE_SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error("VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados.");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdmin(accessToken?: string) {
  if (!accessToken) throw new Error("Não autenticado.");
  const url = getEnv("VITE_SUPABASE_URL");
  const anonKey = getEnv("VITE_SUPABASE_ANON_KEY");
  if (!url || !anonKey) throw new Error("Variáveis de ambiente não configuradas.");
  const headers = { apikey: anonKey, Authorization: `Bearer ${accessToken}` };

  const userRes = await fetch(`${url}/auth/v1/user`, { headers });
  if (!userRes.ok) throw new Error("Sessão inválida.");
  const user = await userRes.json();

  const perfisRes = await fetch(`${url}/rest/v1/perfis?select=role&id=eq.${user.id}`, {
    headers,
  });
  const perfisData = await perfisRes.json();
  if (perfisData[0]?.role !== "admin") throw new Error("Acesso restrito a administradores.");
  return user;
}

export const listUsers = createServerFn({ method: "POST" })
  .validator((d: { accessToken: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.accessToken);
    const admin = getAdminClient();
    const { data: result, error } = await admin.auth.admin.listUsers();
    if (error) throw new Error(error.message);
    return (result?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
    }));
  });

export const createUser = createServerFn({ method: "POST" })
  .validator(
    (d: { accessToken: string; email: string; password: string; nome: string; role: string }) => d,
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.accessToken);
    const admin = getAdminClient();
    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    const userId = created.user.id;
    const { error: perfilErr } = await admin
      .from("perfis")
      .upsert({ id: userId, email: data.email, nome: data.nome, role: data.role });
    if (perfilErr) throw new Error(perfilErr.message);
    return { id: userId, email: created.user.email ?? "" };
  });

export const resetPassword = createServerFn({ method: "POST" })
  .validator((d: { accessToken: string; userId: string; password: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.accessToken);
    const admin = getAdminClient();
    const { error } = await admin.auth.admin.updateUserById(data.userId, {
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .validator((d: { accessToken: string; userId: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.accessToken);
    const admin = getAdminClient();
    await admin.from("perfis").delete().eq("id", data.userId);
    const { error } = await admin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
