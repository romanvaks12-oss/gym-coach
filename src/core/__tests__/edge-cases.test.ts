/**
 * Стресс-тесты: границы, мусорные данные, нереальные значения.
 * Цель — приложение не падает и не выдаёт NaN/абсурд даже на испорченной истории.
 */
import { describe, expect, it } from "vitest";
import type { Brief, MuscleGroup } from "../../types";
import { EXERCISES } from "../../domain/catalog";
import { computeReadiness } from "../readiness";
import { nextTarget } from "../progression";
import { buildPlans } from "../plan";
import { checkSetInput, formatKg, saneBodyWeightKg } from "../validation";

const TODAY = "2026-10-26";
const ALL_MUSCLES: MuscleGroup[] = [
  "chest",
  "back",
  "lats",
  "quads",
  "hamstrings",
  "glutes",
  "shoulders",
  "biceps",
  "triceps",
  "calves",
  "core",
  "traps",
  "forearms",
];

const brief = (overrides: Partial<Brief> = {}): Brief => ({
  sleep: 5,
  energy: 5,
  stress: 1,
  minutes: 60,
  soreness: {},
  ...overrides,
});

describe("checkSetInput — границы и мусор", () => {
  const base = {
    weight: 60,
    reps: 8,
    rpe: 8,
    measure: "reps" as const,
    usesBodyweight: false,
  };

  it("нормальный подход проходит без предупреждений", () => {
    const result = checkSetInput(base);
    expect(result.ok).toBe(true);
    expect(result.error).toBeNull();
    expect(result.warning).toBeNull();
  });

  it("вес: 0 для штанги — ошибка, для своего веса — ок", () => {
    expect(checkSetInput({ ...base, weight: 0 }).ok).toBe(false);
    expect(checkSetInput({ ...base, weight: 0, usesBodyweight: true }).ok).toBe(true);
  });

  it("вес: отрицательный, NaN, Infinity — ошибка", () => {
    expect(checkSetInput({ ...base, weight: -1 }).ok).toBe(false);
    expect(checkSetInput({ ...base, weight: Number.NaN }).ok).toBe(false);
    expect(checkSetInput({ ...base, weight: Number.POSITIVE_INFINITY }).ok).toBe(false);
  });

  it("вес: 400 кг — граница, 400,1 — уже ошибка", () => {
    expect(checkSetInput({ ...base, weight: 400 }).ok).toBe(true);
    expect(checkSetInput({ ...base, weight: 400.1 }).ok).toBe(false);
  });

  it("повторы: 1 и 100 — границы, 0 и 101 — ошибка, дробные — ошибка", () => {
    expect(checkSetInput({ ...base, reps: 1 }).ok).toBe(true);
    expect(checkSetInput({ ...base, reps: 100 }).ok).toBe(true);
    expect(checkSetInput({ ...base, reps: 0 }).ok).toBe(false);
    expect(checkSetInput({ ...base, reps: 101 }).ok).toBe(false);
    expect(checkSetInput({ ...base, reps: 7.5 }).ok).toBe(false);
  });

  it("время: секунды целые, до 1800", () => {
    const timed = { ...base, weight: 0, usesBodyweight: true, measure: "time" as const };
    expect(checkSetInput({ ...timed, reps: 30 }).ok).toBe(true);
    expect(checkSetInput({ ...timed, reps: 1800 }).ok).toBe(true);
    expect(checkSetInput({ ...timed, reps: 1801 }).ok).toBe(false);
    expect(checkSetInput({ ...timed, reps: 30.5 }).ok).toBe(false);
  });

  it("RPE: только целое 1–10", () => {
    expect(checkSetInput({ ...base, rpe: 1 }).ok).toBe(true);
    expect(checkSetInput({ ...base, rpe: 10 }).ok).toBe(true);
    expect(checkSetInput({ ...base, rpe: 0 }).ok).toBe(false);
    expect(checkSetInput({ ...base, rpe: 11 }).ok).toBe(false);
    expect(checkSetInput({ ...base, rpe: 8.5 }).ok).toBe(false);
  });

  it("опечатка 12 → 112: предупреждение, но запись не блокируется", () => {
    const result = checkSetInput({ ...base, weight: 112, referenceWeightKg: 12 });
    expect(result.ok).toBe(true);
    expect(result.warning).toContain("12");
    expect(result.warning).toContain("112");
  });

  it("резкий скачок ловится и на рабочем весе: 60 → 112", () => {
    expect(checkSetInput({ ...base, weight: 112, referenceWeightKg: 60 }).warning).not.toBeNull();
  });

  it("обычный рост веса предупреждения не даёт", () => {
    expect(checkSetInput({ ...base, weight: 30, referenceWeightKg: 12 }).warning).toBeNull();
    expect(checkSetInput({ ...base, weight: 75, referenceWeightKg: 60 }).warning).toBeNull();
    expect(checkSetInput({ ...base, weight: 60, referenceWeightKg: 60 }).warning).toBeNull();
  });

  it("без ориентира и с нулевым ориентиром предупреждения нет", () => {
    expect(checkSetInput({ ...base, weight: 300 }).warning).toBeNull();
    expect(checkSetInput({ ...base, weight: 300, referenceWeightKg: 0 }).warning).toBeNull();
  });

  it("formatKg: целые и дробные", () => {
    expect(formatKg(12)).toBe("12");
    expect(formatKg(12.5)).toBe("12,5");
    expect(formatKg(Number.NaN)).toBe("—");
  });
});

