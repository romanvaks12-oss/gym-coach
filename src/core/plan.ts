import type { Brief, Exercise, MuscleGroup, Pattern } from "../types";
import { MUSCLE_LABELS } from "../domain/catalog";
import { nextTarget, type PerformedSet } from "./progression";
import { saneBodyWeightKg } from "./validation";
import type { ReadinessResult } from "./readiness";

export type DayType = "full" | "upper" | "lower";

/** Названия типов дня — одни и те же в плане, планировщике недели и истории */
export const DAY_TYPE_LABELS: Record<DayType, string> = {
  full: "Всё тело",
  upper: "Верх",
  lower: "Низ",
};

export interface PlanItem {
  exerciseId: string;
  name: string;
  sets: number;
  repLow: number;
  repHigh: number;
  /** Цель по повторам (или секундам) в первом подходе */
  repTarget: number;
  weight: number | null;
  measure: "reps" | "time";
  usesBodyweight: boolean;
  targetRpe: number;
  restSec: number;
  reason: string;
}

export interface PlanOption {
  id: string;
  dayType: DayType;
  title: string;
  focus: MuscleGroup[];
  reason: string;
  items: PlanItem[];
  estimatedMin: number;
  volumeMultiplier: number;
  /** Вес тела на сегодня — нужен упражнениям с собственным весом */
  bodyWeightKg: number | null;
}

interface Slot {
  muscles: MuscleGroup[];
  /** Предпочтительный тип движения: чтобы день верха не начинался со становой */
  patterns?: Pattern[];
}

const TEMPLATES: Record<DayType, { title: string; focus: MuscleGroup[]; slots: Slot[] }> = {
  full: {
    title: DAY_TYPE_LABELS.full,
    focus: ["quads", "chest", "back", "shoulders", "hamstrings", "core"],
    slots: [
      { muscles: ["quads"], patterns: ["squat"] },
      { muscles: ["chest"], patterns: ["push"] },
      { muscles: ["back", "lats"], patterns: ["pull"] },
      { muscles: ["shoulders"], patterns: ["push"] },
      { muscles: ["hamstrings", "glutes"], patterns: ["hinge"] },
      { muscles: ["core"], patterns: ["core"] },
      { muscles: ["biceps", "triceps"], patterns: ["isolation"] },
    ],
  },
  upper: {
    title: DAY_TYPE_LABELS.upper,
    focus: ["chest", "back", "lats", "shoulders", "biceps", "triceps"],
    slots: [
      { muscles: ["chest"], patterns: ["push"] },
      { muscles: ["back", "lats"], patterns: ["pull"] },
      { muscles: ["shoulders"], patterns: ["push"] },
      { muscles: ["back", "lats"], patterns: ["pull"] },
      { muscles: ["triceps"], patterns: ["isolation"] },
      { muscles: ["biceps"], patterns: ["isolation"] },
      { muscles: ["core"], patterns: ["core"] },
    ],
  },
  lower: {
    title: DAY_TYPE_LABELS.lower,
    focus: ["quads", "hamstrings", "glutes", "calves", "core"],
    slots: [
      { muscles: ["quads"], patterns: ["squat"] },
      { muscles: ["hamstrings", "glutes"], patterns: ["hinge"] },
      { muscles: ["quads", "glutes"], patterns: ["lunge"] },
      { muscles: ["hamstrings"], patterns: ["isolation"] },
      { muscles: ["calves"], patterns: ["isolation"] },
      { muscles: ["core"], patterns: ["core"] },
      { muscles: ["glutes"], patterns: ["isolation"] },
    ],
  },
};

const NEXT_DAY: Record<DayType, DayType> = { upper: "lower", lower: "upper", full: "upper" };

/** Крупные группы восстанавливаются дольше: им нужно 2 дня отдыха, мелким — 1 */
const LARGE_GROUPS: MuscleGroup[] = [
  "quads",
  "hamstrings",
  "glutes",
  "back",
  "lats",
  "chest",
  "shoulders",
];

