/**
 * AUTENTICAÇÃO MOCK — CLIENT-SIDE.
 *
 * ATENÇÃO: isto NÃO é segurança real. Contas, hashes e sessão vivem no
 * localStorage do navegador e podem ser lidos/alterados por qualquer pessoa
 * com acesso ao dispositivo. Serve apenas para separar perfis dentro do hub
 * enquanto não há infraestrutura de backend.
 *
 * Próximo passo quando houver infra: migrar para Supabase Auth (e-mail/senha),
 * com RLS por usuário e o painel /admin consumindo a tabela de perfis.
 */

const CONTAS_KEY = "lema-hub-contas";
const SESSION_KEY = "lema-hub-session";

export type Role = "admin" | "editor" | "leitor";

export type Conta = {
  email: string;
  nome: string;
  senhaHash: string;
  role: Role;
};

const SEED_EMAILS = [
  "andrefelipe@lemaef.com.br",
  "igor@lemaef.com.br",
  "jefferson@lemaef.com.br",
];

const SENHA_PADRAO = "lema123";

const listeners = new Set<() => void>();

export function subscribeAuth(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  listeners.forEach((l) => l());
}

function b64(input: string) {
  if (typeof btoa === "function") return btoa(unescape(encodeURIComponent(input)));
  return input;
}

/** Hash SHA-256 (SubtleCrypto). Sem SubtleCrypto, cai para base64 — mock. */
export async function hashSenha(senha: string): Promise<string> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (subtle) {
      const buf = await subtle.digest("SHA-256", new TextEncoder().encode(senha));
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch {
    /* fallback abaixo */
  }
  return `b64:${b64(senha)}`;
}

function ler(): Conta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CONTAS_KEY);
    if (raw) return JSON.parse(raw) as Conta[];
  } catch {
    /* noop */
  }
  return [];
}

function gravar(contas: Conta[]) {
  localStorage.setItem(CONTAS_KEY, JSON.stringify(contas));
  emit();
}

let seeding = false;

/** Cria as 3 contas padrão na primeira execução. */
export async function garantirSeed() {
  if (typeof window === "undefined" || seeding) return;
  if (ler().length > 0) return;
  seeding = true;
  const senhaHash = await hashSenha(SENHA_PADRAO);
  gravar(
    SEED_EMAILS.map((email) => ({
      email,
      nome: (email.split("@")[0] ?? email).replace(/^./, (c) => c.toUpperCase()),
      senhaHash,
      role: "admin" as Role,
    })),
  );
  seeding = false;
}

export function listarContas(): Conta[] {
  return ler();
}

/** Alias mantido pelo nome pedido no briefing. */
export const loginContas = listarContas;

export function buscarConta(email: string): Conta | undefined {
  const alvo = email.trim().toLowerCase();
  return ler().find((c) => c.email.toLowerCase() === alvo);
}

export function senhaAleatoria(tamanho = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(tamanho);
  globalThis.crypto?.getRandomValues?.(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

/** Cria conta e devolve a senha gerada (mostrada uma única vez). */
export async function criarConta(input: { email: string; nome: string; role: Role }) {
  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false as const, erro: "E-mail obrigatório." };
  if (buscarConta(email)) return { ok: false as const, erro: "E-mail já cadastrado." };
  const senha = senhaAleatoria();
  const conta: Conta = {
    email,
    nome: input.nome.trim() || email,
    role: input.role,
    senhaHash: await hashSenha(senha),
  };
  gravar([...ler(), conta]);
  return { ok: true as const, senha };
}

export function atualizarConta(email: string, values: Partial<Pick<Conta, "nome" | "role">>) {
  const alvo = email.toLowerCase();
  gravar(ler().map((c) => (c.email.toLowerCase() === alvo ? { ...c, ...values } : c)));
}

export function excluirConta(email: string) {
  const alvo = email.toLowerCase();
  gravar(ler().filter((c) => c.email.toLowerCase() !== alvo));
  if (currentEmail()?.toLowerCase() === alvo) logout();
}

/** Reseta a senha e devolve a nova (mostrada uma única vez). */
export async function resetarSenha(email: string) {
  const senha = senhaAleatoria();
  const hash = await hashSenha(senha);
  const alvo = email.toLowerCase();
  gravar(ler().map((c) => (c.email.toLowerCase() === alvo ? { ...c, senhaHash: hash } : c)));
  return senha;
}

export async function alterarSenhaPropria(email: string, atual: string, nova: string) {
  const conta = buscarConta(email);
  if (!conta) return { ok: false as const, erro: "Conta não encontrada." };
  if (conta.senhaHash !== (await hashSenha(atual)))
    return { ok: false as const, erro: "Senha atual incorreta." };
  if (nova.length < 6) return { ok: false as const, erro: "A nova senha precisa de 6+ caracteres." };
  const hash = await hashSenha(nova);
  gravar(
    ler().map((c) => (c.email.toLowerCase() === email.toLowerCase() ? { ...c, senhaHash: hash } : c)),
  );
  return { ok: true as const };
}

export async function login(email: string, senha: string) {
  await garantirSeed();
  const conta = buscarConta(email);
  if (!conta) return { ok: false as const };
  if (conta.senhaHash !== (await hashSenha(senha))) return { ok: false as const };
  localStorage.setItem(SESSION_KEY, conta.email);
  emit();
  return { ok: true as const, conta };
}

export function logout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
  emit();
}

export function currentEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

export function currentConta(): Conta | null {
  const email = currentEmail();
  return email ? (buscarConta(email) ?? null) : null;
}

export function currentNome(): string {
  return currentConta()?.nome ?? "Equipe LEMA";
}
