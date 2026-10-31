/** Хранилище недельного плана: одна запись в meta, без миграций схемы. */
import { db } from "./db";
import { normalizeWeekPlan, type WeekPlan } from "../core/weekplan";

const WEEK_PLAN_KEY = "weekPlan";

export async function loadWeekPlan(): Promise<WeekPlan> {
  const raw = await db.get<unknown>("meta", WEEK_PLAN_KEY);
  return normalizeWeekPlan(raw);
}

export async function saveWeekPlan(plan: WeekPlan): Promise<void> {
  await db.putKey("meta", WEEK_PLAN_KEY, normalizeWeekPlan(plan));
}
