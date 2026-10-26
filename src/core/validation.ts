import type { Measure } from "../types";

/** Разумные пределы ввода. Всё, что за ними, — почти наверняка опечатка. */
export const LIMITS = {
  maxWeightKg: 400,
  maxReps: 100,
  maxSeconds: 1800,
  minRpe: 1,
  maxRpe: 10,
} as const;

export interface SetCheckInput {
  weight: number;
  reps: number;
  rpe: number;
  measure: Measure;
  usesBodyweight: boolean;
  /** Вес прошлого подхода этого упражнения (или целевой) — чтобы ловить скачки вроде 12 → 112 */
  referenceWeightKg?: number | null;
}

export interface SetCheck {
  ok: boolean;
  error: string | null;
  /** Не блокирует запись, но просит подтвердить вторым нажатием */
  warning: string | null;
}

export function formatKg(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",");
}

/** Вес тела из брифа: чистим мусор и нереальные значения. */
export function saneBodyWeightKg(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 20 || value > LIMITS.maxWeightKg) return null;
  return Math.round(value * 10) / 10;
}

/**
 * Проверка подхода перед записью: жёсткие пределы (ошибка) + мягкое предупреждение
 * о подозрительном скачке веса. Чистая функция, без DOM.
 */
export function checkSetInput(input: SetCheckInput): SetCheck {
  const { weight, reps, rpe, measure, usesBodyweight, referenceWeightKg } = input;
  const fail = (error: string): SetCheck => ({ ok: false, error, warning: null });
  const ok = (warning: string | null = null): SetCheck => ({ ok: true, error: null, warning });

  if (!Number.isFinite(weight)) return fail("Вес должен быть числом");
  if (weight < 0) return fail("Вес не может быть отрицательным");
  if (weight > LIMITS.maxWeightKg) {
    return fail(`Больше ${LIMITS.maxWeightKg} кг — похоже на опечатку`);
  }
  if (!usesBodyweight && weight <= 0) return fail("Укажи вес снаряда");

  if (!Number.isFinite(reps) || !Number.isInteger(reps)) {
    return fail(measure === "time" ? "Секунды — целое число" : "Повторы — целое число");
  }
  if (reps <= 0) {
    return fail(measure === "time" ? "Секунды должны быть больше нуля" : "Повторы должны быть больше нуля");
  }
  if (measure === "time" && reps > LIMITS.maxSeconds) {
    return fail(`Больше ${LIMITS.maxSeconds} секунд — проверь значение`);
  }
  if (measure !== "time" && reps > LIMITS.maxReps) {
    return fail(`Больше ${LIMITS.maxReps} повторов — проверь значение`);
  }

  if (!Number.isInteger(rpe) || rpe < LIMITS.minRpe || rpe > LIMITS.maxRpe) {
    return fail("RPE — целое число от 1 до 10");
  }

  const ref = referenceWeightKg ?? null;
  // +30 % и +15 кг одновременно — уже повод переспросить (12 → 112 точно поймает)
  if (ref !== null && Number.isFinite(ref) && ref > 0 && weight > ref * 1.3 + 15) {
    return ok(
      `Вес ${formatKg(weight)} кг резко больше прошлого (${formatKg(ref)} кг) — похоже на опечатку. Всё верно?`,
    );
  }

  return ok();
}
