import {
  PLANNED_DAY_LABELS,
  WEEKDAY_SHORT,
  isoWeekday,
  plannedWorkouts,
  type PlannedDay,
  type WeekPlan,
} from "../core/weekplan";

const OPTIONS: PlannedDay[] = ["full", "upper", "lower", "rest"];

/** Короткие подписи: на 390 px четыре кнопки в строке должны влезать */
const SHORT: Record<PlannedDay, string> = {
  full: "Всё",
  upper: "Верх",
  lower: "Низ",
  rest: "—",
};

/**
 * Недельный планировщик: какой тип тренировки в какой день.
 *
 * Ничего не навязывает — план всё равно пересобирается по готовности,
 * но выбранный на сегодня день идёт первым в списке вариантов.
 */
export default function WeekPlanner({
  plan,
  todayIso,
  onChange,
  readOnly = false,
}: {
  plan: WeekPlan;
  todayIso: string;
  onChange?: (plan: WeekPlan) => void;
  readOnly?: boolean;
}) {
  const today = isoWeekday(todayIso);
  const total = plannedWorkouts(plan);

  return (
    <section className="card" aria-label="Моя неделя">
      <div className="week__head">
        <h2 className="card__title">Моя неделя</h2>
        <span className="hint">
          {total === 0
            ? "пока всё отдых"
            : `${total} ${total === 1 ? "тренировка" : total < 5 ? "тренировки" : "тренировок"} в неделю`}
        </span>
      </div>

      <div className="week">
        {WEEKDAY_SHORT.map((label, index) => {
          const day = index + 1;
          const value = plan[day] ?? "rest";
          const isToday = day === today;
          return (
            <div key={label} className={isToday ? "week__row week__row--today" : "week__row"}>
              <span className="week__day">
                {label}
                {isToday && <span className="week__dot" aria-label="сегодня" />}
              </span>
              <div className="week__options">
                {OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={value === option ? "chip chip--sm chip--active" : "chip chip--sm"}
                    aria-pressed={value === option}
                    aria-label={`${label}: ${PLANNED_DAY_LABELS[option]}`}
                    disabled={readOnly}
                    onClick={() => onChange?.({ ...plan, [day]: option })}
                  >
                    {SHORT[option]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="hint">
        {plan[today] === "rest"
          ? "На сегодня по плану отдых — но если есть силы, тренировку никто не запрещает."
          : `На сегодня по плану: ${PLANNED_DAY_LABELS[plan[today] ?? "rest"]}. Он будет первым в списке вариантов.`}
      </p>
    </section>
  );
}
