import { useEffect, useMemo, useState } from "react";
import type { BodyMetric, SetLog, Workout } from "../types";
import { MUSCLE_LABELS, byId } from "../domain/catalog";
import { EXERCISES } from "../domain/catalog";
import { db } from "../storage/db";
import { todayIso } from "../core/dates";
import { formatKg } from "../core/validation";
import {
  addDays,
  bodyChange,
  bodySeries,
  dayMonth,
  e1rmSeries,
  epley1rm,
  formatNumber,
  muscleVolume,
  personalBests,
  trendOf,
  weeklySummaries,
  type TrendKind,
} from "../core/analytics";
import { LineChart, MuscleBars, WeekBars } from "../components/Charts";

const TREND_LABEL: Record<TrendKind, string> = {
  progress: "рост",
  plateau: "плато",
  regress: "откат",
  unknown: "мало данных",
};

const signed = (value: number): string => {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return "0";
  return `${rounded > 0 ? "+" : "−"}${formatKg(Math.abs(rounded))}`;
};

const plural = (count: number, one: string, few: string, many: string): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

export default function ProgressScreen() {
  const [data, setData] = useState<{
    workouts: Workout[];
    sets: SetLog[];
    body: BodyMetric[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      db.getAll<Workout>("workouts"),
      db.getAll<SetLog>("sets"),
      db.getAll<BodyMetric>("body"),
    ])
      .then(([workouts, sets, body]) => setData({ workouts, sets, body }))
      .catch(() => setError("Не удалось открыть локальную базу"));
  }, []);

  if (error) {
    return (
      <div className="screen">
        <h1 className="screen__title">Прогресс</h1>
        <p className="notice notice--error">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="screen">
        <h1 className="screen__title">Прогресс</h1>
        <p className="card__text">Считаю…</p>
      </div>
    );
  }

  return <ProgressView {...data} todayIso={todayIso()} />;
}

