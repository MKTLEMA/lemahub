import { getThresholds, type EstoqueModulo } from "./thresholds";
import type { DBShape, TabelaNome } from "./types";

export type Severidade = "ok" | "alerta" | "pendente";

export type AlertaItem = {
  id: string;
  tabela: TabelaNome;
  registro_id: string;
  titulo: string;
  descricao: string;
  severidade: Severidade;
  ordem: number;
};

const DIA = 86_400_000;

function hojeLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Dias até a data (aaaa-mm-dd). Negativo = atrasado. */
export function diasAte(data: string): number | null {
  if (!data) return null;
  const [y, m, d] = data.split("-").map(Number);
  if (!y || !m || !d) return null;
  const alvo = new Date(y, m - 1, d);
  alvo.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hojeLocal().getTime()) / DIA);
}

/** Dias até o próximo aniversário, ignorando o ano. */
export function diasAteAniversario(data: string): number | null {
  if (!data) return null;
  const [, m, d] = data.split("-").map(Number);
  if (!m || !d) return null;
  const hoje = hojeLocal();
  let alvo = new Date(hoje.getFullYear(), m - 1, d);
  if (alvo.getTime() < hoje.getTime()) alvo = new Date(hoje.getFullYear() + 1, m - 1, d);
  return Math.round((alvo.getTime() - hoje.getTime()) / DIA);
}

export function severidadePorDias(dias: number | null): Severidade {
  if (dias === null) return "ok";
  if (dias < 0) return "pendente";
  if (dias <= 3) return "alerta";
  return "ok";
}

function textoDias(dias: number) {
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias < 0) return `atrasado há ${Math.abs(dias)} dia(s)`;
  return `em ${dias} dias`;
}

export function calcularAlertas(db: DBShape): AlertaItem[] {
  const itens: AlertaItem[] = [];

  db.colaboradores.forEach((c) => {
    const dias = diasAteAniversario(c.data_aniversario);
    if (dias !== null && dias <= 3) {
      itens.push({
        id: `aniv-${c.id}`,
        tabela: "colaboradores",
        registro_id: c.id,
        titulo: `Aniversário de ${c.nome}`,
        descricao: `${c.setor} · ${textoDias(dias)}`,
        severidade: "alerta",
        ordem: dias,
      });
    }
  });

  db.compras_castanhas.forEach((k) => {
    const dias = diasAte(k.prazo_entrega);
    if (dias !== null && dias <= 3) {
      itens.push({
        id: `prazo-${k.id}`,
        tabela: "compras_castanhas",
        registro_id: k.id,
        titulo: `Entrega de ${k.fornecedor}`,
        descricao: `${k.finalidade} · ${textoDias(dias)}`,
        severidade: severidadePorDias(dias),
        ordem: dias,
      });
    }
  });

  // Pendências de nota: um alerta por GRUPO (mesmo número de NF ou vinculação
  // explícita), evitando duplicar o mesmo pedido em vários itens.
  const grupoDe = (k: DBShape["compras_castanhas"][number]) =>
    k.numero_nf?.trim() ? `nf:${k.numero_nf.trim()}` : `id:${k.vinculado_a ?? k.id}`;

  const grupos = new Map<string, DBShape["compras_castanhas"]>();
  db.compras_castanhas.forEach((k) => {
    const chave = grupoDe(k);
    grupos.set(chave, [...(grupos.get(chave) ?? []), k]);
  });

  grupos.forEach((itensGrupo, chave) => {
    const primeiro = itensGrupo[0]!;
    const rotulo =
      itensGrupo.length > 1
        ? `${primeiro.fornecedor} · ${itensGrupo.length} pedidos vinculados`
        : `${primeiro.fornecedor} · ${primeiro.finalidade}`;
    if (itensGrupo.some((k) => !k.nota_fiscal_emitida)) {
      itens.push({
        id: `nf-${chave}`,
        tabela: "compras_castanhas",
        registro_id: primeiro.id,
        titulo: "Solicitar nota ao fornecedor",
        descricao: rotulo,
        severidade: "pendente",
        ordem: -100,
      });
    }
    if (itensGrupo.some((k) => !k.nota_enviada_financeiro)) {
      itens.push({
        id: `nff-${chave}`,
        tabela: "compras_castanhas",
        registro_id: primeiro.id,
        titulo: "Enviar nota ao financeiro",
        descricao: rotulo,
        severidade: "pendente",
        ordem: -99,
      });
    }
  });

  db.compras_financeiro.forEach((f) => {
    if (!f.nota_fiscal_emitida) {
      itens.push({
        id: `finnf-${f.id}`,
        tabela: "compras_financeiro",
        registro_id: f.id,
        titulo: "Solicitar nota ao fornecedor",
        descricao: `${f.finalidade} · ${f.fornecedor}`,
        severidade: "pendente",
        ordem: -98,
      });
    }
    if (!f.nota_enviada_financeiro) {
      itens.push({
        id: `fin-${f.id}`,
        tabela: "compras_financeiro",
        registro_id: f.id,
        titulo: "Enviar nota ao financeiro",
        descricao: `${f.finalidade} · ${f.fornecedor}`,
        severidade: "pendente",
        ordem: -97,
      });
    }
  });

  db.eventos.forEach((e) => {
    const dias = diasAte(e.data_inicio);
    if (dias !== null && dias <= 3 && dias >= 0) {
      itens.push({
        id: `ev-${e.id}`,
        tabela: "eventos",
        registro_id: e.id,
        titulo: `Evento ${e.nome}`,
        descricao: `${e.cidade}/${e.estado} · começa ${textoDias(dias)}`,
        severidade: "alerta",
        ordem: dias,
      });
    }
  });

  // Estoques abaixo do limite configurável por módulo.
  const limites = getThresholds();
  const estoques: { modulo: EstoqueModulo; tabela: TabelaNome; rotulo: string; total: number }[] = [
    {
      modulo: "fardamentos",
      tabela: "estoque_fardamentos",
      rotulo: "fardamentos",
      total: db.estoque_fardamentos.reduce((s, r) => s + Number(r.quantidade || 0), 0),
    },
    {
      modulo: "canetas",
      tabela: "estoque_canetas",
      rotulo: "canetas",
      total: db.estoque_canetas.reduce((s, r) => s + Number(r.quantidade || 0), 0),
    },
    {
      modulo: "copos",
      tabela: "estoque_copos",
      rotulo: "copos",
      total: db.estoque_copos.reduce((s, r) => s + Number(r.quantidade || 0), 0),
    },
  ];

  estoques.forEach(({ modulo, tabela, rotulo, total }) => {
    const limite = limites[modulo];
    if (total < limite) {
      itens.push({
        id: `estoque-${modulo}`,
        tabela,
        registro_id: modulo,
        titulo: `Estoque baixo de ${rotulo}`,
        descricao: `${total} unidades (limite ${limite})`,
        severidade: "alerta",
        ordem: -50,
      });
    }
  });

  return itens.sort((a, b) => a.ordem - b.ordem);
}
