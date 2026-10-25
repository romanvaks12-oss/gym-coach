import type { PlanOption } from "../core/plan";
import type { ReadinessResult } from "../core/readiness";
import { BAND_LABELS } from "../core/readiness";
import { MUSCLE_LABELS } from "../domain/catalog";

export default function PlanPicker({
  plans,
  readiness,
  onPick,
  onBack,
}: {
  plans: PlanOption[];
  readiness: ReadinessResult;
  onPick: (plan: PlanOption) => void;
  onBack: () => void;
}) {
  return (
    <div className="screen">
      <h1 className="screen__title">План на сегодня</h1>

      <section className="card card--muted">
        <div className="readiness">
          <div className="readiness__score">
            <span className="readiness__value">{readiness.score}</span>
            <span className="hint">readiness</span>
          </div>
          <div className="readiness__info">
            <strong>{BAND_LABELS[readiness.band]}</strong>
            <span className="hint">
              объём ×{readiness.volumeMultiplier.toString().replace(".", ",")}
            </span>
          </div>
        </div>
        {readiness.flags.length > 0 && (
          <ul className="list">
            {readiness.flags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        )}
      </section>

      {plans.length === 0 && (
        <section className="card">
          <h2 className="card__title">Сегодня лучше восстановиться</h2>
          <p className="card__text">
            Все группы, под которые есть упражнения, либо болят, либо тренировались вчера.
            Мышцы растут во время отдыха: сегодня — сон, еда и прогулка, завтра соберём план заново.
          </p>
        </section>
      )}

      {plans.map((plan) => (
        <section key={plan.id} className="card">
          <header className="plan__head">
            <h2 className="card__title">{plan.title}</h2>
            <span className="plan__meta">≈ {plan.estimatedMin} мин</span>
          </header>
          <p className="hint">{plan.reason}</p>
          <p className="hint">
            Фокус: {plan.focus.slice(0, 4).map((m) => MUSCLE_LABELS[m]).join(", ")}
          </p>

          <table className="plan__table">
            <thead>
              <tr>
                <th>Упражнение</th>
                <th>Подх.</th>
                <th>Повт.</th>
                <th>Вес</th>
              </tr>
            </thead>
            <tbody>
              {plan.items.map((item) => (
                <tr key={item.exerciseId}>
                  <td>{item.name}</td>
                  <td>{item.sets}</td>
                  <td>
                    {item.repLow}–{item.repHigh}
                    {item.measure === "time" ? " с" : ""}
                  </td>
                  <td>
                    {item.usesBodyweight
                      ? "свой вес"
                      : item.weight === null
                        ? "подбери"
                        : `${item.weight} кг`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="hint">{plan.items[0]?.reason}</p>

          <button type="button" className="button" onClick={() => onPick(plan)}>
            Начать эту тренировку
          </button>
        </section>
      ))}

      <button type="button" className="button button--ghost" onClick={onBack}>
        Перезаполнить бриф
      </button>
    </div>
  );
}
