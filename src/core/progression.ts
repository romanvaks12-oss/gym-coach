import type { Equipment } from "../types";

export interface PerformedSet {
  exerciseId: string;
  weight: number;
  reps: number;
  rpe: number;
  date: string;
}

export interface Target {
  /** null — вес подбирает пользователь (первый раз) */
  weight: number | null;
  repLow: number;
  repHigh: number;
  /** Сколько повторов целиться в первом подходе */
  repTarget: number;
  repHighTarget: number;
  reason: string;
}

const STEP: Record<Equipment, number> = {
  barbell: 2.5,
  smith: 2.5,
  machine: 2.5,
  cable: 1.25,
  dumbbell: 1,
  bodyweight: 0,
};

export const roundToStep = (value: number, step: number): number => {
  if (step <= 0) return Math.round(value);
  return Math.round(value / step) * step;
};

/**
 * Двойная прогрессия.
 * - верх диапазона при RPE <= 8 → +2.5 % веса, повторы в низ диапазона;
 * - RPE 10 → вес не поднимаем;
 * - два раза не добрал низ диапазона → -5 %.
 */
export function nextTarget(params: {
  equipment: Equipment;
  repLow: number;
  repHigh: number;
  /** Все рабочие подходы упражнения в порядке выполнения, последние — последними */
  lastSets: PerformedSet[];
  /** Сколько тренировок подряд не добирали низ диапазона */
  missedSessions?: number;
}): Target {
  const { equipment, repLow, repHigh, lastSets } = params;
  const missed = params.missedSessions ?? 0;

  if (lastSets.length === 0) {
    return {
      weight: null,
      repLow,
      repHigh,
      repTarget: repHigh,
      repHighTarget: repHigh,
      reason: "Первый раз: подбери вес, с которым сделаешь верх диапазона на RPE 7",
    };
  }

  const best = lastSets.reduce((a, b) => (b.weight * b.reps > a.weight * a.reps ? b : a));
  const weight = best.weight;
  const reps = best.reps;
  const maxRpe = Math.max(...lastSets.map((s) => s.rpe));
  const step = STEP[equipment];

  if (missed >= 2) {
    const next = roundToStep(Math.max(weight * 0.95, 0), step);
    return {
      weight: next,
      repLow,
      repHigh,
      repTarget: repLow,
      repHighTarget: repHigh,
      reason: `Шаг назад: два раза не добрал ${repLow} повторов — снимаем 5 %`,
    };
  }

  if (maxRpe >= 10) {
    return {
      weight,
      repLow,
      repHigh,
      repTarget: Math.min(repHigh, reps + 1),
      repHighTarget: repHigh,
      reason: "Был отказной подход (10/10) — вес не поднимаем, добираем повторы",
    };
  }

  if (reps >= repHigh && maxRpe <= 8) {
    const next = roundToStep(weight * 1.025, step);
    return {
      weight: next,
      repLow,
      repHigh,
      repTarget: repLow,
      repHighTarget: repHigh,
      reason: `Верх диапазона при RPE ${maxRpe} → +2,5 % веса, повторы с ${repLow}`,
    };
  }

  return {
    weight,
    repLow,
    repHigh,
    repTarget: Math.min(repHigh, reps + 1),
    repHighTarget: repHigh,
    reason: `Вес тот же, добираем повторы: цель ${Math.min(repHigh, reps + 1)}–${repHigh}`,
  };
}