export function ProgressView({
  workouts,
  sets,
  body,
  todayIso: today,
}: {
  workouts: Workout[];
  sets: SetLog[];
  body: BodyMetric[];
  todayIso: string;
}) {
  const weeks = useMemo(
    () => weeklySummaries({ sets, workouts, todayIso: today, weeks: 8 }),
    [sets, workouts, today],
  );
  const prs = useMemo(
    () => personalBests({ sets, workouts, todayIso: today, days: 7 }),
    [sets, workouts, today],
  );
  const volume = useMemo(
    () => muscleVolume({ sets, workouts, exercises: EXERCISES, sinceIso: addDays(today, -27) }),
    [sets, workouts, today],
  );
  const bodyPoints = useMemo(() => bodySeries(body, today).slice(-12), [body, today]);
  const bodyDiff = useMemo(() => bodyChange(bodyPoints), [bodyPoints]);

  const choices = useMemo(() => {
    const dateById = new Map(workouts.map((w) => [w.id, w.date]));
    const counts = new Map<string, number>();
    for (const set of sets) {
      if (set.isWarmup || !dateById.has(set.workoutId)) continue;
      if (epley1rm(set.weight, set.reps) === null) continue;
      counts.set(set.exerciseId, (counts.get(set.exerciseId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ id, count, name: byId(id)?.name ?? id }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [sets, workouts]);

  const [picked, setPicked] = useState<string | null>(null);
  const activeId = picked && choices.some((c) => c.id === picked) ? picked : choices[0]?.id ?? null;

  const series = useMemo(
    () =>
      activeId
        ? e1rmSeries({ sets, workouts, exerciseId: activeId, todayIso: today, weeks: 8 })
        : [],
    [activeId, sets, workouts, today],
  );
  const trend = trendOf(series.map((point) => point.value));

  const last = weeks[weeks.length - 1];
  const prev = weeks[weeks.length - 2];
  const workouts4 = weeks.slice(-4).reduce((sum, week) => sum + week.workouts, 0);
  const workouts4Prev = weeks.slice(-8, -4).reduce((sum, week) => sum + week.workouts, 0);
  const tonnageDelta =
    prev && prev.tonnage > 0
      ? Math.round(((last.tonnage - prev.tonnage) / prev.tonnage) * 100)
      : null;
  const setsDelta =
    prev && prev.sets > 0 ? Math.round(((last.sets - prev.sets) / prev.sets) * 100) : null;
  const workouts4Delta =
    workouts4Prev > 0 ? Math.round(((workouts4 - workouts4Prev) / workouts4Prev) * 100) : null;
  const bodyLast = bodyPoints.length > 0 ? bodyPoints[bodyPoints.length - 1].weightKg : null;
  const bodyDeltaPct =
    bodyDiff && bodyDiff.from > 0
      ? Math.round((bodyDiff.deltaKg / bodyDiff.from) * 100 * 10) / 10
      : null;

  if (workouts.length === 0) {
    return (
      <div className="screen">
        <h1 className="screen__title">Прогресс</h1>
        <section className="card">
          <h2 className="card__title">Пока пусто</h2>
          <p className="card__text">
            Заверши первую тренировку — здесь появятся тоннаж по неделям, оценка силы, объём по
            группам мышц и вес тела.
          </p>
        </section>
        <section className="card card--muted">
          <h2 className="card__title">Как это читать</h2>
          <ul className="list">
            <li>тоннаж — сумма «вес × повторы» по рабочим подходам;</li>
            <li>1ПМ — оценка по формуле Эпли, ориентир, а не проверенный максимум;</li>
            <li>тренд — сравнение двух последних недель с двумя предыдущими;</li>
            <li>всё считается на телефоне, данные никуда не уходят.</li>
          </ul>
        </section>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1 className="screen__title">Прогресс</h1>

      <div className="stats">
        <div className="stat">
          <span className="stat__value">{formatNumber(last.tonnage)}</span>
          <span className="stat__label">кг тоннажа за неделю</span>
          {tonnageDelta !== null && (
            <span className={tonnageDelta >= 0 ? "stat__delta stat__delta--up" : "stat__delta stat__delta--down"}>
              {tonnageDelta >= 0 ? "+" : "−"}
              {Math.abs(tonnageDelta)} % к прошлой
            </span>
          )}
        </div>
        <div className="stat">
          <span className="stat__value">{workouts4}</span>
          <span className="stat__label">
            {plural(workouts4, "тренировка", "тренировки", "тренировок")} за 4 недели
          </span>
          {workouts4Delta !== null && (
            <span
              className={workouts4Delta >= 0 ? "stat__delta stat__delta--up" : "stat__delta stat__delta--down"}
            >
              {workouts4Delta >= 0 ? "+" : "−"}
              {Math.abs(workouts4Delta)} % к пред. 4 нед.
            </span>
          )}
        </div>
        <div className="stat">
          <span className="stat__value">{last.sets}</span>
          <span className="stat__label">
            {plural(last.sets, "подход", "подхода", "подходов")} за неделю
          </span>
          {setsDelta !== null && (
            <span className={setsDelta >= 0 ? "stat__delta stat__delta--up" : "stat__delta stat__delta--down"}>
              {setsDelta >= 0 ? "+" : "−"}
              {Math.abs(setsDelta)} % к прошлой
            </span>
          )}
        </div>
        <div className="stat">
          <span className="stat__value">{bodyLast === null ? "—" : formatKg(bodyLast)}</span>
          <span className="stat__label">кг вес тела</span>
          {bodyDiff && (
            <span
              className={
                bodyDiff.deltaKg >= 0 ? "stat__delta stat__delta--up" : "stat__delta stat__delta--down"
              }
            >
              {signed(bodyDiff.deltaKg)} кг
              {bodyDeltaPct !== null ? ` (${bodyDeltaPct >= 0 ? "+" : ""}${bodyDeltaPct}%)` : ""}
            </span>
          )}
        </div>
      </div>

      <section className="card">
        <h2 className="card__title">Тоннаж по неделям</h2>
        <WeekBars weeks={weeks} format={formatNumber} />
        <p className="hint">
          Сумма «вес × повторы» по рабочим подходам. Неделя {last.label}: {formatNumber(last.tonnage)} кг.
        </p>
      </section>

      <section className="card">
        <h2 className="card__title">Сила: оценка 1ПМ</h2>
        <p className="hint">
          Эпли: вес × (1 + повторы / 30). Ориентир для сравнения недель, а не проверенный максимум.
        </p>

        {choices.length > 0 ? (
          <>
            <div className="chips chips--wrap">
              {choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className={
                    choice.id === activeId ? "chip chip--sm chip--active" : "chip chip--sm"
                  }
                  onClick={() => setPicked(choice.id)}
                >
                  {choice.name}
                </button>
              ))}
            </div>

            <LineChart
              points={series.map((point) => ({ label: point.label, value: point.value }))}
              format={formatKg}
              unit="кг"
              ariaLabel="Оценка 1ПМ по неделям"
            />

            {series.length > 0 && (
              <div className="trendrow">
                <span className={`badge badge--${trend.kind}`}>{TREND_LABEL[trend.kind]}</span>
                <span className="hint">
                  {trend.changePct === null
                    ? "для тренда нужно 4 недели данных"
                    : `${trend.changePct > 0 ? "+" : ""}${formatKg(trend.changePct)} % за 4 недели`}{" "}
                  · лучший ≈ {formatKg(Math.max(...series.map((point) => point.value)))} кг
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="hint">Оценка силы появится, когда запишешь подходы с весом и повторами до 15.</p>
        )}
      </section>

      <section className="card">
        <h2 className="card__title">Объём по группам · 4 недели</h2>
        <MuscleBars
          rows={volume
            .slice(0, 8)
            .map((item) => ({ label: MUSCLE_LABELS[item.muscle] ?? item.muscle, value: item.sets }))}
        />
        <p className="hint">
          Основная группа — 1 подход, синергист — 0,5. Ориентир: 10–20 подходов на группу в неделю.
        </p>
      </section>

      <section className="card">
        <h2 className="card__title">Вес тела</h2>
        {bodyPoints.length >= 2 ? (
          <LineChart
            points={bodyPoints.map((point) => ({ label: point.label, value: point.weightKg }))}
            format={formatKg}
            unit="кг"
            ariaLabel="Вес тела по замерам"
          />
        ) : (
          <p className="hint">Нужно два замера: вес тела вводится в брифе перед тренировкой.</p>
        )}
        {bodyDiff && (
          <p className="card__text">
            {formatKg(bodyDiff.from)} → {formatKg(bodyDiff.to)} кг, {signed(bodyDiff.deltaKg)} кг за{" "}
            {formatKg(bodyDiff.weeks)} нед.
            {bodyDiff.perWeekKg !== null && ` (${signed(bodyDiff.perWeekKg)} кг в неделю)`}
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="card__title">Личные рекорды</h2>
        {prs.length === 0 ? (
          <p className="hint">Рекорды появятся, когда будут подходы с весом.</p>
        ) : (
          <ul className="prlist">
            {prs.slice(0, 5).map((pr) => {
              const exercise = byId(pr.exerciseId);
              if (!exercise) return null;
              return (
                <li key={pr.exerciseId} className="prlist__row">
                  <span className="prlist__name">
                    {exercise.name}
                    {pr.recent && <span className="badge badge--progress">новый</span>}
                  </span>
                  <span className="prlist__value">≈ {formatKg(pr.e1rm)} кг</span>
                  <span className="prlist__meta">
                    {dayMonth(pr.date)} · {formatKg(pr.weight)} × {pr.reps}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="hint">Все цифры считаются на этом устройстве по локальным данным.</p>
    </div>
  );
}