const MS_PER_DAY = 86_400_000;

export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00`);
  const b = Date.parse(`${toIso}T00:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / MS_PER_DAY));
}

function exerciseById(exercises: Exercise[], id: string): Exercise | undefined {
  return exercises.find((e) => e.id === id);
}

export function daysUntilRecovered(muscle: MuscleGroup): number {
  return LARGE_GROUPS.includes(muscle) ? 2 : 1;
}

/** Сколько дней назад последний раз грузили эту группу (null — не грузили вовсе) */
export function daysSinceMuscle(
  history: PerformedSet[],
  exercises: Exercise[],
  muscle: MuscleGroup,
  todayIso: string,
): number | null {
  let latest: string | null = null;
  for (const set of history) {
    const ex = exerciseById(exercises, set.exerciseId);
    if (!ex || ex.primaryMuscle !== muscle) continue;
    if (!latest || set.date > latest) latest = set.date;
  }
  return latest ? daysBetween(latest, todayIso) : null;
}

/** Рабочие подходы на группу за последние 7 дней */
export function weeklySets(
  history: PerformedSet[],
  exercises: Exercise[],
  muscle: MuscleGroup,
  todayIso: string,
): number {
  return history.filter((set) => {
    const ex = exerciseById(exercises, set.exerciseId);
    return Boolean(ex) && ex!.primaryMuscle === muscle && daysBetween(set.date, todayIso) < 7;
  }).length;
}

function lastSessionSets(history: PerformedSet[], exerciseId: string): PerformedSet[] {
  const own = history.filter((h) => h.exerciseId === exerciseId);
  if (own.length === 0) return [];
  const latest = own.reduce((acc, s) => (s.date > acc ? s.date : acc), own[0].date);
  return own.filter((s) => s.date === latest).sort((a, b) => a.reps - b.reps);
}

function slotsForMinutes(minutes: Brief["minutes"]): number {
  if (minutes <= 30) return 4;
  if (minutes <= 45) return 5;
  if (minutes <= 60) return 6;
  return 7;
}

/**
 * Рекомендация по одному упражнению: подходы, диапазон повторов, вес и RPE.
 *
 * Используется и при сборке плана, и когда пользователь добавляет упражнение
 * в конце тренировки — правила должны совпадать, иначе «добавка» выпадает из логики.
 */
export function buildPlanItem({
  exercise: ex,
  history,
  volumeMultiplier = 1,
  band = "high",
}: {
  exercise: Exercise;
  history: PerformedSet[];
  volumeMultiplier?: number;
  band?: ReadinessResult["band"];
}): PlanItem {
  const lastSets = lastSessionSets(history, ex.id);
  const isTime = ex.measure === "time";
  const isBodyweight = Boolean(ex.usesBodyweight);
  /** Подтягивания: 2–3 повтора за подход и не больше 3 подходов */
  const isPullUp = ex.id === "bodyweight-pull-up";

  let repLow = isTime ? 30 : ex.pattern === "core" ? 10 : ex.isCompound ? 6 : 10;
  let repHigh = isTime ? 45 : ex.pattern === "core" ? 15 : ex.isCompound ? 10 : 15;

  if (isPullUp) {
    const best = lastSets.length > 0 ? Math.max(...lastSets.map((s) => s.reps)) : 2;
    repLow = Math.max(2, Math.min(best, 5));
    repHigh = Math.min(10, repLow + 1);
  } else if (isBodyweight && lastSets.length > 0) {
    // Свой вес: диапазон берём от фактического результата, а не «10–15»
    const best = Math.max(...lastSets.map((s) => s.reps));
    repLow = Math.max(1, best);
    repHigh = Math.min(best + 3, 12);
  } else if (isBodyweight) {
    repLow = 1;
    repHigh = 5;
  }

  const baseSets = isTime ? 3 : isBodyweight ? 3 : ex.isCompound ? 4 : 3;
  const topSets = isPullUp ? 3 : 4;
  const sets = Math.min(topSets, Math.max(2, Math.round(baseSets * volumeMultiplier)));
  const target = nextTarget({
    equipment: ex.equipment,
    repLow,
    repHigh,
    measure: ex.measure,
    usesBodyweight: ex.usesBodyweight,
    lastSets,
  });
  const restSec = isTime ? 60 : ex.isCompound ? 120 : 75;

  return {
    exerciseId: ex.id,
    name: ex.name,
    sets,
    repLow: target.repLow,
    repHigh: target.repHigh,
    repTarget: target.repTarget,
    weight: target.weight,
    measure: ex.measure ?? "reps",
    usesBodyweight: isBodyweight,
    targetRpe: band === "low" ? 7 : 8,
    restSec,
    reason: target.reason,
  };
}

