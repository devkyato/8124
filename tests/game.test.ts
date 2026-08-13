import { describe, expect, it, vi } from "vitest";
import { moveGame, type GameState, type Tile } from "../lib/game";

function gameWithRow(values: number[]): GameState {
  const tiles = values.flatMap((value, x) => value ? [{ id: `tile-${x}`, value, x, y: 0 } as Tile] : []);
  return { tiles, score: 0, won: false, over: false, keepPlaying: false };
}

function firstRow(state: GameState) {
  const row = [0, 0, 0, 0];
  state.tiles.filter((tile) => !tile.isGhost && !tile.isNew && tile.y === 0).forEach((tile) => {
    row[tile.x] = tile.value;
  });
  return row;
}

describe("2048 movement", () => {
  it.each([
    [[2, 2, 2, 2], [4, 4, 0, 0]],
    [[2, 2, 2, 0], [4, 2, 0, 0]],
    [[2, 2, 4, 4], [4, 8, 0, 0]],
    [[4, 4, 8, 0], [8, 8, 0, 0]]
  ])("merges %j into %j", (input, expected) => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(firstRow(moveGame(gameWithRow(input), 3).state)).toEqual(expected);
    vi.restoreAllMocks();
  });

  it("does not change an invalid move", () => {
    const game = gameWithRow([2, 4, 8, 16]);
    const result = moveGame(game, 0);
    expect(result.moved).toBe(false);
    expect(result.state).toBe(game);
  });

  it("replaces two source tiles with one merged tile", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = moveGame(gameWithRow([2, 2, 0, 0]), 3);
    const settledTiles = result.state.tiles.filter((tile) => !tile.isGhost && !tile.isNew);
    const movingSources = result.state.tiles.filter((tile) => tile.isGhost);

    expect(settledTiles).toHaveLength(1);
    expect(settledTiles[0]).toMatchObject({ value: 4, x: 0, y: 0, isMerged: true });
    expect(movingSources).toHaveLength(2);
    expect(movingSources.every((tile) => tile.x === 0 && tile.y === 0)).toBe(true);
    vi.restoreAllMocks();
  });
});
