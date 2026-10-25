const WEEKDAY = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const MONTH = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function todayLabel(): string {
  const d = new Date();
  const weekday = WEEKDAY[d.getDay()];
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${d.getDate()} ${MONTH[d.getMonth()]}`;
}

export default function TodayScreen() {
  return (
    <div className="screen">
      <h1 className="screen__title">{todayLabel()}</h1>

      <section className="card card--muted">
        <h2 className="card__title">Бриф и план — следующий шаг</h2>
        <p className="card__text">
          Здесь появится короткий бриф о самочувствии: сон, энергия, стресс, болезненность по группам
          и сколько времени есть. Дальше движок правил предложит 1–3 тренировки с причиной выбора.
        </p>
        <ul className="list">
          <li>readiness = f(сон, энергия, стресс, болезненность)</li>
          <li>болезненность ≥ 7 — группу не грузим</li>
          <li>объём недели держим в коридоре MEV–MRV</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="card__title">Твой режим</h2>
        <div className="table">
          <div className="table__row table__row--head">
            <span>День</span>
            <span>План</span>
          </div>
          <div className="table__row"><span>Вт</span><span>зал</span></div>
          <div className="table__row"><span>Чт</span><span>зал</span></div>
          <div className="table__row"><span>Сб</span><span>зал</span></div>
          <div className="table__row"><span>Вс</span><span>зал</span></div>
          <div className="table__row"><span>Пн / Ср / Пт</span><span>бассейн или отдых</span></div>
        </div>
      </section>

      <p className="disclaimer">
        Приложение не заменяет тренера и врача. Острая боль, боль в суставе или головокружение —
        повод остановиться и обратиться к специалисту.
      </p>
    </div>
  );
}
