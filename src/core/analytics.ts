/**
 * Аналитика по локальным данным: тоннаж, оценка 1ПМ (Эпли), недельные срезы,
 * тренд, личные рекорды, объём по группам мышц, вес тела.
 *
 * Только чистые функции: без DOM, сети и IndexedDB. Всё, что показывает UI,
 * считается здесь и покрывается тестами.
 */
import type { BodyMetric, Exercise, MuscleGroup } from "../types";

/** Минимум полей, который нужен от подхода и тренировки (SetLog/Workout подходят). */
export interface SetRecord {
  workoutId: string;
  exerciseId: string;
  weight: number;
  reps: number;
  rpe: number;
  isWarmup?: boolean;
}

export interface WorkoutRecord {
  id: string;
  date: string;
}

const DAY_MS = 86_400_000;
/** Дальше 15 повторов формула Эпли врёт — оценку не даём. */
const MAX_E1RM_REPS = 15;

const round1 = (value: number) => Math.round(value * 10) / 10;

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const parseIso = (iso: string): [number, number, number] | null => {
  const parts = iso.split("-").map(Number);
  if (parts.length !== 3 || parts.some((p) => !Number.isInteger(p))) return null;
  const [y, m, d] = parts;
  return [y, m, d];
};

/** Понедельник недели, в которую попадает дата (локальный календарь, без TZ-сдвигов). */
export function weekStart(iso: string): string {
  const parsed = parseIso(iso);
  if (!parsed) return iso;
  const [y, m, d] = parsed;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dt.getTime())) return iso;
  const shift = (dt.getUTCDay() + 6) % 7; // 0 = понедельник
  return new Date(dt.getTime() - shift * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const parsed = parseIso(iso);
  if (!parsed) return iso;
  const [y, m, d] = parsed;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dt.getTime())) return iso;
  return new Date(dt.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetweenDates(fromIso: string, toIso: string): number | null {
  const from = parseIso(fromIso);
  const to = parseIso(toIso);
  if (!from || !to) return null;
  const a = Date.UTC(from[0], from[1] - 1, from[2]);
  const b = Date.UTC(to[0], to[1] - 1, to[2]);
  return Math.round((b - a) / DAY_MS);
}

/** «26.10» — короткая подпись недели. */
export function dayMonth(iso: string): string {
  const parsed = parseIso(iso);
  if (!parsed) return iso;
  return `${parsed[2]}.${String(parsed[1]).padStart(2, "0")}`;
}

/** Оценка 1ПМ по Эпли. null — если оценивать бессмысленно (свой вес, много повторов). */
export function epley1rm(weightKg: number, reps: number): number | null {
  if (!finite(weightKg) || weightKg <= 0) return null;
  if (!finite(reps) || reps < 1 || reps > MAX_E1RM_REPS) return null;
  if (reps === 1) return round1(weightKg);
  return round1(weightKg * (1 + reps / 30));
}

/** Тоннаж одного подхода; разминочные и мусорные значения не считаем. */
export function setTonnage(set: SetRecord): number {
  if (set.isWarmup) return 0;
  if (!finite(set.weight) || !finite(set.reps)) return 0;
  if (set.weight <= 0 || set.reps <= 0) return 0;
  return set.weight * set.reps;
}

export function totalTonnage(sets: SetRecord[]): number {
  return Math.round(sets.reduce((sum, set) => sum + setTonnage(set), 0));
}

const usableRpe = (rpe: number): number | null =>
  finite(rpe) && rpe >= 1 && rpe <= 10 ? rpe : null;

export interface WeekSummary {
  weekStart: string;
  /** Короткая подпись для графика: 26.10 */
  label: string;
  workouts: number;
  sets: number;
  tonnage: number;
  /** Средний RPE недели, null если подходов не было */
  avgRpe: number | null;
}

/**
 * Недельные срезы за последние `weeks` недель, включая пустые недели (нули):
 * график не должен «схлопывать» пропуски.
 */
export function weeklySummaries(params: {
  sets: SetRecord[];
  workouts: WorkoutRecord[];
  todayIso: string;
  weeks?: number;
}): WeekSummary[] {
  const { sets, workouts, todayIso } = params;
  const weeks = Math.max(1, Math.floor(params.weeks ?? 8));

  const current = weekStart(todayIso);
  const starts: string[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) starts.push(addDays(current, -7 * i));

  const buckets = new Map<
    string,
    { workouts: Set<string>; sets: number; tonnage: number; rpeSum: number; rpeCount: number }
  >();
  for (const start of starts) {
    buckets.set(start, { workouts: new Set(), sets: 0, tonnage: 0, rpeSum: 0, rpeCount: 0 });
  }

  for (const workout of workouts) {
    const bucket = buckets.get(weekStart(workout.date));
    if (bucket) bucket.workouts.add(workout.id);
  }

  const dateById = new Map(workouts.map((w) => [w.id, w.date]));
  for (const set of sets) {
    const date = dateById.get(set.workoutId);
    if (!date) continue;
    const bucket = buckets.get(weekStart(date));
    if (!bucket) continue;
    const tonnage = setTonnage(set);
    if (tonnage === 0) continue;
    bucket.sets += 1;
    bucket.tonnage += tonnage;
    const rpe = usableRpe(set.rpe);
    if (rpe !== null) {
      bucket.rpeSum += rpe;
      bucket.rpeCount += 1;
    }
  }

  return starts.map((start) => {
    const bucket = buckets.get(start)!;
    return {
      weekStart: start,
      label: dayMonth(start),
      workouts: bucket.workouts.size,
      sets: bucket.sets,
      tonnage: Math.round(bucket.tonnage),
      avgRpe: bucket.rpeCount === 0 ? null : round1(bucket.rpeSum / bucket.rpeCount),
    };
  });
}

export interface E1rmPoint {
  weekStart: string;
  label: string;
  value: number;
}

/** Лучшая оценка 1ПМ за неделю — по неделям, где упражнение делали. */
export function e1rmSeries(params: {
  sets: SetRecord[];
  workouts: WorkoutRecord[];
  exerciseId: string;
  todayIso: string;
  weeks?: number;
}): E1rmPoint[] {
  const { sets, workouts, exerciseId, todayIso } = params;
  const weeks = Math.max(1, Math.floor(params.weeks ?? 8));

  const current = weekStart(todayIso);
  const first = addDays(current, -7 * (weeks - 1));
  const dateById = new Map(workouts.map((w) => [w.id, w.date]));
  const best = new Map<string, number>();

  for (const set of sets) {
    if (set.exerciseId !== exerciseId || set.isWarmup) continue;
    const date = dateById.get(set.workoutId);
    if (!date || date < first) continue;
    const estimate = epley1rm(set.weight, set.reps);
    if (estimate === null) continue;
    const week = weekStart(date);
    best.set(week, Math.max(best.get(week) ?? 0, estimate));
  }

  return [...best.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([week, value]) => ({ weekStart: week, label: dayMonth(week), value }));
}

export type TrendKind = "progress" | "plateau" | "regress" | "unknown";

export interface TrendResult {
  kind: TrendKind;
  /** Изменение в процентах между двумя половинами окна, null если мало данных */
  changePct: number | null;
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

/**
 * Тренд по недельным значениям: медиана последних 2 недель против предыдущих 2.
 * Меньше 2 % — плато, иначе рост или откат. Нужно минимум 4 недели данных.
 */
export function trendOf(values: number[]): TrendResult {
  const clean = values.filter((v) => finite(v) && v > 0);
  if (clean.length < 4) return { kind: "unknown", changePct: null };

  const window = clean.slice(-4);
  const previous = median(window.slice(0, 2));
  const recent = median(window.slice(2));
  if (previous <= 0) return { kind: "unknown", changePct: null };

  const changePct = round1(((recent - previous) / previous) * 100);
  if (Math.abs(changePct) < 2) return { kind: "plateau", changePct };
  return { kind: changePct > 0 ? "progress" : "regress", changePct };
}

export interface PersonalBest {
  exerciseId: string;
  /** Оценка 1ПМ, кг */
  e1rm: number;
  weight: number;
  reps: number;
  date: string;
  /** Рекорд поставлен в последние `days` дней */
  recent: boolean;
}

/** Лучшая оценка 1ПМ по каждому упражнению за всё время. */
export function personalBests(params: {
  sets: SetRecord[];
  workouts: WorkoutRecord[];
  todayIso: string;
  days?: number;
}): PersonalBest[] {
  const { sets, workouts, todayIso } = params;
  const days = Math.max(1, Math.floor(params.days ?? 14));
  const dateById = new Map(workouts.map((w) => [w.id, w.date]));
  const best = new Map<string, PersonalBest>();

  for (const set of sets) {
    if (set.isWarmup) continue;
    const date = dateById.get(set.workoutId);
    if (!date) continue;
    const estimate = epley1rm(set.weight, set.reps);
    if (estimate === null) continue;
    const known = best.get(set.exerciseId);
    if (known && known.e1rm >= estimate) continue;
    const diff = daysBetweenDates(date, todayIso);
    best.set(set.exerciseId, {
      exerciseId: set.exerciseId,
      e1rm: estimate,
      weight: set.weight,
      reps: set.reps,
      date,
      recent: diff !== null && diff >= 0 && diff <= days,
    });
  }

  return [...best.values()].sort((a, b) => b.e1rm - a.e1rm);
}

export interface MuscleVolume {
  muscle: MuscleGroup;
  /** Подходы с учётом синергистов: основная группа 1, второстепенная 0,5 */
  sets: number;
  tonnage: number;
}

/** Объём по группам мышц за период: основная группа 1 подход, синергист 0,5. */
export function muscleVolume(params: {
  sets: SetRecord[];
  workouts: WorkoutRecord[];
  exercises: Exercise[];
  sinceIso: string;
}): MuscleVolume[] {
  const { sets, workouts, exercises, sinceIso } = params;
  const dateById = new Map(workouts.map((w) => [w.id, w.date]));
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const acc = new Map<MuscleGroup, { sets: number; tonnage: number }>();

  const add = (muscle: MuscleGroup, setsPart: number, tonnagePart: number) => {
    const current = acc.get(muscle) ?? { sets: 0, tonnage: 0 };
    current.sets += setsPart;
    current.tonnage += tonnagePart;
    acc.set(muscle, current);
  };

  for (const set of sets) {
    if (set.isWarmup) continue;
    const date = dateById.get(set.workoutId);
    if (!date || date < sinceIso) continue;
    const exercise = byId.get(set.exerciseId);
    if (!exercise) continue;
    const tonnage = setTonnage(set);
    if (tonnage === 0) continue;
    add(exercise.primaryMuscle, 1, tonnage);
    for (const muscle of exercise.secondaryMuscles) {
      add(muscle, 0.5, tonnage * 0.5);
    }
  }

  return [...acc.entries()]
    .map(([muscle, value]) => ({
      muscle,
      sets: round1(value.sets),
      tonnage: Math.round(value.tonnage),
    }))
    .sort((a, b) => b.sets - a.sets);
}

export interface BodyPoint {
  date: string;
  label: string;
  weightKg: number;
}

/** Вес тела по датам: только правдоподобные значения, без дублей в один день. */
export function bodySeries(body: BodyMetric[], todayIso: string, days = 120): BodyPoint[] {
  const cutoff = addDays(todayIso, -days);
  const byDate = new Map<string, number>();
  for (const metric of body) {
    if (!finite(metric.weightKg) || metric.weightKg < 20 || metric.weightKg > 400) continue;
    if (!parseIso(metric.date)) continue;
    byDate.set(metric.date, metric.weightKg);
  }
  return [...byDate.entries()]
    .filter(([date]) => date >= cutoff)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, weightKg]) => ({ date, label: dayMonth(date), weightKg }));
}

export interface BodyChange {
  from: number;
  to: number;
  deltaKg: number;
  weeks: number;
  perWeekKg: number | null;
}

/** Изменение веса тела между первым и последним замером. */
export function bodyChange(series: BodyPoint[]): BodyChange | null {
  if (series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const days = daysBetweenDates(first.date, last.date);
  const deltaKg = round1(last.weightKg - first.weightKg);
  const weeks = days === null || days <= 0 ? 0 : round1(days / 7);
  return {
    from: first.weightKg,
    to: last.weightKg,
    deltaKg,
    weeks,
    perWeekKg: days && days > 0 ? round1(deltaKg / (days / 7)) : null,
  };
}

/** «12 340» — тоннаж с пробелом между тысячами, без ложной точности. */
export function formatNumber(value: number): string {
  if (!finite(value)) return "—";
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
