import { Game } from "@/components/game";
import { getScores } from "@/lib/score-store";

export default function HomePage() {
  const globalBest = getScores()[0]?.score ?? 0;
  return <Game initialGlobalBest={globalBest} />;
}
