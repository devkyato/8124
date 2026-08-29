import { boardSize, type GameState, type Tile } from "./game";

const gameKey = "8124:game:v1";
const bestKey = "8124:best:v1";

export function loadGame(): GameState | null {
  try {
    const value = window.localStorage.getItem(gameKey);
    const state = value ? JSON.parse(value) as Partial<GameState> : null;

    if (!isSavedGame(state)) {
      return null;
    }

    return state as GameState;
  } catch {
    return null;
  }
}

function isSavedTile(value: unknown): value is Tile {
  if (!value || typeof value !== "object") return false;
  const tile = value as Partial<Tile>;
  return typeof tile.id === "string" && tile.id.length > 0
    && Number.isInteger(tile.x) && tile.x! >= 0 && tile.x! < boardSize
    && Number.isInteger(tile.y) && tile.y! >= 0 && tile.y! < boardSize
    && Number.isInteger(tile.value) && tile.value! >= 2
    && (tile.value! & (tile.value! - 1)) === 0;
}

function isSavedGame(state: Partial<GameState> | null): state is GameState {
  if (!state || !Array.isArray(state.tiles) || state.tiles.length > boardSize ** 2) return false;
  if (!Number.isSafeInteger(state.score) || state.score! < 0) return false;
  if ([state.won, state.over, state.keepPlaying].some((value) => typeof value !== "boolean")) {
    return false;
  }
  const occupied = new Set<string>();
  for (const tile of state.tiles) {
    if (!isSavedTile(tile) || tile.isGhost) return false;
    const position = `${tile.x},${tile.y}`;
    if (occupied.has(position)) return false;
    occupied.add(position);
  }
  return true;
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
    const score = Number(window.localStorage.getItem(bestKey) ?? "0");
    return Number.isSafeInteger(score) && score >= 0 ? score : 0;
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
