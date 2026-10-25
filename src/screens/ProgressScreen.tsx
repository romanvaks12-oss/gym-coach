import { useEffect, useState } from "react";
import { countAll } from "../storage/db";
import { EXERCISES } from "../domain/catalog";

export default function ProgressScreen() {
  const [counts, setCounts] = useState<{ workouts: number; sets: number; body: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    countAll()
      .then(setCounts)
      .catch(() => setError("Не удалось открыть локальную базу"));
  }, []);

  return (
    <div className="screen">
      <h1 className="screen__title">Прогресс</h1>

      <section className="card">
        <h2 className="card__title">Локальная база</h2>
        {error ? (
          <p className="card__text card__text--warn">{error}</p>
        ) : (
          <div className="stats">
            <div className="stat">
              <span className="stat__value">{counts ? counts.workouts : "—"}</span>
              <span className="stat__label">тренировок</span>
            </div>
            <div className="stat">
              <span className="stat__value">{counts ? counts.sets : "—"}</span>
              <span className="stat__label">подходов</span>
            </div>
            <div className="stat">
              <span className="stat__value">{counts ? counts.body : "—"}</span>
              <span className="stat__label">замеров веса</span>
            </div>
            <div className="stat">
              <span className="stat__value">{EXERCISES.length}</span>
              <span className="stat__label">упражнений</span>
            </div>
          </div>
        )}
      </section>

      <section className="card card--muted">
        <h2 className="card__title">Что появится в P2</h2>
        <ul className="list">
          <li>оценка 1ПМ по ключевым упражнениям (Эпли) и тренд по неделям</li>
          <li>тоннаж и число подходов по мышечным группам</li>
          <li>вес тела и обхват, графики с датами</li>
          <li>личные рекорды: новый максимум e1RM больше прежнего на 1 %</li>
        </ul>
      </section>
    </div>
  );
}
