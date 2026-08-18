import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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
import { ModuleHeader, RowActions } from "@/components/module-page";
import {
  EntityForm,
  iniciais,
  type FieldSpec,
  type FormValues,
} from "@/components/entity-form";
import { HistoricoDialog } from "@/components/historico-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarBoard } from "@/components/calendar-board";
import { ColaboradorCard } from "@/components/colaborador-card";
import { ProximityDot } from "@/components/proximity-dot";
import { deleteRow, insertRow, updateRow, useDb } from "@/lib/store";
import { diasAteAniversario } from "@/lib/alerts";
import { exportCsv } from "@/lib/csv";
import type { Colaborador } from "@/lib/types";

export const Route = createFileRoute("/colaboradores")({
  head: () => ({
    meta: [
      { title: "Colaboradores — Hub LEMA" },
      { name: "description", content: "Cadastro de colaboradores com aniversários e dados de farda." },
      { property: "og:title", content: "Colaboradores — Hub LEMA" },
      { property: "og:description", content: "Cadastro de colaboradores do grupo LEMA." },
    ],
  }),
  component: ColaboradoresPage,
});

const FIELDS: FieldSpec[] = [
  { name: "nome", label: "Nome", type: "text" },
  // Nota: com o Supabase Storage ativo, trocar o base64 por upload no bucket
  // `fotos-colaboradores` e guardar a URL assinada em foto_url.
  { name: "foto_url", label: "Foto", type: "image" },
  { name: "email", label: "E-mail", type: "email" },
  { name: "setor", label: "Setor", type: "text" },
  { name: "empresa_grupo", label: "Empresa do grupo", type: "text" },
  { name: "data_ingresso", label: "Data de ingresso", type: "date" },
  { name: "data_aniversario", label: "Data de aniversário", type: "date" },
  {
    name: "formato_trabalho",
    label: "Formato de trabalho",
    type: "select",
    options: ["hibrido", "presencial", "remoto"],
  },
  { name: "genero", label: "Gênero", type: "text" },
  { name: "tamanho_farda", label: "Tamanho de camisa", type: "text" },
  { name: "tipo_contratacao", label: "Opção de contratação", type: "text" },
  { name: "curso_formacao", label: "Curso de formação", type: "text" },
  { name: "tem_filhos", label: "Tem filho(a)", type: "boolean" },
  { name: "detalhes_filhos", label: "Detalhes dos filhos (qtd/idade)", type: "text" },
  { name: "endereco", label: "Endereço completo", type: "text" },
  { name: "contato_emergencia_parentesco", label: "Contato de emergência (quem)", type: "text" },
  { name: "contato_emergencia_nome", label: "Nome do contato de emergência", type: "text" },
  { name: "contato_emergencia_telefone", label: "Telefone do contato de emergência", type: "text" },
  { name: "restricao_alimentar", label: "Restrição alimentar", type: "text" },
  { name: "hobby", label: "Hobby", type: "text" },
];


