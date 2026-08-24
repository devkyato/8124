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
const suffix = Date.now().toString();
let userId;

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`PASS  ${message}`);
}

try {
  const { data: signedIn, error: signInError } = await player.auth.signInAnonymously({
    options: { data: { username: `arcade_${suffix.slice(-8)}`, display_name: "Arcade E2E" } }
  });
  if (signInError) throw signInError;
  userId = signedIn.user?.id;
  assert(Boolean(userId), "anonymous arcade player created");
  assert(Boolean((await player.auth.getUser()).data.user), "arcade session authentication works");

  const username = `e2e_${suffix.slice(-10)}`;
  const { data: updated, error: updateError } = await player
    .from("profiles")
    .update({ username, display_name: "Arcade E2E Player" })
    .eq("id", userId)
    .select("username,display_name")
    .single();
  if (updateError) throw updateError;
  assert(updated.username === username && updated.display_name === "Arcade E2E Player", "profile editing works through RLS");

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
  assert(true, "authenticated arcade run submitted");

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
    console.log("PASS  temporary arcade player and run data removed");
  }
}
