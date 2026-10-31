import type { PlanItem } from "../core/plan";
import { warmupLadder } from "../core/warmup";
import { formatKg } from "../core/validation";

/**
 * Подсказка по разминке перед рабочими подходами.
 *
 * Разминка нигде не сохраняется — в базе остаются только рабочие подходы,
 * поэтому аналитика и тоннаж не раздуваются.
 */
export default function WarmupHint({ item }: { item: PlanItem }) {
  if (item.measure === "time") return null;

  if (item.usesBodyweight) {
    return (
      <section className="card card--muted">
        <h2 className="card__title">Разминка</h2>
        <p className="card__text">1–2 подхода с собственным весом, чтобы разогреться. В лог не идёт.</p>
      </section>
    );
  }

  if (item.weight === null) return null;

  const ladder = warmupLadder(item.weight);
  if (ladder.length === 0) return null;

  return (
    <section className="card card--muted">
      <h2 className="card__title">Разминка</h2>
      <div className="chips chips--wrap">
        {ladder.map((set) => (
          <span key={set.weight} className="chip chip--sm">
            {formatKg(set.weight)} кг × {set.reps}
          </span>
        ))}
      </div>
      <p className="hint">
        Разминка в лог не пишется. Рабочий подход — {formatKg(item.weight)} кг.
      </p>
    </section>
  );
}
