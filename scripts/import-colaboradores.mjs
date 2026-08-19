#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
	readFileSync(".env", "utf8")
		.split("\n")
		.filter((l) => l && !l.startsWith("#"))
		.map((l) => {
			const i = l.indexOf("=");
			return [l.slice(0, i), l.slice(i + 1)];
		}),
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
	auth: { autoRefreshToken: false, persistSession: false },
});

function parseSemicolonCsv(text) {
	const lines = text.split("\n").filter((l) => l.trim());
	const headers = lines[0].split(";").map((h) => h.trim());
	return lines.slice(1).map((line) => {
		const cells = line.split(";");
		const obj = {};
		headers.forEach((h, i) => (obj[h] = (cells[i] ?? "").trim()));
		return obj;
	});
}

function convertDate(d) {
	if (!d) return "";
	const parts = d.split("/");
	if (parts.length !== 3) return d;
	return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
}

const csv = readFileSync(
	"C:\\Users\\Andre\\LEMA\\Grupo Marketing - Documentos\\LISTAGEM DE COLABORADORES - GRUPOS LEMA.csv",
	"latin1",
);
const rows = parseSemicolonCsv(csv.toString());

const mapped = rows.map((r) => ({
	nome: r["Nome"] || "",
	empresa_grupo: r["Empresa"] || "",
	setor: r["Setor"] || "",
	formato_trabalho: (r["Modalidade"] || "presencial").toLowerCase(),
	email: r["Email"] || "",
	data_aniversario: convertDate(r["Data de aniversário"] || r["Data de anivers?rio"]),
	data_ingresso: convertDate(r["Data de admissão"] || r["Data de admiss?o"]),
	tem_filhos: /sim/i.test(r["Tem filho(a)?"] || r["Tem filho(a)?" || ""]),
	tamanho_farda: r["Tamanho de camisa"] || "",
	genero: r["Gênero"] || r["G?nero"] || "",
	tipo_contratacao: r["Opção de contratação"] || r["Op??o de contrata??o"] || "",
	curso_formacao: r["Curso de formação"] || r["Curso de forma??o"] || "",
	detalhes_filhos: r["Detalhes dos filhos (qtd/idade)"] || "",
	endereco: r["Endereço completo"] || r["Endere?o completo"] || "",
	contato_emergencia_parentesco: r["Contato de emergência (quem)"] || r["Contato de emerg?ncia (quem)"] || "",
	contato_emergencia_nome: r["Nome do contato de emergência"] || r["Nome do contato de emerg?ncia"] || "",
	contato_emergencia_telefone: r["Telefone do contato de emergência"] || r["Telefone do contato de emerg?ncia"] || "",
	restricao_alimentar: r["Restrição alimentar"] || r["Restri??o alimentar"] || "",
	hobby: r["Hobby"] || "",
}));

const { error } = await supabase.from("colaboradores").insert(mapped);
if (error) {
	console.error("Erro:", error.message);
	process.exit(1);
}
console.log(`Importados ${mapped.length} colaboradores.`);
