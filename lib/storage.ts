import type { GameState } from "./game";

const gameKey = "8124:game:v1";
const bestKey = "8124:best:v1";

export function loadGame(): GameState | null {
  try {
    const value = window.localStorage.getItem(gameKey);
    const state = value ? JSON.parse(value) as Partial<GameState> : null;

    if (!state || !Array.isArray(state.tiles) || typeof state.score !== "number") {
      return null;
    }

    return state as GameState;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState) {
  try {
    window.localStorage.setItem(gameKey, JSON.stringify(state));
  } catch {
    // the game still works when browser storage is unavailable
  }
}

export function loadBestScore() {
  try {
    return Number.parseInt(window.localStorage.getItem(bestKey) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score: number) {
  try {
    window.localStorage.setItem(bestKey, String(score));
  } catch {
    // best-score persistence is optional
  }
}
