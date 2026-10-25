import type { Brief, MuscleGroup } from "../types";

export type ReadinessBand = "low" | "medium" | "high";

export interface ReadinessResult {
  score: number;
  band: ReadinessBand;
  /** Множитель объёма подходов: 0.6 / 0.8 / 1.0 */
  volumeMultiplier: number;
  /** Группы, которые сегодня не грузим (болезненность >= 7) */
  blockedGroups: MuscleGroup[];
  flags: string[];
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function averageSoreness(soreness: Brief["soreness"]): number {
  const values = Object.values(soreness).filter((v): v is number => typeof v === "number");
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * readiness = 100 - недостаток сна - нехватка энергии - стресс - болезненность
 * Эвристика, не медицинский показатель.
 */
export function computeReadiness(brief: Brief): ReadinessResult {
  const avg = averageSoreness(brief.soreness);
  const raw =
    100 -
    (5 - brief.sleep) * 8 -
    (5 - brief.energy) * 8 -
    (brief.stress - 1) * 5 -
    avg * 4;

  const score = Math.round(clamp(raw, 0, 100));
  const band: ReadinessBand = score < 40 ? "low" : score <= 70 ? "medium" : "high";
  const volumeMultiplier = band === "low" ? 0.6 : band === "medium" ? 0.8 : 1;

  const blockedGroups = (Object.entries(brief.soreness) as [MuscleGroup, number][])
    .filter(([, value]) => value >= 7)
    .map(([muscle]) => muscle);

  const flags: string[] = [];
  if (brief.painNote && brief.painNote.trim().length > 0) {
    flags.push("Есть жалоба на боль: работаем мягко, при острой боли останавливаемся");
  }
  if (brief.sleep <= 2) flags.push("Мало сна — тяжёлые подходы сегодня не в приоритете");
  if (brief.energy <= 2) flags.push("Низкая энергия — объём урезан");
  if (blockedGroups.length > 0) {
    flags.push(`Не грузим сегодня: ${blockedGroups.join(", ")}`);
  }

  return { score, band, volumeMultiplier, blockedGroups, flags };
}

export const BAND_LABELS: Record<ReadinessBand, string> = {
  low: "Разгрузка",
  medium: "Средний день",
  high: "Хорошая форма",
};