const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function ColaboradoresPage() {
  const db = useDb();
  const [busca, setBusca] = useState("");
  const [mes, setMes] = useState("Todos");
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Colaborador | null>(null);
  const [historicoId, setHistoricoId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<Colaborador | null>(null);
  const [cursor, setCursor] = useState(() => {
    const h = new Date();
    return new Date(h.getFullYear(), h.getMonth(), 1);
  });

  const rows = useMemo(() => {
    const q = busca.toLowerCase();
    return db.colaboradores
      .filter((c) =>
        `${c.nome} ${c.setor} ${c.email} ${c.empresa_grupo}`.toLowerCase().includes(q),
      )
      .filter((c) => {
        if (mes === "Todos") return true;
        const idx = MESES.indexOf(mes) + 1;
        return Number(c.data_aniversario?.slice(5, 7)) === idx;
      });
  }, [db.colaboradores, busca, mes]);

  return (
    <>
      <ModuleHeader
        titulo="Colaboradores"
        descricao="Time do grupo LEMA, com alerta de aniversários próximos."
        busca={busca}
        onBusca={setBusca}
        onNovo={() => {
          setEditando(null);
          setOpen(true);
        }}
        onExportar={() => exportCsv("colaboradores", rows)}
        templateHeaders={FIELDS.map((f) => f.name)}
        onImportar={(linhas) => {
          let total = 0;
          linhas.forEach((linha) => {
            if (!linha["nome"]) return;
            insertRow("colaboradores", {
              nome: linha["nome"] ?? "",
              foto_url: linha["foto_url"] ?? "",
              email: linha["email"] ?? "",
              setor: linha["setor"] ?? "",
              empresa_grupo: linha["empresa_grupo"] ?? "",
              data_ingresso: linha["data_ingresso"] ?? "",
              data_aniversario: linha["data_aniversario"] ?? "",
              formato_trabalho: (linha["formato_trabalho"] as Colaborador["formato_trabalho"]) ||
                "hibrido",
              genero: linha["genero"] ?? "",
              tamanho_farda: linha["tamanho_farda"] ?? "",
              tem_filhos: /^(true|sim|1)$/i.test(linha["tem_filhos"] ?? ""),
              tipo_contratacao: linha["tipo_contratacao"] ?? "",
              curso_formacao: linha["curso_formacao"] ?? "",
              detalhes_filhos: linha["detalhes_filhos"] ?? "",
              endereco: linha["endereco"] ?? "",
              contato_emergencia_parentesco: linha["contato_emergencia_parentesco"] ?? "",
              contato_emergencia_nome: linha["contato_emergencia_nome"] ?? "",
              contato_emergencia_telefone: linha["contato_emergencia_telefone"] ?? "",
              restricao_alimentar: linha["restricao_alimentar"] ?? "",
              hobby: linha["hobby"] ?? "",
            });

            total += 1;
          });
          toast.success(`${total} colaborador(es) importado(s).`);
        }}
        extra={
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-40" aria-label="Filtrar por mês de aniversário">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os meses</SelectItem>
              {MESES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Tabs defaultValue="lista" className="animate-rise">
        <TabsList className="mb-4">
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
        </TabsList>

        <TabsContent value="calendario">
          <CalendarBoard
            modo="aniversarios"
            cursor={cursor}
            onCursor={setCursor}
            aniversariantes={rows}
            onPickAniversariante={(id) =>
              setDetalhe(db.colaboradores.find((c) => c.id === id) ?? null)
            }
          />
        </TabsContent>

        <TabsContent value="lista">
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Contratação</TableHead>
              <TableHead className="tabular-nums">Aniversário</TableHead>
              <TableHead>Camisa</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((c) => {
              const dias = diasAteAniversario(c.data_aniversario);
              const sev = dias !== null && dias <= 3 ? "alerta" : "ok";
              return (
                <TableRow
                  key={c.id}
                  className="animate-rise cursor-pointer transition-colors hover:bg-accent/10"
                  onClick={() => setDetalhe(c)}
                >
                  <TableCell className="font-medium">
                    <span className="flex cursor-pointer items-center gap-3 transition-colors hover:text-accent hover:underline">
                      {c.foto_url ? (
                        <img
                          src={c.foto_url}
                          alt={`Foto de ${c.nome}`}
                          className="size-9 rounded-full border border-border object-cover"
                        />
                      ) : (
                        <span className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                          {iniciais(c.nome)}
                        </span>
                      )}
                      <ProximityDot severidade={sev} label={c.nome} />
                    </span>
                  </TableCell>
                  <TableCell>{c.setor}</TableCell>
                  <TableCell className="capitalize">{c.formato_trabalho}</TableCell>
                  <TableCell className="tabular-nums">
                    {c.data_aniversario.split("-").reverse().join("/")}
                  </TableCell>
                  <TableCell>{c.tamanho_farda || "—"}</TableCell>

                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <RowActions
                      onEditar={() => {
                        setEditando(c);
                        setOpen(true);
                      }}
                      onHistorico={() => setHistoricoId(c.id)}
                      onExcluir={() => {
                        deleteRow("colaboradores", c.id);
                        toast.success("Colaborador excluído.");
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhum colaborador encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
        </TabsContent>
      </Tabs>

      <EntityForm
        open={open}
        onOpenChange={setOpen}
        title={editando ? "Editar colaborador" : "Novo colaborador"}
        description="Dados cadastrais e informações de apoio ao marketing."
        fields={FIELDS}
        initial={editando ? (editando as unknown as FormValues) : undefined}
        onSubmit={(values) => {
          if (editando) {
            updateRow("colaboradores", editando.id, values as Partial<Colaborador>);
            toast.success("Colaborador atualizado.");
          } else {
            insertRow("colaboradores", values as never);
            toast.success("Colaborador cadastrado.");
          }
        }}
      />

      <ColaboradorCard colaborador={detalhe} onOpenChange={() => setDetalhe(null)} />

      <HistoricoDialog registroId={historicoId} onOpenChange={() => setHistoricoId(null)} />
    </>
  );
}