interface RecoveryContext {
  /** Дни с последней нагрузки; null — не грузили */
  days: Map<MuscleGroup, number | null>;
  ready: (muscle: MuscleGroup) => boolean;
  reasonFor: (muscle: MuscleGroup) => string;
}

function buildRecovery(
  history: PerformedSet[],
  exercises: Exercise[],
  readiness: ReadinessResult,
  todayIso: string,
): RecoveryContext {
  const muscles = Array.from(new Set(exercises.map((e) => e.primaryMuscle)));
  const days = new Map<MuscleGroup, number | null>();
  for (const muscle of muscles) {
    days.set(muscle, daysSinceMuscle(history, exercises, muscle, todayIso));
  }

  const ready = (muscle: MuscleGroup): boolean => {
    if (readiness.blockedGroups.includes(muscle)) return false;
    const d = days.get(muscle);
    if (d === null || d === undefined) return true;
    return d >= daysUntilRecovered(muscle);
  };

  const reasonFor = (muscle: MuscleGroup): string => {
    if (readiness.blockedGroups.includes(muscle)) return `${MUSCLE_LABELS[muscle]}: болит, не грузим`;
    const d = days.get(muscle);
    if (d === null || d === undefined) return `${MUSCLE_LABELS[muscle]}: нет истории, можно`;
    if (d < daysUntilRecovered(muscle))
      return `${MUSCLE_LABELS[muscle]}: ${d} дн. назад — не восстановилась`;
    return `${MUSCLE_LABELS[muscle]}: ${d} дн. отдыха`;
  };

  return { days, ready, reasonFor };
}

function scoreDay(
  dayType: DayType,
  recovery: RecoveryContext,
  readiness: ReadinessResult,
  available: Set<MuscleGroup>,
): { score: number; reason: string; usable: number } {
  // Считаем только те группы, под которые в каталоге есть упражнения
  const focus = TEMPLATES[dayType].focus.filter((muscle) => available.has(muscle));
  if (focus.length === 0) return { score: 0, reason: "", usable: 0 };
  let score = 0;
  let usable = 0;
  const readyLabels: string[] = [];
  const skippedLabels: string[] = [];

  for (const muscle of focus) {
    const d = recovery.days.get(muscle);
    if (recovery.ready(muscle)) {
      usable += 1;
      const fresh = d === null || d === undefined ? 6 : Math.min(d, 7);
      score += fresh * 1.1;
      if (d !== null && d !== undefined) readyLabels.push(`${MUSCLE_LABELS[muscle]} ${d} дн.`);
    } else {
      score -= 6;
      skippedLabels.push(recovery.reasonFor(muscle));
    }
  }

  const parts: string[] = [];
  if (readyLabels.length > 0) parts.push(`готовы: ${readyLabels.slice(0, 3).join(", ")}`);
  if (readyLabels.length === 0 && usable > 0) parts.push("истории нет — все группы свежие");
  if (skippedLabels.length > 0) parts.push(`пропуск — ${skippedLabels.slice(0, 2).join("; ")}`);
  if (readiness.volumeMultiplier < 1) {
    parts.push(`объём −${Math.round((1 - readiness.volumeMultiplier) * 100)} %`);
  }

  return { score: score / focus.length, reason: parts.join("; "), usable };
}

