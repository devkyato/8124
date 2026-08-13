export type ScoreEntry = {
  id: string;
  score: number;
  createdAt: string;
};

const scoreLimit = 50;
const scores: ScoreEntry[] = [];

export function getScores() {
  return scores.slice(0, 10);
}

export function addScore(score: number) {
  const entry = {
    id: crypto.randomUUID(),
    score,
    createdAt: new Date().toISOString()
  };

  scores.push(entry);
  scores.sort((first, second) => second.score - first.score);
  scores.splice(scoreLimit);

  return entry;
}
