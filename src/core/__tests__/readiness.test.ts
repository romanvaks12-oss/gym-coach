import { describe, expect, it } from "vitest";
import type { Brief } from "../../types";
import { averageSoreness, computeReadiness } from "../readiness";

const brief = (overrides: Partial<Brief> = {}): Brief => ({
  sleep: 4,
  energy: 4,
  stress: 2,
  minutes: 60,
  soreness: {},
  ...overrides,
});

describe("averageSoreness", () => {
  it("пустой бриф → 0", () => {
    expect(averageSoreness({})).toBe(0);
  });

  it("считает среднее по группам", () => {
    expect(averageSoreness({ quads: 6, chest: 2 })).toBe(4);
  });
});

describe("computeReadiness", () => {
  it("идеальное самочувствие → 100 и полный объём", () => {
    const result = computeReadiness(brief({ sleep: 5, energy: 5, stress: 1 }));
    expect(result.score).toBe(100);
    expect(result.band).toBe("high");
    expect(result.volumeMultiplier).toBe(1);
    expect(result.blockedGroups).toEqual([]);
  });

  it("разбитое состояние → нижняя граница и разгрузка", () => {
    const result = computeReadiness(
      brief({ sleep: 1, energy: 1, stress: 5, soreness: { quads: 8, chest: 8 } }),
    );
    expect(result.score).toBe(0);
    expect(result.band).toBe("low");
    expect(result.volumeMultiplier).toBe(0.6);
  });

  it("болезненность 7 блокирует группу, 6 — нет", () => {
    const result = computeReadiness(brief({ soreness: { quads: 7, back: 6 } }));
    expect(result.blockedGroups).toEqual(["quads"]);
  });

  it("средний день режет объём до 0,8", () => {
    const result = computeReadiness(brief({ sleep: 3, energy: 3, stress: 3, soreness: { quads: 3 } }));
    expect(result.band).toBe("medium");
    expect(result.volumeMultiplier).toBe(0.8);
  });

  it("жалоба на боль попадает во флаги", () => {
    const result = computeReadiness(brief({ painNote: "тянет плечо" }));
    expect(result.flags.some((f) => f.includes("боль"))).toBe(true);
  });
});
