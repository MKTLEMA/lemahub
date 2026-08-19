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

const csv = readFileSync("C:\\Users\\Andre\\Downloads\\Eventos 2026(2026).csv", "latin1").toString();
const lines = csv.split("\n").filter((l) => l.trim());

const MESES = { Jan: "01", Fev: "02", Mar: "03", Abr: "04", Mai: "05", Jun: "06", Jul: "07", Ago: "08", Set: "09", Out: "10", Nov: "11", Dez: "12" };
const SKIP = ["Eventos", "Feriados", "M?S", "DIAS", "PENDENTES", "Qtde", ";"];

function parseDias(mes, dias) {
	if (!mes || !MESES[mes]) return null;
	const m = MESES[mes];
	dias = dias.trim();
	
	let inicio, fim;
	if (dias.includes(" a ")) {
		const parts = dias.split(" a ");
		inicio = parts[0].trim();
		fim = parts[1].trim();
	} else if (dias.includes(" e ")) {
		const parts = dias.split(" e ");
		inicio = parts[0].trim();
		fim = parts[1].trim();
	} else {
		inicio = dias;
		fim = null;
	}
	inicio = inicio.replace(/\D/g, "");
	fim = fim ? fim.replace(/\D/g, "") : null;
	if (!inicio) return null;
	
	return {
		data_inicio: `2026-${m}-${inicio.padStart(2, "0")}`,
		data_fim: fim ? `2026-${m}-${fim.padStart(2, "0")}` : null,
	};
}

function splitList(str) {
	if (!str || str === "-") return [];
	return str.split(/[,;]\s*/).map((s) => s.trim()).filter(Boolean);
}

const eventos = [];
for (const line of lines) {
	const cells = line.split(";");
	const mes = cells[0]?.trim();
	const dias = cells[1]?.trim();
	
	if (!mes || !MESES[mes]) continue;
	if (!dias) continue;
	
	const parsed = parseDias(mes, dias);
	if (!parsed) continue;
	
	const nome = cells[2]?.trim();
	if (!nome) continue;
	
	const local = cells[3]?.trim() || "";
	const assoc = cells[4]?.trim() || "";
	const quem = cells[5]?.trim() || "";
	const materiais = cells[6]?.trim() || "";
	
	eventos.push({
		nome,
		data_inicio: parsed.data_inicio,
		data_fim: parsed.data_fim,
		local: local === "-" ? "" : local,
		associacao_relacionada: assoc === "-" ? "" : assoc,
		participantes: splitList(quem),
		materiais: splitList(materiais),
	});
}

const { error } = await supabase.from("eventos").insert(eventos);
if (error) {
	console.error("Erro:", error.message);
	process.exit(1);
}
console.log(`Importados ${eventos.length} eventos.`);
