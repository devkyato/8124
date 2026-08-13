import { afterEach, describe, expect, it, vi } from "vitest";
import { createGame, moveGame } from "../lib/game";
import { chooseMove } from "../lib/solver";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("hidden solver", () => {
  it("keeps choosing valid moves during a fast run", () => {
    let seed = 8124;
    vi.spyOn(Math, "random").mockImplementation(() => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    });

    let game = createGame();
    let moves = 0;

    while (!game.over && moves < 40) {
      const direction = chooseMove(game.tiles);
      expect(direction).not.toBeNull();
      const result = moveGame(game, direction!);
      expect(result.moved).toBe(true);
      game = result.state;
      moves += 1;
    }

    expect(moves).toBe(40);
  });
});
