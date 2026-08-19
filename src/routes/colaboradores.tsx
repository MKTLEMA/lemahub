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
import { EntityForm, iniciais, type FieldSpec, type FormValues } from "@/components/entity-form";
import { HistoricoDialog } from "@/components/historico-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarBoard } from "@/components/calendar-board";
import { ColaboradorCard } from "@/components/colaborador-card";
import { ProximityDot } from "@/components/proximity-dot";
import { deleteRow, insertRow, updateRow, useDb } from "@/lib/store";
import { diasAteAniversario } from "@/lib/alerts";
import { exportCsv } from "@/lib/csv";
import { ColorTag } from "@/components/color-tag";
import {
  SortControls,
  applySort,
  type SortConfig,
  type SortOption,
} from "@/components/sort-controls";
import type { Colaborador } from "@/lib/types";

export const Route = createFileRoute("/colaboradores")({
  head: () => ({
    meta: [
      { title: "Colaboradores — Hub LEMA" },
      {
        name: "description",
        content: "Cadastro de colaboradores com aniversários e dados de farda.",
      },
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
  const [mesAdm, setMesAdm] = useState("Todos");
  const [fEmpresa, setFEmpresa] = useState("Todas");
  const [fGenero, setFGenero] = useState("Todos");
  const [fSetor, setFSetor] = useState("Todos");
  const [fModal, setFModal] = useState("Todas");
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Colaborador | null>(null);
  const [historicoId, setHistoricoId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<Colaborador | null>(null);
  const [cursor, setCursor] = useState(() => {
    const h = new Date();
    return new Date(h.getFullYear(), h.getMonth(), 1);
  });

  const empresas = useMemo(
    () => [...new Set(db.colaboradores.map((c) => c.empresa_grupo).filter(Boolean))].sort(),
    [db.colaboradores],
  );
  const generos = useMemo(
    () => [...new Set(db.colaboradores.map((c) => c.genero).filter(Boolean))].sort(),
    [db.colaboradores],
  );
  const setores = useMemo(
    () => [...new Set(db.colaboradores.map((c) => c.setor).filter(Boolean))].sort(),
    [db.colaboradores],
  );
  const modais = useMemo(
    () => [...new Set(db.colaboradores.map((c) => c.formato_trabalho).filter(Boolean))].sort(),
    [db.colaboradores],
  );

  const SORT_OPTS: SortOption[] = [
    { value: "nome", label: "Nome", type: "text" },
    { value: "empresa_grupo", label: "Empresa", type: "text" },
    { value: "setor", label: "Setor", type: "text" },
    { value: "data_aniversario", label: "Aniversário", type: "date" },
    { value: "data_ingresso", label: "Admissão", type: "date" },
  ];
  const [sort, setSort] = useState<SortConfig | null>(null);

  const rows = useMemo(() => {
    const q = busca.toLowerCase();
    const filtered = db.colaboradores
      .filter((c) => `${c.nome} ${c.setor} ${c.email} ${c.empresa_grupo}`.toLowerCase().includes(q))
      .filter(
        (c) =>
          mes === "Todos" || Number(c.data_aniversario?.slice(5, 7)) === MESES.indexOf(mes) + 1,
      )
      .filter(
        (c) =>
          mesAdm === "Todos" || Number(c.data_ingresso?.slice(5, 7)) === MESES.indexOf(mesAdm) + 1,
      )
      .filter((c) => fEmpresa === "Todas" || c.empresa_grupo === fEmpresa)
      .filter((c) => fGenero === "Todos" || c.genero === fGenero)
      .filter((c) => fSetor === "Todos" || c.setor === fSetor)
      .filter((c) => fModal === "Todas" || c.formato_trabalho === fModal);
    return applySort(
      filtered,
      sort,
      SORT_OPTS,
      (c, f) => (c as unknown as Record<string, string | number | null>)[f],
    );
  }, [db.colaboradores, busca, mes, mesAdm, fEmpresa, fGenero, fSetor, fModal, sort]);

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
              formato_trabalho:
                (linha["formato_trabalho"] as Colaborador["formato_trabalho"]) || "hibrido",
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
          <div className="flex flex-wrap gap-2">
            <SortControls options={SORT_OPTS} value={sort} onChange={setSort} />
            <Select value={fEmpresa} onValueChange={setFEmpresa}>
              <SelectTrigger className="w-32" aria-label="Empresa">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Empresas</SelectItem>
                {empresas.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fSetor} onValueChange={setFSetor}>
              <SelectTrigger className="w-32" aria-label="Setor">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Setores</SelectItem>
                {setores.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fModal} onValueChange={setFModal}>
              <SelectTrigger className="w-32" aria-label="Modalidade">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Modalidade</SelectItem>
                {modais.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fGenero} onValueChange={setFGenero}>
              <SelectTrigger className="w-32" aria-label="Gênero">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Gênero</SelectItem>
                {generos.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="w-36" aria-label="Mês de aniversário">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Aniversário</SelectItem>
                {MESES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={mesAdm} onValueChange={setMesAdm}>
              <SelectTrigger className="w-36" aria-label="Mês de admissão">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Admissão</SelectItem>
                {MESES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                  <TableHead>Empresa</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Gênero</TableHead>
                  <TableHead className="tabular-nums">Aniversário</TableHead>
                  <TableHead className="tabular-nums">Admissão</TableHead>
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
                      <TableCell>
                        <ColorTag value={c.empresa_grupo} />
                      </TableCell>
                      <TableCell>
                        <ColorTag value={c.setor} />
                      </TableCell>
                      <TableCell>
                        <ColorTag value={c.formato_trabalho} />
                      </TableCell>
                      <TableCell>
                        <ColorTag value={c.genero} />
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {c.data_aniversario?.split("-").reverse().join("/") || "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {c.data_ingresso?.split("-").reverse().join("/") || "—"}
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
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
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
