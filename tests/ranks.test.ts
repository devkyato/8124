import { describe, expect, it } from "vitest";
import { calculateRunXp, getRankProgress } from "../lib/ranks";

describe("rank progression", () => {
  it.each([
    [0, "Unranked"],
    [249, "Unranked"],
    [250, "Bronze"],
    [750, "Silver"],
    [1_500, "Gold"],
    [3_000, "Platinum"],
    [6_000, "Diamond"],
    [10_000, "Master"],
    [18_000, "Grandmaster"]
  ])("maps %i XP to %s", (xp, rank) => {
    expect(getRankProgress(xp).current.name).toBe(rank);
  });

  it("awards score, tile, and win XP", () => {
    expect(calculateRunXp(10_000, 2048, true)).toBe(606);
    expect(calculateRunXp(0, 2, false)).toBe(5);
  });
});
