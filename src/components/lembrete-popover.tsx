import { useEffect, useMemo, useState } from "react";
import { Mail, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { deleteRow, insertRow, useDb } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { enviarLembreteCastanha } from "@/lib/lembretes.functions";
import type { CompraCastanha } from "@/lib/types";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function buscarUltimoEnvio(pedidoId: string): Promise<string | null> {
  const { data } = await supabase
    .from("envios_lembrete")
    .select("created_at")
    .eq("tipo", "castanha")
    .eq("referencia_id", pedidoId)
    .order("created_at", { ascending: false })
    .limit(1);
  return (data as { created_at?: string }[] | null)?.[0]?.created_at ?? null;
}

export function LembretePopover({ pedido }: { pedido: CompraCastanha }) {
  const db = useDb();
  const [aberto, setAberto] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [formAberto, setFormAberto] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [ultimoEnvio, setUltimoEnvio] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setSelecionados([]);
    setFormAberto(false);
    setNovoNome("");
    setNovoEmail("");
    void buscarUltimoEnvio(pedido.id).then(setUltimoEnvio);
  }, [aberto, pedido.id]);

  const destinatarios = useMemo(
    () => [...db.destinatarios_lembrete].sort((a, b) => a.nome.localeCompare(b.nome)),
    [db.destinatarios_lembrete],
  );

  const toggle = (email: string) =>
    setSelecionados((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email],
    );

  async function salvarDestinatario() {
    const nome = novoNome.trim();
    const email = novoEmail.trim().toLowerCase();
    if (!nome) {
      toast.error("Informe o nome.");
      return;
    }
    if (!EMAIL_RE.test(email)) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    setSalvando(true);
    const r = await insertRow("destinatarios_lembrete", { nome, email });
    setSalvando(false);
    if (r.ok) {
      toast.success("Destinatário cadastrado.");
      setNovoNome("");
      setNovoEmail("");
      setFormAberto(false);
    } else if (r.erro.toLowerCase().includes("duplicate")) {
      toast.error("E-mail já cadastrado.");
    } else {
      toast.error(r.erro);
    }
  }

  async function removerDestinatario(id: string, email: string) {
    const r = await deleteRow("destinatarios_lembrete", id);
    if (r.ok) {
      toast.success("Destinatário removido.");
      setSelecionados((prev) => prev.filter((e) => e !== email));
    } else {
      toast.error(r.erro);
    }
  }

  async function enviar() {
    setEnviando(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Não autenticado.");
      const payload = selecionados.map((email) => ({
        nome: destinatarios.find((d) => d.email === email)?.nome ?? email,
        email,
      }));
      await enviarLembreteCastanha({
        data: { accessToken, pedidoId: pedido.id, destinatarios: payload },
      });
      toast.success(`Lembrete enviado para ${selecionados.length} destinatário(s).`);
      setSelecionados([]);
      setUltimoEnvio(await buscarUltimoEnvio(pedido.id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar lembrete.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="whitespace-nowrap">
          <Mail className="size-4" />
          Enviar lembrete
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-medium">Enviar lembrete</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            title="Cadastrar destinatário"
            onClick={() => setFormAberto((f) => !f)}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        {formAberto && (
          <div className="space-y-2 border-b border-border p-3">
            <Input
              placeholder="Nome"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
            />
            <Input
              type="email"
              placeholder="E-mail"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void salvarDestinatario();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={salvando}
              onClick={() => void salvarDestinatario()}
            >
              {salvando ? "Salvando..." : "Salvar destinatário"}
            </Button>
          </div>
        )}

        <Command>
          <CommandInput placeholder="Buscar destinatário..." />
          <CommandList>
            <CommandEmpty>
              {destinatarios.length === 0
                ? "Nenhum destinatário cadastrado. Use o + para adicionar."
                : "Nenhum resultado."}
            </CommandEmpty>
            <CommandGroup>
              {destinatarios.map((d) => (
                <CommandItem
                  key={d.id}
                  value={`${d.nome} ${d.email}`}
                  onSelect={() => toggle(d.email)}
                  className="gap-2"
                >
                  <Checkbox
                    checked={selecionados.includes(d.email)}
                    onCheckedChange={() => toggle(d.email)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{d.nome}</span>
                    <span className="truncate text-xs text-muted-foreground">{d.email}</span>
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    title="Remover destinatário"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      void removerDestinatario(d.id, d.email);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>

        <div className="border-t border-border p-3">
          {ultimoEnvio && (
            <p className="mb-2 text-xs text-muted-foreground">
              Último lembrete:{" "}
              {new Date(ultimoEnvio).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          )}
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={selecionados.length === 0 || enviando}
            onClick={() => void enviar()}
          >
            <Mail className="size-4" />
            {enviando ? "Enviando..." : `Enviar (${selecionados.length})`}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