describe("saneBodyWeightKg", () => {
  it("нормальный вес проходит и округляется до 0,1", () => {
    expect(saneBodyWeightKg(78.44)).toBe(78.4);
    expect(saneBodyWeightKg(90)).toBe(90);
  });

  it("нереальные значения отбрасываются", () => {
    expect(saneBodyWeightKg(0)).toBeNull();
    expect(saneBodyWeightKg(-5)).toBeNull();
    expect(saneBodyWeightKg(1123)).toBeNull();
    expect(saneBodyWeightKg(Number.NaN)).toBeNull();
    expect(saneBodyWeightKg("78")).toBeNull();
    expect(saneBodyWeightKg(undefined)).toBeNull();
  });
});

describe("readiness — устойчивость к мусору", () => {
  it("не выходит за 0..100 и не даёт NaN", () => {
    const weird = {
      sleep: 0,
      energy: 99,
      stress: -5,
      soreness: { chest: Number.NaN, back: 1000 },
      minutes: 60,
    } as unknown as Brief;
    const result = computeReadiness(weird);
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(["low", "medium", "high"]).toContain(result.band);
  });

  it("NaN в болезненности не блокирует группу", () => {
    const b = brief({ soreness: { chest: Number.NaN, quads: 6.9 } });
    const result = computeReadiness(b);
    expect(result.blockedGroups).toEqual([]);
  });

  it("ровно 7 — уже блокирует", () => {
    expect(computeReadiness(brief({ soreness: { back: 7 } })).blockedGroups).toEqual(["back"]);
    expect(computeReadiness(brief({ soreness: { back: 6.99 } })).blockedGroups).toEqual([]);
  });
});

