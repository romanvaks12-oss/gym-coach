/**
 * Разминочные подходы — подсказка, а не запись в лог.
 *
 * Правило простое и одинаковое для всех упражнений со штангой/в тренажёре:
 * 40 % × 8, 60 % × 5, 80 % × 3 от рабочего веса, округлённые до шага блинов
 * (2,5 кг) и не ниже пустого грифа. В лог идут только рабочие подходы.
 */
export interface WarmupSet {
  weight: number;
  reps: number;
}

export interface WarmupOptions {
  /** Пустой гриф: ниже него разминаться нечем */
  barKg?: number;
  /** Шаг блинов в зале */
  stepKg?: number;
  /** С таким рабочим весом разминка не нужна — и так легко */
  minWorkingKg?: number;
}

const STEPS: [percent: number, reps: number][] = [
  [0.4, 8],
  [0.6, 5],
  [0.8, 3],
];

function roundToStep(value: number, stepKg: number): number {
  if (!Number.isFinite(value) || stepKg <= 0) return value;
  return Math.round(value / stepKg) * stepKg;
}

export function warmupLadder(workingWeight: number, options: WarmupOptions = {}): WarmupSet[] {
  const barKg = options.barKg ?? 20;
  const stepKg = options.stepKg ?? 2.5;
  const minWorkingKg = options.minWorkingKg ?? 30;

  if (!Number.isFinite(workingWeight) || workingWeight < minWorkingKg) return [];

  const ladder: WarmupSet[] = [];
  for (const [percent, reps] of STEPS) {
    const raw = Math.max(barKg, roundToStep(workingWeight * percent, stepKg));
    const weight = Math.round(raw * 10) / 10;
    // Разминка не может быть тяжелее рабочего подхода и не должна повторяться
    if (weight >= workingWeight) continue;
    const previous = ladder[ladder.length - 1];
    if (previous && weight <= previous.weight) continue;
    ladder.push({ weight, reps });
  }
  return ladder;
}

/** Короткая подпись для интерфейса: «40 × 8 · 60 × 5 · 80 × 3» */
export function warmupText(sets: WarmupSet[]): string {
  return sets.map((set) => `${set.weight} × ${set.reps}`).join(" · ");
}
