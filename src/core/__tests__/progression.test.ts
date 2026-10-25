import { describe, expect, it } from "vitest";
import type { PerformedSet } from "../progression";
import { nextTarget, roundToStep } from "../progression";

const set = (weight: number, reps: number, rpe: number): PerformedSet => ({
  exerciseId: "bb-bench-press",
  weight,
  reps,
  rpe,
  date: "2026-10-20",
});

describe("roundToStep", () => {
  it("округляет до шага 2,5", () => {
    expect(roundToStep(102.5, 2.5)).toBe(102.5);
    expect(roundToStep(103, 2.5)).toBe(102.5);
    expect(roundToStep(103.8, 2.5)).toBe(105);
  });

  it("нулевой шаг — обычное округление", () => {
    expect(roundToStep(41.6, 0)).toBe(42);
  });
});

describe("nextTarget", () => {
  const base = { equipment: "barbell" as const, repLow: 6, repHigh: 10 };

  it("первый раз — вес подбирает пользователь", () => {
    const target = nextTarget({ ...base, lastSets: [] });
    expect(target.weight).toBeNull();
    expect(target.repTarget).toBe(10);
  });

  it("верх диапазона при RPE 8 → +2,5 %", () => {
    const target = nextTarget({ ...base, lastSets: [set(100, 10, 8), set(100, 10, 8)] });
    expect(target.weight).toBe(102.5);
    expect(target.repTarget).toBe(6);
  });

  it("отказной подход (RPE 10) → вес не растёт", () => {
    const target = nextTarget({ ...base, lastSets: [set(100, 10, 10)] });
    expect(target.weight).toBe(100);
  });

  it("недобор повторов → вес тот же, цель +1 повтор", () => {
    const target = nextTarget({ ...base, lastSets: [set(100, 7, 8)] });
    expect(target.weight).toBe(100);
    expect(target.repTarget).toBe(8);
  });

  it("два промаха подряд → шаг назад 5 %", () => {
    const target = nextTarget({ ...base, lastSets: [set(100, 5, 9)], missedSessions: 2 });
    expect(target.weight).toBe(95);
  });

  it("для гантелей шаг 1 кг", () => {
    const target = nextTarget({
      equipment: "dumbbell",
      repLow: 10,
      repHigh: 15,
      lastSets: [set(20, 15, 7)],
    });
    expect(target.weight).toBe(21);
  });
});
