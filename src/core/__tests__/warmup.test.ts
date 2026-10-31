import { describe, expect, it } from "vitest";
import { warmupLadder, warmupText } from "../warmup";

describe("warmupLadder", () => {
  it("для 100 кг даёт 40 / 60 / 80", () => {
    expect(warmupLadder(100)).toEqual([
      { weight: 40, reps: 8 },
      { weight: 60, reps: 5 },
      { weight: 80, reps: 3 },
    ]);
  });

  it("округляет до шага блинов 2,5 кг", () => {
    const ladder = warmupLadder(62.5);
    expect(ladder.map((set) => set.weight)).toEqual([25, 37.5, 50]);
  });

  it("не опускается ниже пустого грифа", () => {
    const ladder = warmupLadder(35);
    expect(ladder[0].weight).toBeGreaterThanOrEqual(20);
  });

  it("не предлагает разминку для лёгкого веса, нуля и мусора", () => {
    expect(warmupLadder(20)).toEqual([]);
    expect(warmupLadder(0)).toEqual([]);
    expect(warmupLadder(-50)).toEqual([]);
    expect(warmupLadder(Number.NaN)).toEqual([]);
  });

  it("никогда не ставит разминку больше рабочего веса", () => {
    for (const weight of [30, 45, 60, 77.5, 120, 250]) {
      for (const set of warmupLadder(weight)) {
        expect(set.weight).toBeLessThan(weight);
      }
    }
  });

  it("веса строго возрастают и не дублируются", () => {
    for (const weight of [30, 42.5, 95, 140]) {
      const weights = warmupLadder(weight).map((set) => set.weight);
      const sorted = [...weights].sort((a, b) => a - b);
      expect(weights).toEqual(sorted);
      expect(new Set(weights).size).toBe(weights.length);
    }
  });

  it("понимает свой гриф и шаг", () => {
    const ladder = warmupLadder(80, { barKg: 10, stepKg: 5 });
    expect(ladder.map((set) => set.weight)).toEqual([30, 50, 65]);
  });

  it("складывается в читаемую подпись", () => {
    expect(warmupText(warmupLadder(100))).toBe("40 × 8 · 60 × 5 · 80 × 3");
  });
});
