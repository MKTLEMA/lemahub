import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import type { CompraCastanha } from "./types";

// Helpers duplicados de admin.functions.ts (autocontido de propósito:
// não mexer no arquivo testado em produção). Ver docs/LEMBRETES-EMAIL-PLANO.md §6.

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

async function requireEditor(accessToken?: string) {
  if (!accessToken) throw new Error("Não autenticado.");
  const url = getEnv("VITE_SUPABASE_URL");
  const anonKey = getEnv("VITE_SUPABASE_ANON_KEY");
  if (!url || !anonKey) throw new Error("Variáveis de ambiente não configuradas.");
  const headers = { apikey: anonKey, Authorization: `Bearer ${accessToken}` };

  const userRes = await fetch(`${url}/auth/v1/user`, { headers });
  if (!userRes.ok) throw new Error("Sessão inválida.");
  const user = (await userRes.json()) as { id: string; email?: string };

  const perfisRes = await fetch(`${url}/rest/v1/perfis?select=role&id=eq.${user.id}`, {
    headers,
  });
  const perfisData = (await perfisRes.json()) as { role?: string }[];
  const role = perfisData[0]?.role;
  if (role !== "admin" && role !== "editor") {
    throw new Error("Apenas administradores e editores podem enviar lembretes.");
  }
  return user;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const COOLDOWN_MS = 12 * 60 * 60 * 1000;

const esc = (s: string | null | undefined) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const br = (d: string | null | undefined) => (d ? d.split("-").reverse().join("/") : "—");

// Template placeholder — layout definitivo virá na fase de design de e-mails.
function templateLembreteCastanha(pedido: CompraCastanha): string {
  const linhas: [string, string][] = [
    ["Fornecedor", esc(pedido.fornecedor)],
    ["Finalidade", esc(pedido.finalidade)],
    ["Solicitante", esc(pedido.solicitante)],
    ["Prazo de entrega", br(pedido.prazo_entrega)],
    ["Valor", pedido.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })],
    ["Nota fiscal emitida", pedido.nota_fiscal_emitida ? "Sim" : "Não"],
    ["Nota enviada ao financeiro", pedido.nota_enviada_financeiro ? "Sim" : "Não"],
  ];
  const obs = pedido.observacao?.trim()
    ? `<p><strong>Observação:</strong> ${esc(pedido.observacao)}</p>`
    : "";
  return `<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
<h2 style="color: #0a2540;">Lembrete — Pedido de castanhas</h2>
<ul style="padding-left: 18px;">${linhas
    .map(([k, v]) => `<li><strong>${k}:</strong> ${v || "—"}</li>`)
    .join("")}</ul>
${obs}
<p style="color: #5a6b7d; font-size: 13px;">Este é um lembrete do LEMA Demand Hub.</p>
</div>`;
}

export const enviarLembreteCastanha = createServerFn({ method: "POST" })
  .validator(
    (d: {
      accessToken: string;
      pedidoId: string;
      destinatarios: { nome: string; email: string }[];
    }) => d,
  )
  .handler(async ({ data }) => {
    const user = await requireEditor(data.accessToken);

    const emails = [
      ...new Set(
        data.destinatarios.map((x) => x.email.trim().toLowerCase()).filter((e) => e.length > 0),
      ),
    ];
    if (emails.length === 0) throw new Error("Selecione ao menos um destinatário.");
    if (emails.length > 50) throw new Error("Máximo de 50 destinatários por envio.");
    if (emails.some((e) => !EMAIL_RE.test(e))) {
      throw new Error("Há destinatários com e-mail inválido.");
    }

    const admin = getAdminClient();
    const { data: pedido } = await admin
      .from("compras_castanhas")
      .select("*")
      .eq("id", data.pedidoId)
      .maybeSingle();
    if (!pedido) throw new Error("Pedido não encontrado.");
    const pedidoCastanha = pedido as CompraCastanha;

    // Cooldown: mesmo pedido + destinatário em comum nas últimas 12h
    const desde = new Date(Date.now() - COOLDOWN_MS).toISOString();
    const { data: recentes } = await admin
      .from("envios_lembrete")
      .select("destinatarios")
      .eq("tipo", "castanha")
      .eq("referencia_id", data.pedidoId)
      .gte("created_at", desde);
    const bloqueados = new Set<string>();
    (recentes ?? []).forEach((r: { destinatarios: string[] | null }) => {
      (r.destinatarios ?? []).forEach((e) => {
        if (emails.includes(e.toLowerCase())) bloqueados.add(e.toLowerCase());
      });
    });
    if (bloqueados.size > 0) {
      throw new Error(`Lembrete já enviado nas últimas 12h para: ${[...bloqueados].join(", ")}.`);
    }

    const apiKey = getEnv("RESEND_API_KEY");
    if (!apiKey) {
      throw new Error("RESEND_API_KEY não configurada no servidor (wrangler secret).");
    }

    const assunto = `Lembrete — Pedido de castanhas: ${
      pedidoCastanha.fornecedor || "sem fornecedor"
    }`;
    const resend = new Resend(apiKey);
    const { data: enviado, error } = await resend.emails.send({
      // compliance.lemaef.com.br: domínio já verificado na conta Resend (entrega em
      // qualquer destinatário). Quando o time de tecnologia verificar lemaef.com.br
      // (ou subdomínio), trocar aqui e no migration bloco 9.6.
      from: "LEMA Hub <lembretes@compliance.lemaef.com.br>",
      to: emails,
      subject: assunto,
      html: templateLembreteCastanha(pedidoCastanha),
      tags: [{ name: "tipo", value: "castanha" }],
    });
    if (error) throw new Error(`Falha no envio via Resend: ${error.message}`);

    const { error: logErr } = await admin.from("envios_lembrete").insert({
      tipo: "castanha",
      referencia_id: data.pedidoId,
      destinatarios: emails,
      assunto,
      status: "enviado",
      detalhe: enviado?.id ?? null,
      disparado_por: user.email ?? "desconhecido",
    });
    if (logErr) {
      console.error("enviarLembreteCastanha: falha ao registrar log:", logErr.message);
    }

    return { ok: true as const };
  });
