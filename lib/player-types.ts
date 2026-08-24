import type { RankName } from "./ranks";

export type PlayerProfile = {
  id: string;
  username: string;
  display_name: string;
  rank: RankName;
  xp: number;
  best_score: number;
  max_tile: number;
  fastest_2048_ms: number | null;
  games_played: number;
  total_score: number;
};

export type LeaderboardEntry = Pick<
  PlayerProfile,
  "id" | "username" | "display_name" | "rank" | "xp" | "best_score" | "max_tile" | "fastest_2048_ms"
> & {
  weekly_score: number;
  weekly_games: number;
};

export type Badge = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  earned_at?: string;
};

export type DashboardData = {
  profile: PlayerProfile;
  badges: Badge[];
  leaderboard: LeaderboardEntry[];
  weeklyPlace: number | null;
  weeklyScore: number;
};
