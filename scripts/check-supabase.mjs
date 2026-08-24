import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const contents = await readFile(new URL("../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(
  contents
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    })
);

const url = env.SUPABASE_URL;
const publishableKey = env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = env.SUPABASE_SECRET_KEY;
const jwksUrl = env.SUPABASE_JWKS_URL;

if (!url || !publishableKey || !secretKey || !jwksUrl) {
  throw new Error("Supabase environment variables are incomplete.");
}

const checks = [];
const authHealth = await fetch(`${url}/auth/v1/health`, {
  headers: { apikey: publishableKey }
});
checks.push({ check: "Auth API", ok: authHealth.ok, status: authHealth.status });

const jwks = await fetch(jwksUrl);
checks.push({ check: "JWKS", ok: jwks.ok, status: jwks.status });

const admin = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

for (const table of ["profiles", "game_runs", "badges", "player_badges"]) {
  const { error } = await admin.from(table).select("*").limit(1);
  checks.push({
    check: `Table: ${table}`,
    ok: !error,
    status: error?.code ?? "ready",
    message: error?.message
  });
}

for (const result of checks) {
  console.log(`${result.ok ? "PASS" : "FAIL"}  ${result.check} (${result.status})${result.message ? ` - ${result.message}` : ""}`);
}

if (checks.some((result) => !result.ok)) {
  process.exitCode = 1;
}
