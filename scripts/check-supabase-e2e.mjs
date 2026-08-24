import { randomBytes } from "node:crypto";
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
if (!url || !publishableKey || !secretKey) throw new Error("Supabase environment variables are incomplete.");

const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
const player = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
const suffix = `${Date.now()}${randomBytes(2).toString("hex")}`;
const email = `codex-e2e-${suffix}@example.com`;
const password = randomBytes(24).toString("base64url");
let userId;

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`PASS  ${message}`);
}

try {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: `e2e_${suffix.slice(-8)}`, display_name: "Codex E2E" }
  });
  if (createError) throw createError;
  userId = created.user.id;
  assert(Boolean(userId), "temporary account created");

  const { error: signInError } = await player.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  assert(Boolean((await player.auth.getUser()).data.user), "email/password authentication works");

  const username = `e2e_${suffix.slice(-10)}`;
  const { data: updated, error: updateError } = await player
    .from("profiles")
    .update({ username, display_name: "Ranked E2E Player" })
    .eq("id", userId)
    .select("username,display_name")
    .single();
  if (updateError) throw updateError;
  assert(updated.username === username && updated.display_name === "Ranked E2E Player", "profile editing works through RLS");

  const { error: protectedError } = await player.from("profiles").update({ xp: 999999 }).eq("id", userId);
  assert(Boolean(protectedError), "players cannot edit protected rank or XP fields");

  const { error: impossibleRunError } = await player.from("game_runs").insert({
    user_id: userId,
    score: 100,
    max_tile: 128,
    duration_ms: 5000,
    moves: 20,
    won: true
  });
  assert(impossibleRunError?.code === "23514", "database rejects an impossible winning run");

  const { error: runError } = await player.from("game_runs").insert({
    user_id: userId,
    score: 20480,
    max_tile: 2048,
    duration_ms: 300000,
    moves: 600,
    won: true
  });
  if (runError) throw runError;
  assert(true, "authenticated ranked run submitted");

  const { data: profile, error: profileError } = await player
    .from("profiles")
    .select("rank,xp,best_score,max_tile,fastest_2048_ms,games_played,total_score")
    .eq("id", userId)
    .single();
  if (profileError) throw profileError;
  assert(profile.rank === "Bronze" && profile.xp === 710, "database calculated Bronze rank and 710 XP");
  assert(profile.games_played === 1 && profile.best_score === 20480, "profile statistics updated from the run");
  assert(profile.fastest_2048_ms === 300000, "2048 speedrun time recorded");

  const { data: badges, error: badgesError } = await player
    .from("player_badges")
    .select("badges(slug)")
    .eq("user_id", userId);
  if (badgesError) throw badgesError;
  assert((badges ?? []).length === 6, "six qualifying badges awarded automatically");

  const { data: weekly, error: weeklyError } = await player
    .from("weekly_leaderboard")
    .select("weekly_score,weekly_games")
    .eq("id", userId)
    .single();
  if (weeklyError) throw weeklyError;
  assert(Number(weekly.weekly_score) === 20480 && weekly.weekly_games === 1, "weekly leaderboard totals updated");
} finally {
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw new Error(`Test account cleanup failed: ${error.message}`);
    console.log("PASS  temporary account and run data removed");
  }
}
