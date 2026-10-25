import type { Brief, Exercise, MuscleGroup, Pattern } from "../types";
import { nextTarget, type PerformedSet } from "./progression";
import type { ReadinessResult } from "./readiness";

export type DayType = "full" | "upper" | "lower";

export interface PlanItem {
  exerciseId: string;
  name: string;
  sets: number;
  repLow: number;
  repHigh: number;
  /** Цель по повторам в первом подходе */
  repTarget: number;
  weight: number | null;
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
}

interface Slot {
  muscles: MuscleGroup[];
  /** Предпочтительный тип движения: чтобы день верха не начинался со становой */
  patterns?: Pattern[];
}

const TEMPLATES: Record<DayType, { title: string; focus: MuscleGroup[]; slots: Slot[] }> = {
  full: {
    title: "Всё тело",
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
    title: "Верх",
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
    title: "Низ",
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
    if (!ex) continue;
    if (ex.primaryMuscle !== muscle) continue;
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

function scoreDay(
  dayType: DayType,
  readiness: ReadinessResult,
  history: PerformedSet[],
  exercises: Exercise[],
  todayIso: string,
): { score: number; reason: string } {
  const focus = TEMPLATES[dayType].focus;
  let score = 0;
  let freshest: { muscle: MuscleGroup; days: number } | null = null;
  let sorest: { muscle: MuscleGroup; value: number } | null = null;

  for (const muscle of focus) {
    const days = daysSinceMuscle(history, exercises, muscle, todayIso);
    const soreness = readiness.blockedGroups.includes(muscle) ? 10 : 0;
    const fresh = days === null ? 5 : Math.min(days, 7);
    score += fresh * 1.1 - soreness * 2;
    if (!freshest || fresh > freshest.days) freshest = { muscle, days: fresh };
    if (!sorest || soreness > sorest.value) sorest = { muscle, value: soreness };
  }

  const parts: string[] = [];
  if (freshest) {
    parts.push(
      freshest.days >= 5
        ? `свежие мышцы: ${freshest.muscle} (${freshest.days} дн. отдыха)`
        : `последняя нагрузка недавно: ${freshest.muscle} ${freshest.days} дн. назад`,
    );
  }
  if (sorest && sorest.value >= 7) parts.push(`не грузим ${sorest.muscle} (боль ${sorest.value}/10)`);
  if (readiness.volumeMultiplier < 1) parts.push(`объём −${Math.round((1 - readiness.volumeMultiplier) * 100)} %`);

  return { score: score / focus.length, reason: parts.join("; ") };
}

function pickExercise(
  slot: Slot,
  exercises: Exercise[],
  used: Set<string>,
  blocked: MuscleGroup[],
): Exercise | undefined {
  const base = exercises.filter(
    (ex) =>
      slot.muscles.includes(ex.primaryMuscle) &&
      !used.has(ex.id) &&
      !blocked.includes(ex.primaryMuscle),
  );
  const preferred = slot.patterns ? base.filter((ex) => slot.patterns!.includes(ex.pattern)) : base;
  const pool = preferred.length > 0 ? preferred : base;
  if (pool.length === 0) return undefined;
  const sorted = [...pool].sort((a, b) => Number(b.isCompound) - Number(a.isCompound));
  return sorted[0];
}

export function buildPlans(params: {
  brief: Brief;
  readiness: ReadinessResult;
  history: PerformedSet[];
  exercises: Exercise[];
  todayIso: string;
}): PlanOption[] {
  const { brief, readiness, history, exercises, todayIso } = params;

  const ranked = (["full", "upper", "lower"] as DayType[])
    .map((dayType) => ({ dayType, ...scoreDay(dayType, readiness, history, exercises, todayIso) }))
    .sort((a, b) => b.score - a.score);

  const historyEmpty = history.length === 0;
  const ordered = historyEmpty
    ? [{ ...ranked[0], dayType: "full" as DayType }, ...ranked.filter((r) => r.dayType !== "full")]
    : ranked;

  const limit = readiness.band === "low" ? 1 : 2;
  const maxItems = slotsForMinutes(brief.minutes);

  return ordered.slice(0, limit).map((candidate) => {
    const template = TEMPLATES[candidate.dayType];
    const used = new Set<string>();
    const items: PlanItem[] = [];

    for (const slot of template.slots) {
      if (items.length >= maxItems) break;
      const ex = pickExercise(slot, exercises, used, readiness.blockedGroups);
      if (!ex) continue;
      used.add(ex.id);

      const repLow = ex.pattern === "core" ? 10 : ex.isCompound ? 6 : 10;
      const repHigh = ex.pattern === "core" ? 15 : ex.isCompound ? 10 : 15;
      const baseSets = ex.isCompound ? 4 : 3;
      const sets = Math.min(4, Math.max(2, Math.round(baseSets * readiness.volumeMultiplier)));
      const target = nextTarget({
        equipment: ex.equipment,
        repLow,
        repHigh,
        lastSets: lastSessionSets(history, ex.id),
      });
      const restSec = ex.isCompound ? 120 : 75;

      items.push({
        exerciseId: ex.id,
        name: ex.name,
        sets,
        repLow: target.repLow,
        repHigh: target.repHigh,
        repTarget: target.repTarget,
        weight: target.weight,
        targetRpe: readiness.band === "low" ? 7 : 8,
        restSec,
        reason: target.reason,
      });
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
    };
  });
}
