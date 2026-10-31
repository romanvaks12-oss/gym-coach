/**
 * Недельный планировщик: какой тип тренировки в какой день недели.
 *
 * Чистые функции, без DOM и сети. Дни — ISO: понедельник = 1 … воскресенье = 7.
 * Планировщик ничего не навязывает: план всё равно пересобирается по готовности
 * и восстановлению, но выбранный день идёт первым в списке вариантов.
 */
import type { DayType } from "./plan";
import { DAY_TYPE_LABELS } from "./plan";

export type PlannedDay = DayType | "rest";

/** Ключи 1..7 (пн..вс) — так же, как ISO-день недели */
export type WeekPlan = Record<number, PlannedDay>;

export const WEEKDAY_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

export const PLANNED_DAY_LABELS: Record<PlannedDay, string> = {
  ...DAY_TYPE_LABELS,
  rest: "Отдых",
};

/** Заготовка для тех, кто ещё не открывал планировщик: три тренировки в неделю */
export const DEFAULT_WEEK_PLAN: WeekPlan = {
  1: "upper",
  2: "rest",
  3: "lower",
  4: "rest",
  5: "full",
  6: "rest",
  7: "rest",
};

const VALID: PlannedDay[] = ["full", "upper", "lower", "rest"];

function isPlannedDay(value: unknown): value is PlannedDay {
  return typeof value === "string" && (VALID as string[]).includes(value);
}

/** Терпимый разбор: что не похоже на день плана — считаем отдыхом */
export function normalizeWeekPlan(raw: unknown): WeekPlan {
  const out: WeekPlan = { ...DEFAULT_WEEK_PLAN };
  if (!raw || typeof raw !== "object") return out;
  const source = raw as Record<string, unknown>;
  for (let day = 1; day <= 7; day += 1) {
    const value = source[String(day)];
    out[day] = isPlannedDay(value) ? value : "rest";
  }
  return out;
}

/** ISO-день недели: понедельник = 1, воскресенье = 7. Битая дата → 1 */
export function isoWeekday(dateIso: string): number {
  const date = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 1;
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

/** Что запланировано на эту дату */
export function plannedDayFor(plan: WeekPlan, dateIso: string): PlannedDay {
  return plan[isoWeekday(dateIso)] ?? "rest";
}

function addDays(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateIso;
  date.setDate(date.getDate() + days);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Ближайший день с тренировкой: сегодня (если не отдых) или вперёд по неделе */
export function nextTrainingDay(
  plan: WeekPlan,
  dateIso: string,
): { dateIso: string; dayType: DayType; inDays: number } | null {
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(dateIso, offset);
    const planned = plannedDayFor(plan, date);
    if (planned !== "rest") return { dateIso: date, dayType: planned, inDays: offset };
  }
  return null;
}

/** Сколько тренировок в неделю по плану — для подписи «3 тренировки в неделю» */
export function plannedWorkouts(plan: WeekPlan): number {
  return Object.values(plan).filter((day) => day !== "rest").length;
}