function pickExercise(
  slot: Slot,
  exercises: Exercise[],
  used: Set<string>,
  recovery: RecoveryContext,
): Exercise | undefined {
  const base = exercises.filter(
    (ex) => slot.muscles.includes(ex.primaryMuscle) && !used.has(ex.id) && recovery.ready(ex.primaryMuscle),
  );
  const preferred = slot.patterns ? base.filter((ex) => slot.patterns!.includes(ex.pattern)) : base;
  const pool = preferred.length > 0 ? preferred : base;
  if (pool.length === 0) return undefined;
  return [...pool].sort((a, b) => Number(b.isCompound) - Number(a.isCompound))[0];
}

export function buildPlans(params: {
  brief: Brief;
  readiness: ReadinessResult;
  history: PerformedSet[];
  exercises: Exercise[];
  todayIso: string;
  /** Тип последней тренировки — чтобы не ставить верх два раза подряд */
  lastDayType?: DayType | null;
  /** Тип дня из недельного планировщика — он идёт первым, если не противоречит восстановлению */
  preferredDayType?: DayType | null;
}): PlanOption[] {
  const { brief, readiness, history, exercises, todayIso, lastDayType, preferredDayType } = params;
  const recovery = buildRecovery(history, exercises, readiness, todayIso);
  const available = new Set(exercises.map((e) => e.primaryMuscle));

  const ranked = (["full", "upper", "lower"] as DayType[])
    .map((dayType) => {
      const scored = scoreDay(dayType, recovery, readiness, available);
      const rotationBonus = lastDayType && dayType === NEXT_DAY[lastDayType] ? 4 : 0;
      // Когда история уже есть, сплит важнее «всего тела»: full — запасной вариант
      const splitBonus = dayType === "full" && history.length > 0 ? -1.5 : 0;
      // Планировщик недели главнее ротации, но не главнее восстановления:
      // тип дня, который сейчас нельзя, просто не попадёт в список (usable < 2)
      const planBonus = preferredDayType === dayType ? 100 : 0;
      return { dayType, ...scored, total: scored.score + rotationBonus + splitBonus + planBonus };
    })
    .filter((candidate) => candidate.usable >= 2)
    .sort((a, b) => b.total - a.total);

  const historyEmpty = history.length === 0;
  const ordered =
    historyEmpty && ranked.length > 0 && !preferredDayType
      ? [{ ...ranked[0], dayType: "full" as DayType }, ...ranked.filter((r) => r.dayType !== "full")]
      : ranked;

  if (ordered.length === 0) return [];

  const limit = readiness.band === "low" ? 1 : 2;
  const maxItems = slotsForMinutes(brief.minutes);

  return ordered.slice(0, limit).map((candidate) => {
    const template = TEMPLATES[candidate.dayType];
    const used = new Set<string>();
    const items: PlanItem[] = [];

    for (const slot of template.slots) {
      if (items.length >= maxItems) break;
      const ex = pickExercise(slot, exercises, used, recovery);
      if (!ex) continue;
      used.add(ex.id);

      items.push(
        buildPlanItem({
          exercise: ex,
          history,
          volumeMultiplier: readiness.volumeMultiplier,
          band: readiness.band,
        }),
      );
    }

    const estimatedMin = Math.round(
      items.reduce((sum, item) => sum + item.sets * ((item.restSec + 45) / 60), 0),
    );

    const reason =
      historyEmpty && candidate.dayType === "full"
        ? "Нет истории: начинаем с базы на всё тело, вес подбираем по ощущениям (RPE 7)"
        : candidate.reason;

    return {
      id: `${candidate.dayType}-${todayIso}`,
      dayType: candidate.dayType,
      title: template.title,
      focus: template.focus,
      reason,
      items,
      estimatedMin,
      volumeMultiplier: readiness.volumeMultiplier,
      bodyWeightKg: saneBodyWeightKg(brief.bodyWeightKg),
    };
  });
}
