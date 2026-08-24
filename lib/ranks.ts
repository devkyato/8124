export const ranks = [
  { name: "Unranked", minXp: 0, color: "#737373" },
  { name: "Bronze", minXp: 250, color: "#9a6945" },
  { name: "Silver", minXp: 750, color: "#7a8491" },
  { name: "Gold", minXp: 1_500, color: "#b68912" },
  { name: "Platinum", minXp: 3_000, color: "#2d8b83" },
  { name: "Diamond", minXp: 6_000, color: "#3976c7" },
  { name: "Master", minXp: 10_000, color: "#7c4cc9" },
  { name: "Grandmaster", minXp: 18_000, color: "#c73b58" }
] as const;

export type RankName = (typeof ranks)[number]["name"];

export function getRankProgress(xp: number) {
  const safeXp = Math.max(0, xp);
  let index = 0;

  for (let candidate = ranks.length - 1; candidate >= 0; candidate -= 1) {
    if (safeXp >= ranks[candidate].minXp) {
      index = candidate;
      break;
    }
  }

  const current = ranks[index];
  const next = ranks[index + 1] ?? null;
  const progress = next
    ? Math.min(100, Math.round(((safeXp - current.minXp) / (next.minXp - current.minXp)) * 100))
    : 100;

  return { current, next, progress, xpToNext: next ? next.minXp - safeXp : 0 };
}

export function calculateRunXp(score: number, maxTile: number, won: boolean) {
  return Math.max(5, Math.floor(score / 100) + Math.floor(maxTile / 8) + (won ? 250 : 0));
}
