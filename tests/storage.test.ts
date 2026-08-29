import { beforeEach, describe, expect, it } from "vitest";
import { loadBestScore, loadGame, saveGame } from "../lib/storage";
import type { GameState } from "../lib/game";

const values = new Map<string, string>();

beforeEach(() => {
  values.clear();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    } }
  });
});

const valid: GameState = {
  tiles: [{ id: "tile-1", value: 2, x: 0, y: 0 }],
  score: 4,
  won: false,
  over: false,
  keepPlaying: false
};

describe("saved game validation", () => {
  it("round trips a valid game", () => {
    saveGame(valid);
    expect(loadGame()).toEqual(valid);
  });

  it.each([
    { ...valid, score: -1 },
    { ...valid, score: null },
    { ...valid, won: "false" },
    { ...valid, tiles: [{ id: "bad", value: 3, x: 0, y: 0 }] },
    { ...valid, tiles: [{ id: "bad", value: 2, x: 4, y: 0 }] },
    { ...valid, tiles: [valid.tiles[0], { id: "duplicate", value: 4, x: 0, y: 0 }] }
  ])("rejects malformed persisted state", (state) => {
    values.set("8124:game:v1", JSON.stringify(state));
    expect(loadGame()).toBeNull();
  });

  it.each(["Infinity", "12px", "-4", "1.5"])("rejects invalid best score %s", (score) => {
    values.set("8124:best:v1", score);
    expect(loadBestScore()).toBe(0);
  });
});
