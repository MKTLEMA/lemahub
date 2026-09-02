import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import type { CompraCastanha } from "./types";

// Helpers duplicados de admin.functions.ts (autocontido de propósito:
// não mexer no arquivo testado em produção). Ver docs/LEMBRETES-EMAIL-PLANO.md.

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

const ASSINATURA_URL =
  "https://mktlema-lemahub.holy-bush-967a.workers.dev/assinatura-marketing.png";

const esc = (s: string | null | undefined) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function templateLembreteCastanha(pedido: CompraCastanha): string {
  const linhaPedido = pedido.finalidade?.trim()
    ? `<p style="margin:0 0 24px;"><strong>Pedido:</strong> ${esc(pedido.finalidade)}</p>`
    : "";
  return [
    `<div style="background-color:#eef0f4;padding:24px 12px;">`,
    `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;">`,
    `<tr><td style="padding:32px 40px;font-family:Arial,Helvetica,sans-serif;color:#251b47;font-size:14px;line-height:22px;">`,
    `Prezado(a),<br><br>`,
    `Esta é uma mensagem automática.<br><br>`,
    `Seu pedido de castanha já está adesivado e pronto para retirada.<br><br>`,
    linhaPedido,
    `Atenciosamente,<br><br>`,
    `<img src="${ASSINATURA_URL}" width="400" alt="Assinatura — Marketing LEMA" style="display:block;width:100%;max-width:400px;height:auto;border:0;" />`,
    `</td></tr></table></div>`,
  ].join("");
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

    const assunto = "[INTERNO] Seu pedido de castanhas está pronto para retirada";
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
