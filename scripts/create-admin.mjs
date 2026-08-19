#!/usr/bin/env node
/**
 * Creates the base admin account in Supabase Auth + perfis table.
 * Run once: node scripts/create-admin.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const envContent = readFileSync(join(import.meta.dirname, "..", ".env"), "utf-8");
const env = Object.fromEntries(
	envContent
		.split("\n")
		.filter((l) => l && !l.startsWith("#"))
		.map((l) => {
			const i = l.indexOf("=");
			return [l.slice(0, i), l.slice(i + 1)];
		}),
);

const url = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
	console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
	process.exit(1);
}

const ADMIN_EMAIL = "marketing@lemaef.com.br";
const ADMIN_PASSWORD = "Lema@Admin2026!";
const ADMIN_NAME = "Marketing LEMA";

const supabase = createClient(url, serviceKey, {
	auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
	console.log(`Creating admin account: ${ADMIN_EMAIL}`);

	const { data: existing, error: lookupErr } = await supabase.auth.admin.listUsers();
	const exists = existing?.users?.some((u) => u.email === ADMIN_EMAIL);
	if (exists) {
		console.log("Admin user already exists. Updating perfil...");
		const { data: user } = await supabase.auth.admin.listUsers();
		const adminUser = user.users.find((u) => u.email === ADMIN_EMAIL);
		await supabase.from("perfis").upsert({
			id: adminUser.id,
			email: ADMIN_EMAIL,
			nome: ADMIN_NAME,
			role: "admin",
		});
		console.log("Perfil updated. Done.");
		return;
	}

	const { data: created, error: createErr } = await supabase.auth.admin.createUser({
		email: ADMIN_EMAIL,
		password: ADMIN_PASSWORD,
		email_confirm: true,
	});

	if (createErr) {
		console.error("Failed to create user:", createErr.message);
		process.exit(1);
	}

	console.log(`User created: ${created.user.id}`);

	const { error: perfilErr } = await supabase.from("perfis").insert({
		id: created.user.id,
		email: ADMIN_EMAIL,
		nome: ADMIN_NAME,
		role: "admin",
	});

	if (perfilErr) {
		console.error("Failed to create perfil:", perfilErr.message);
		process.exit(1);
	}

	console.log("Admin account created successfully!");
	console.log(`  Email: ${ADMIN_EMAIL}`);
	console.log(`  Password: ${ADMIN_PASSWORD}`);
	console.log("  Role: admin");
	console.log("\nChange the password after first login at /perfil");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
