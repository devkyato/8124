import type { SupabaseClient } from "@supabase/supabase-js";
import type { Badge, DashboardData, LeaderboardEntry, PlayerProfile } from "@/lib/player-types";

export async function loadDashboard(supabase: SupabaseClient, userId: string): Promise<DashboardData> {
  const [{ data: profile, error: profileError }, { data: leaderboard, error: leaderboardError }, { data: earned, error: badgesError }] = await Promise.all([
    supabase.from("profiles").select("id,username,display_name,rank,xp,best_score,max_tile,fastest_2048_ms,games_played,total_score").eq("id", userId).single(),
    supabase.from("weekly_leaderboard").select("id,username,display_name,rank,xp,best_score,max_tile,fastest_2048_ms,weekly_score,weekly_games").order("weekly_score", { ascending: false }).order("best_score", { ascending: false }).limit(50),
    supabase.from("player_badges").select("earned_at,badges(id,slug,name,description,icon)").eq("user_id", userId).order("earned_at", { ascending: false })
  ]);

  if (profileError || leaderboardError || badgesError || !profile) {
    throw new Error(profileError?.message ?? leaderboardError?.message ?? badgesError?.message ?? "Profile not found");
  }

  const entries = (leaderboard ?? []) as LeaderboardEntry[];
  const weeklyIndex = entries.findIndex((entry) => entry.id === userId);
  const current = entries[weeklyIndex];
  const badges = (earned ?? []).flatMap((row) => {
    const related = row.badges as unknown;
    const badge = Array.isArray(related) ? related[0] : related;
    return badge ? [{ ...(badge as Omit<Badge, "earned_at">), earned_at: row.earned_at }] : [];
  });

  return {
    profile: profile as PlayerProfile,
    badges,
    leaderboard: entries,
    weeklyPlace: weeklyIndex >= 0 ? weeklyIndex + 1 : null,
    weeklyScore: Number(current?.weekly_score ?? 0)
  };
}