describe("progression — испорченная история", () => {
  const base = { equipment: "barbell" as const, repLow: 6, repHigh: 10 };

  it("битые подходы игнорируются, валидные работают", () => {
    const target = nextTarget({
      ...base,
      lastSets: [
        { exerciseId: "bb-bench-press", weight: Number.NaN, reps: 8, rpe: 8, date: TODAY },
        { exerciseId: "bb-bench-press", weight: 100, reps: 12, rpe: 8, date: TODAY },
      ],
    });
    expect(target.weight).toBe(102.5);
    expect(Number.isFinite(target.weight!)).toBe(true);
  });

  it("если все подходы битые — как в первый раз", () => {
    const target = nextTarget({
      ...base,
      lastSets: [
        { exerciseId: "x", weight: -50, reps: 8, rpe: 8, date: TODAY },
        { exerciseId: "x", weight: 60, reps: 0, rpe: 8, date: TODAY },
      ],
    });
    expect(target.weight).toBeNull();
    expect(target.repTarget).toBe(10);
  });

  it("неизвестное оборудование не даёт NaN", () => {
    const target = nextTarget({
      ...base,
      equipment: "kettlebell" as never,
      lastSets: [{ exerciseId: "x", weight: 30, reps: 10, rpe: 8, date: TODAY }],
    });
    expect(target.weight).not.toBeNull();
    expect(Number.isFinite(target.weight!)).toBe(true);
  });

  it("время растёт на 5 с, но не выше верхней границы", () => {
    const target = nextTarget({
      equipment: "bodyweight",
      repLow: 30,
      repHigh: 45,
      measure: "time",
      usesBodyweight: true,
      lastSets: [{ exerciseId: "bodyweight-plank", weight: 0, reps: 44, rpe: 8, date: TODAY }],
    });
    expect(target.repTarget).toBe(45);
  });

  it("вес тела: +1 повтор, но не больше верх+2", () => {
    const target = nextTarget({
      equipment: "bodyweight",
      repLow: 2,
      repHigh: 3,
      usesBodyweight: true,
      lastSets: [{ exerciseId: "bodyweight-pull-up", weight: 78, reps: 5, rpe: 8, date: TODAY }],
    });
    expect(target.repTarget).toBe(5);
  });
});

describe("план — крайние брифы и история", () => {
  const planFor = (overrides: Partial<Brief>, history: Parameters<typeof buildPlans>[0]["history"] = []) => {
    const b = brief(overrides);
    return buildPlans({
      brief: b,
      readiness: computeReadiness(b),
      history,
      exercises: EXERCISES,
      todayIso: TODAY,
    });
  };

  it("все группы болят 10/10 — плана нет, день отдыха", () => {
    const soreness = Object.fromEntries(ALL_MUSCLES.map((m) => [m, 10])) as Brief["soreness"];
    expect(planFor({ soreness })).toEqual([]);
  });

  it("вес тела 1123 кг не попадает в план", () => {
    const plans = planFor({ bodyWeightKg: 1123 });
    expect(plans[0].bodyWeightKg).toBeNull();
  });

  it("нормальный вес тела сохраняется", () => {
    expect(planFor({ bodyWeightKg: 78.44 })[0].bodyWeightKg).toBe(78.4);
  });

  it("дата из будущего считается «сегодня» и не ломает план", () => {
    const plans = planFor({}, [
      { exerciseId: "bb-back-squat", weight: 60, reps: 8, rpe: 8, date: "2027-01-01" },
    ]);
    expect(plans.length).toBeGreaterThan(0);
    for (const plan of plans) {
      for (const item of plan.items) {
        const ex = EXERCISES.find((e) => e.id === item.exerciseId)!;
        expect(ex.primaryMuscle).not.toBe("quads");
      }
    }
  });

  it("упражнения не из каталога в истории игнорируются", () => {
    const plans = planFor({}, [
      { exerciseId: "unknown-exercise", weight: 1000, reps: 100, rpe: 10, date: TODAY },
    ]);
    expect(plans.length).toBeGreaterThan(0);
    expect(plans[0].items.every((i) => EXERCISES.some((e) => e.id === i.exerciseId))).toBe(true);
  });

  it("90 минут — не больше 7 упражнений, все с валидными числами", () => {
    const plans = planFor({ minutes: 90 });
    expect(plans[0].items.length).toBeLessThanOrEqual(7);
    for (const item of plans[0].items) {
      expect(item.sets).toBeGreaterThanOrEqual(2);
      expect(item.sets).toBeLessThanOrEqual(4);
      expect(Number.isFinite(item.repLow)).toBe(true);
      expect(Number.isFinite(item.repHigh)).toBe(true);
      expect(item.repLow).toBeLessThanOrEqual(item.repHigh);
    }
  });

  it("история с нулевым весом не превращается в NaN", () => {
    const plans = planFor({}, [
      { exerciseId: "bb-bench-press", weight: 0, reps: 8, rpe: 8, date: TODAY },
      { exerciseId: "bb-bench-press", weight: 0, reps: 8, rpe: 8, date: TODAY },
    ]);
    for (const plan of plans) {
      for (const item of plan.items) {
        if (item.weight !== null) expect(Number.isFinite(item.weight)).toBe(true);
      }
    }
  });
});
