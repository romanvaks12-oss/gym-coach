import { describe, expect, it } from "vitest";
import { isConfigured, normalizeUrl, parseBodyRow, parseSetRow, parseWorkoutRow } from "../sync";
import { DEFAULT_SETTINGS } from "../../types";

const URL_OK = "https://script.google.com/macros/s/AKfycb-test/exec";

describe("разбор строк из Google Sheets", () => {
  const base = { id: "s1", workoutId: "w1", exerciseId: "bb-squat", rpe: 8 };
  it("тренировка: дата, готовность и updatedAt", () => {
    const row = parseWorkoutRow({
      id: "w1",
      date: "2026-10-26T00:00:00.000Z",
      readiness: 72.4,
      durationMin: "54",
      planId: "upper",
      createdAt: "2026-10-26T18:00:00.000Z",
    });
    expect(row).not.toBeNull();
    expect(row!.id).toBe("w1");
    expect(row!.date).toBe("2026-10-26");
    expect(row!.readiness).toBe(72.4);
    expect(row!.durationMin).toBe(54);
    expect(row!.updatedAt).toBe("2026-10-26T18:00:00.000Z");
    expect(row!.pendingSync).toBe(false);
  });

  it("тренировка: без id или даты — мусор, не сохраняем", () => {
    expect(parseWorkoutRow({ date: "2026-10-26" })).toBeNull();
    expect(parseWorkoutRow({ id: "w1", date: "26.10.2026" })).toBeNull();
    expect(parseWorkoutRow({ id: "w1", date: "" })).toBeNull();
    expect(parseWorkoutRow(null)).toBeNull();
    expect(parseWorkoutRow("строка")).toBeNull();
  });

  it("тренировка: готовность зажимается в 0–100", () => {
    const low = parseWorkoutRow({ id: "a", date: "2026-10-26", readiness: -30 });
    const high = parseWorkoutRow({ id: "b", date: "2026-10-26", readiness: 500 });
    expect(low!.readiness).toBe(0);
    expect(high!.readiness).toBe(100);
  });

  it("подход: запятая как разделитель, TRUE как разминка", () => {
    const set = parseSetRow({
      id: "s1",
      workoutId: "w1",
      exerciseId: "bb-bench-press",
      setIndex: 2,
      weight: "82,5",
      reps: "8",
      rpe: 8,
      isWarmup: "TRUE",
    });
    expect(set).not.toBeNull();
    expect(set!.weight).toBe(82.5);
    expect(set!.reps).toBe(8);
    expect(set!.isWarmup).toBe(true);
    expect(set!.setIndex).toBe(2);
  });

  it("подход: нереальные вес и повторы отбрасываются", () => {
    expect(parseSetRow({ ...base, weight: 500, reps: 5 })).toBeNull();
    expect(parseSetRow({ ...base, weight: -20, reps: 5 })).toBeNull();
    expect(parseSetRow({ ...base, weight: 60, reps: 0 })).toBeNull();
    expect(parseSetRow({ ...base, weight: 60, reps: 5000 })).toBeNull();
    expect(parseSetRow({ ...base, weight: Number.NaN, reps: 5 })).toBeNull();
    expect(parseSetRow({ ...base, weight: "", reps: 5 })).toBeNull();
  });

  it("подход: вес 0 — это своё тело, а не ошибка", () => {
    const set = parseSetRow({ ...base, weight: 0, reps: 8 });
    expect(set).not.toBeNull();
    expect(set!.weight).toBe(0);
  });

  it("подход: пустой RPE становится 8, номер подхода — минимум 1", () => {
    const set = parseSetRow({
      id: "s1",
      workoutId: "w1",
      exerciseId: "bb-squat",
      weight: 60,
      reps: 5,
      rpe: "",
      setIndex: 0,
    });
    expect(set!.rpe).toBe(8);
    expect(set!.setIndex).toBe(1);
  });

  it("вес тела: только правдоподобные значения, id достраивается", () => {
    const metric = parseBodyRow({ date: "2026-10-26", weightKg: "78,4" });
    expect(metric).not.toBeNull();
    expect(metric!.weightKg).toBe(78.4);
    expect(metric!.id).toBe("2026-10-26-weight");
    expect(parseBodyRow({ date: "2026-10-26", weightKg: 1123 })).toBeNull();
    expect(parseBodyRow({ date: "2026-10-26", weightKg: 5 })).toBeNull();
    expect(parseBodyRow({ date: "плохо", weightKg: 78 })).toBeNull();
  });
});

describe("настройки синка", () => {
  it("URL без хвостового слэша", () => {
    expect(normalizeUrl(`  ${URL_OK}//  `)).toBe(URL_OK);
    expect(normalizeUrl("")).toBe("");
  });

  it("конфигурация требует https, /exec и токен", () => {
    expect(isConfigured({ ...DEFAULT_SETTINGS, syncUrl: URL_OK, syncToken: "abc" })).toBe(true);
    expect(isConfigured({ ...DEFAULT_SETTINGS, syncUrl: URL_OK, syncToken: "  " })).toBe(false);
    expect(isConfigured({ ...DEFAULT_SETTINGS, syncUrl: "http://example.com", syncToken: "abc" })).toBe(
      false,
    );
    expect(
      isConfigured({ ...DEFAULT_SETTINGS, syncUrl: `${URL_OK.replace("/exec", "")}`, syncToken: "a" }),
    ).toBe(false);
  });
});
