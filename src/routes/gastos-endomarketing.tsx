import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ModuleHeader, RowActions } from "@/components/module-page";
import { EntityForm, type FieldSpec, type FormValues } from "@/components/entity-form";
import { HistoricoDialog } from "@/components/historico-dialog";
import { deleteRow, insertRow, updateRow, useDb } from "@/lib/store";
import { exportCsv } from "@/lib/csv";
import type { GastoEndomarketing } from "@/lib/types";

export const Route = createFileRoute("/gastos-endomarketing")({
  head: () => ({
    meta: [
      { title: "Gastos de Endomarketing — Hub LEMA" },
      { name: "description", content: "Acompanhe os gastos de endomarketing por mês e período." },
      { property: "og:title", content: "Gastos de Endomarketing — Hub LEMA" },
      { property: "og:description", content: "Curva de gastos e comparativo mensal do time." },
    ],
  }),
  component: GastosPage,
});

const FIELDS: FieldSpec[] = [
  { name: "nome_evento", label: "Nome do evento", type: "text" },
  { name: "mes", label: "Mês (use o 1º dia)", type: "date" },
  { name: "descritivo", label: "Descritivo", type: "text" },
  { name: "valor", label: "Valor (R$)", type: "number" },
];

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Periodo = "mensal" | "trimestral" | "semestral" | "anual";
const JANELA: Record<Periodo, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };

function chave(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function GastosPage() {
  const db = useDb();
  const hoje = new Date();
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<GastoEndomarketing | null>(null);
  const [historicoId, setHistoricoId] = useState<string | null>(null);
  const [mesRef, setMesRef] = useState(chave(hoje));
  const [periodo, setPeriodo] = useState<Periodo>("mensal");

  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>([chave(hoje)]);
    db.gastos_endomarketing.forEach((g) => g.mes && set.add(g.mes.slice(0, 7)));
    return Array.from(set).sort().reverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.gastos_endomarketing]);

  const janela = useMemo(() => {
    const [y, m] = mesRef.split("-").map(Number);
    const fim = new Date(y!, m! - 1, 1);
    const inicio = new Date(y!, m! - JANELA[periodo], 1);
    return { inicio, fim };
  }, [mesRef, periodo]);

  const rows = useMemo(() => {
    const q = busca.toLowerCase();
    return db.gastos_endomarketing
      .filter((g) => `${g.nome_evento} ${g.descritivo}`.toLowerCase().includes(q))
      .filter((g) => {
        if (!g.mes) return false;
        const [y, m] = g.mes.split("-").map(Number);
        const d = new Date(y!, m! - 1, 1);
        return d > janela.inicio && d <= janela.fim;
      })
      .sort((a, b) => b.mes.localeCompare(a.mes));
  }, [db.gastos_endomarketing, busca, janela]);

  const total = rows.reduce((acc, g) => acc + Number(g.valor || 0), 0);

  const curva = useMemo(() => {
    const base = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() - (11 - i), 1);
      const k = chave(d);
      const valor = db.gastos_endomarketing
        .filter((g) => g.mes?.slice(0, 7) === k)
        .reduce((acc, g) => acc + Number(g.valor || 0), 0);
      return { mes: `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, valor };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.gastos_endomarketing]);

  const anoCorrente = useMemo(() => {
    const ano = hoje.getFullYear();
    return MESES.map((label, i) => ({
      mes: label,
      valor: db.gastos_endomarketing
        .filter((g) => g.mes?.slice(0, 7) === `${ano}-${String(i + 1).padStart(2, "0")}`)
        .reduce((acc, g) => acc + Number(g.valor || 0), 0),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.gastos_endomarketing]);

  return (
    <>
      <ModuleHeader
        titulo="Gastos de Endomarketing"
        descricao="Custos de ações internas, agrupados por mês e período."
        busca={busca}
        onBusca={setBusca}
        onNovo={() => {
          setEditando(null);
          setOpen(true);
        }}
        onExportar={() => exportCsv("gastos-endomarketing", rows)}
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={mesRef} onValueChange={setMesRef}>
              <SelectTrigger className="w-36" aria-label="Mês de referência">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mesesDisponiveis.map((k) => {
                  const [y, m] = k.split("-");
                  return (
                    <SelectItem key={k} value={k}>
                      {MESES[Number(m) - 1]}/{y}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <ToggleGroup
              type="single"
              value={periodo}
              onValueChange={(v) => v && setPeriodo(v as Periodo)}
              variant="outline"
            >
              <ToggleGroupItem value="mensal">Mensal</ToggleGroupItem>
              <ToggleGroupItem value="trimestral">Trimestral</ToggleGroupItem>
              <ToggleGroupItem value="semestral">Semestral</ToggleGroupItem>
              <ToggleGroupItem value="anual">Anual</ToggleGroupItem>
            </ToggleGroup>
          </div>
        }
      />

      <div className="animate-rise mb-6 rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Total no período</p>
        <p className="font-display text-3xl font-bold tabular-nums">{brl(total)}</p>
        <p className="text-xs text-muted-foreground">
          {rows.length} lançamento(s) · janela {periodo}
        </p>
      </div>

      <div className="animate-rise mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-display text-sm font-semibold">Curva dos últimos 12 meses</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curva}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={70} />
                <Tooltip formatter={(v: number) => brl(Number(v))} />
                <Line type="monotone" dataKey="valor" stroke="var(--accent)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-display text-sm font-semibold">
            Comparativo mês a mês ({hoje.getFullYear()})
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={anoCorrente}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={70} />
                <Tooltip formatter={(v: number) => brl(Number(v))} />
                <Bar dataKey="valor" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="animate-rise overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead className="tabular-nums">Mês</TableHead>
              <TableHead>Descritivo</TableHead>
              <TableHead className="tabular-nums">Valor</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((g) => (
              <TableRow key={g.id} className="animate-rise">
                <TableCell className="font-medium">{g.nome_evento}</TableCell>
                <TableCell className="tabular-nums">
                  {g.mes ? `${MESES[Number(g.mes.slice(5, 7)) - 1]}/${g.mes.slice(0, 4)}` : "—"}
                </TableCell>
                <TableCell className="max-w-60 truncate">{g.descritivo || "—"}</TableCell>
                <TableCell className="tabular-nums">{brl(Number(g.valor || 0))}</TableCell>
                <TableCell>
                  <RowActions
                    onEditar={() => {
                      setEditando(g);
                      setOpen(true);
                    }}
                    onHistorico={() => setHistoricoId(g.id)}
                    onExcluir={() => {
                      deleteRow("gastos_endomarketing", g.id);
                      toast.success("Gasto excluído.");
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Nenhum gasto no período selecionado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <EntityForm
        open={open}
        onOpenChange={setOpen}
        title={editando ? "Editar gasto" : "Novo gasto de endomarketing"}
        description="O nome do evento é livre e não depende do módulo de Eventos."
        fields={FIELDS}
        initial={editando ? (editando as unknown as FormValues) : undefined}
        onSubmit={(values) => {
          const mes = String(values["mes"] ?? "");
          const normalizado = { ...values, mes: mes ? `${mes.slice(0, 7)}-01` : "" };
          if (editando) {
            updateRow(
              "gastos_endomarketing",
              editando.id,
              normalizado as Partial<GastoEndomarketing>,
            );
            toast.success("Gasto atualizado.");
          } else {
            insertRow("gastos_endomarketing", normalizado as never);
            toast.success("Gasto registrado.");
          }
        }}
      />

      <HistoricoDialog registroId={historicoId} onOpenChange={() => setHistoricoId(null)} />
    </>
  );
}
