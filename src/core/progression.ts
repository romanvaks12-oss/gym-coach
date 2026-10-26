import type { Equipment, Measure } from "../types";

export interface PerformedSet {
  exerciseId: string;
  weight: number;
  reps: number;
  rpe: number;
  date: string;
}

export interface Target {
  /** null — вес подбирает пользователь (первый раз) или упражнение с собственным весом */
  weight: number | null;
  repLow: number;
  repHigh: number;
  /** Сколько повторов (или секунд) целиться в первом подходе */
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

const unit = (measure: Measure) => (measure === "time" ? "с" : "повторов");

/**
 * Двойная прогрессия для повторов, линейная для времени и собственного веса.
 * - верх диапазона при RPE <= 8 → +2.5 % веса (для времени +5 с, для своего веса +1 повтор);
 * - RPE 10 → вес не поднимаем;
 * - два раза не добрал низ диапазона → -5 %.
 */
export function nextTarget(params: {
  equipment: Equipment;
  repLow: number;
  repHigh: number;
  measure?: Measure;
  usesBodyweight?: boolean;
  /** Все рабочие подходы упражнения в порядке выполнения, последние — последними */
  lastSets: PerformedSet[];
  /** Сколько тренировок подряд не добирали низ диапазона */
  missedSessions?: number;
}): Target {
  const { equipment, repLow, repHigh, lastSets } = params;
  const measure: Measure = params.measure ?? "reps";
  const missed = params.missedSessions ?? 0;
  const word = unit(measure);
  const step = STEP[equipment] ?? 1;

  const firstTime = (): Target => ({
    weight: null,
    repLow,
    repHigh,
    repTarget: repHigh,
    repHighTarget: repHigh,
    reason: params.usesBodyweight
      ? `Свой вес: делаем ${repHigh} ${word} с запасом 2–3 повтора (RPE 7)`
      : `Первый раз: подбери вес, с которым сделаешь ${repHigh} ${word} на RPE 7`,
  });

  // История могла испортиться (импорт, ручная правка): работаем только с корректными подходами
  const usable = lastSets.filter(
    (s) => Number.isFinite(s.weight) && s.weight >= 0 && Number.isFinite(s.reps) && s.reps > 0,
  );
  if (usable.length === 0) return firstTime();

  const best = usable.reduce((a, b) => (b.weight * b.reps > a.weight * a.reps ? b : a));
  const reps = best.reps;
  const maxRpe = Math.max(...usable.map((s) => (Number.isFinite(s.rpe) ? s.rpe : 8)));

  if (params.usesBodyweight) {
    const nextReps = Math.min(repHigh + 2, reps + 1);
    return {
      weight: null,
      repLow,
      repHigh,
      repTarget: maxRpe >= 10 ? reps : nextReps,
      repHighTarget: repHigh,
      reason:
        maxRpe >= 10
          ? "Свой вес, был отказ — закрепляем текущее число повторов"
          : `Свой вес: +1 повтор → ${nextReps} (вес тела учитывается в тоннаже)`,
    };
  }

  if (measure === "time") {
    const nextSeconds = Math.min(repHigh, reps + 5);
    return {
      weight: best.weight,
      repLow,
      repHigh,
      repTarget: nextSeconds,
      repHighTarget: repHigh,
      reason:
        reps >= repHigh && maxRpe <= 8
          ? `Держим верх диапазона: ${repHigh} с — можно усложнить вариант`
          : `Время: цель ${nextSeconds} с`,
    };
  }

  if (missed >= 2) {
    const next = roundToStep(Math.max(best.weight * 0.95, 0), step);
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
      weight: best.weight,
      repLow,
      repHigh,
      repTarget: Math.min(repHigh, reps + 1),
      repHighTarget: repHigh,
      reason: "Был отказной подход (10/10) — вес не поднимаем, добираем повторы",
    };
  }

  if (reps >= repHigh && maxRpe <= 8) {
    const next = roundToStep(best.weight * 1.025, step);
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
    weight: best.weight,
    repLow,
    repHigh,
    repTarget: Math.min(repHigh, reps + 1),
    repHighTarget: repHigh,
    reason: `Вес тот же, добираем повторы: цель ${Math.min(repHigh, reps + 1)}–${repHigh}`,
  };
}

/** Разминочные подходы: только для упражнений со свободным весом */
export function warmupSets(params: {
  workWeight: number | null;
  measure?: Measure;
  usesBodyweight?: boolean;
}): { percent: number; weight: number; reps: number }[] {
  const { workWeight, measure, usesBodyweight } = params;
  if (workWeight === null || workWeight <= 0 || usesBodyweight || measure === "time") return [];
  if (workWeight < 20) return [{ percent: 50, weight: roundToStep(workWeight * 0.5, 2.5), reps: 8 }];
  return [
    { percent: 40, weight: roundToStep(workWeight * 0.4, 2.5), reps: 8 },
    { percent: 60, weight: roundToStep(workWeight * 0.6, 2.5), reps: 5 },
    { percent: 80, weight: roundToStep(workWeight * 0.8, 2.5), reps: 3 },
  ];
}

