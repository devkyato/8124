"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardData } from "@/lib/player-types";
import { createClient } from "@/lib/supabase/client";
import { loadDashboard } from "@/lib/supabase/player-data";
import { Game } from "./game";
import { PlayerSidebar } from "./player-sidebar";
import { LeaderboardSidebar } from "./leaderboard-sidebar";

export function RankedGame() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setError("Your session expired. Sign in again.");
      return;
    }
    try {
      setData(await loadDashboard(supabase, auth.user.id));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load player data");
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  if (error) return <main className="dashboard-error"><h1>Could not load the arcade</h1><p>{error}</p><button className="button" onClick={refresh}>try again</button></main>;
  if (!data) return <main className="dashboard-loading"><div className="loader" /><span>loading your rank</span></main>;

  return (
    <main className="ranked-layout">
      <PlayerSidebar data={data} onRefresh={refresh} />
      <Game initialGlobalBest={data.profile.best_score} onRunSubmitted={refresh} />
      <LeaderboardSidebar data={data} />
    </main>
  );
}
