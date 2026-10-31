import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEEK_PLAN,
  isoWeekday,
  nextTrainingDay,
  normalizeWeekPlan,
  plannedDayFor,
  plannedWorkouts,
} from "../weekplan";

describe("isoWeekday", () => {
  it("считает понедельник первым, воскресенье седьмым", () => {
    expect(isoWeekday("2026-10-26")).toBe(1); // понедельник
    expect(isoWeekday("2026-10-31")).toBe(6); // суббота
    expect(isoWeekday("2026-11-01")).toBe(7); // воскресенье
  });

  it("не падает на битой дате", () => {
    expect(isoWeekday("не дата")).toBe(1);
  });
});

describe("normalizeWeekPlan", () => {
  it("битые и чужие значения превращает в отдых", () => {
    const plan = normalizeWeekPlan({ 1: "upper", 2: "что-то", 3: null, 4: 5 });
    expect(plan[1]).toBe("upper");
    expect(plan[2]).toBe("rest");
    expect(plan[3]).toBe("rest");
    expect(plan[4]).toBe("rest");
  });

  it("на пустом значении отдаёт заготовку", () => {
    expect(normalizeWeekPlan(undefined)).toEqual(DEFAULT_WEEK_PLAN);
    expect(normalizeWeekPlan("мусор")).toEqual(DEFAULT_WEEK_PLAN);
  });

  it("всегда содержит все семь дней", () => {
    const plan = normalizeWeekPlan({ 1: "lower" });
    for (let day = 1; day <= 7; day += 1) expect(plan[day]).toBeDefined();
  });
});

describe("plannedDayFor / nextTrainingDay", () => {
  const plan = normalizeWeekPlan({ 1: "upper", 3: "lower", 5: "full" });

  it("берёт день недели из плана", () => {
    expect(plannedDayFor(plan, "2026-10-26")).toBe("upper"); // пн
    expect(plannedDayFor(plan, "2026-10-27")).toBe("rest"); // вт
    expect(plannedDayFor(plan, "2026-10-30")).toBe("full"); // пт
  });

  it("находит ближайшую тренировку, включая сегодня", () => {
    expect(nextTrainingDay(plan, "2026-10-26")).toEqual({
      dateIso: "2026-10-26",
      dayType: "upper",
      inDays: 0,
    });
    expect(nextTrainingDay(plan, "2026-10-27")).toEqual({
      dateIso: "2026-10-28",
      dayType: "lower",
      inDays: 1,
    });
  });

  it("переходит через воскресенье на следующую неделю", () => {
    const next = nextTrainingDay(plan, "2026-10-31"); // сб → пн 2 ноября
    expect(next?.dateIso).toBe("2026-11-02");
    expect(next?.dayType).toBe("upper");
    expect(next?.inDays).toBe(2);
  });

  it("если всё отдых — возвращает null", () => {
    const rest = normalizeWeekPlan({ 1: "rest", 2: "rest", 3: "rest", 4: "rest", 5: "rest", 6: "rest", 7: "rest" });
    expect(nextTrainingDay(rest, "2026-10-26")).toBeNull();
  });
});

describe("plannedWorkouts", () => {
  it("считает тренировочные дни", () => {
    expect(plannedWorkouts(DEFAULT_WEEK_PLAN)).toBe(3);
    expect(plannedWorkouts(normalizeWeekPlan({ 1: "rest" }))).toBe(0);
  });
});
