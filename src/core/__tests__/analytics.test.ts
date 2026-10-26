import { describe, expect, it } from "vitest";
import type { BodyMetric, Exercise, MuscleGroup } from "../../types";
import { EXERCISES } from "../../domain/catalog";
import {
  bodyChange,
  bodySeries,
  dayMonth,
  e1rmSeries,
  epley1rm,
  formatNumber,
  muscleVolume,
  personalBests,
  totalTonnage,
  trendOf,
  weekStart,
  weeklySummaries,
  type SetRecord,
  type WorkoutRecord,
} from "../analytics";

const TODAY = "2026-10-26"; // понедельник

const workout = (id: string, date: string): WorkoutRecord => ({ id, date });

const set = (
  workoutId: string,
  exerciseId: string,
  weight: number,
  reps: number,
  rpe = 8,
  isWarmup = false,
): SetRecord => ({ workoutId, exerciseId, weight, reps, rpe, isWarmup });

const body = (date: string, weightKg: number): BodyMetric => ({
  id: `${date}-w`,
  date,
  weightKg,
  createdAt: `${date}T08:00:00.000Z`,
});

const muscleSets = (volume: { muscle: MuscleGroup; sets: number }[], muscle: MuscleGroup) =>
  volume.find((v) => v.muscle === muscle)?.sets ?? 0;

describe("недели", () => {
  it("понедельник — начало недели", () => {
    expect(weekStart("2026-10-26")).toBe("2026-10-26");
    expect(weekStart("2026-10-25")).toBe("2026-10-19"); // воскресенье
    expect(weekStart("2026-11-01")).toBe("2026-10-26"); // воскресенье, конец месяца
  });

  it("переход через год не сдвигает неделю", () => {
    expect(weekStart("2026-01-01")).toBe("2025-12-29");
    expect(weekStart("2026-12-31")).toBe("2026-12-28");
    expect(weekStart("2027-01-01")).toBe("2026-12-28");
  });

  it("битая дата возвращается как есть", () => {
    expect(weekStart("плохо")).toBe("плохо");
    expect(dayMonth("2026-10-05")).toBe("5.10");
  });
});

describe("e1RM по Эпли", () => {
  it("считает по формуле и округляет до 0,1", () => {
    expect(epley1rm(100, 5)).toBe(116.7);
    expect(epley1rm(60, 10)).toBe(80);
    expect(epley1rm(80, 1)).toBe(80);
  });

  it("не оценивает свой вес, мусор и многоповторку", () => {
    expect(epley1rm(0, 8)).toBeNull();
    expect(epley1rm(-20, 8)).toBeNull();
    expect(epley1rm(Number.NaN, 8)).toBeNull();
    expect(epley1rm(80, 0)).toBeNull();
    expect(epley1rm(80, 16)).toBeNull();
    expect(epley1rm(80, 15)).toBe(120);
  });
});

describe("тоннаж", () => {
  it("суммирует только рабочие подходы", () => {
    expect(totalTonnage([set("w1", "x", 100, 5), set("w1", "x", 200, 1, 8, true)])).toBe(500);
  });

  it("битые значения не дают NaN", () => {
    const broken = [
      set("w1", "x", Number.NaN, 8),
      set("w1", "x", 60, Number.NaN),
      set("w1", "x", -50, 8),
      set("w1", "x", 60, 0),
    ];
    expect(totalTonnage(broken)).toBe(0);
    expect(Number.isFinite(totalTonnage(broken))).toBe(true);
  });
});

describe("недельные срезы", () => {
  const workouts = [
    workout("w1", "2026-10-26"),
    workout("w2", "2026-10-21"),
    workout("w3", "2026-10-06"), // старше окна
  ];
  const sets = [
    set("w1", "bb-bench-press", 100, 5),
    set("w2", "bb-squat", 50, 10),
    set("w2", "bb-squat", 60, 5),
    set("w2", "bb-squat", 999, 1, 8, true),
    set("w3", "bb-squat", 80, 8),
  ];

  it("раскладывает тоннаж и подходы по неделям, пропуски — нулями", () => {
    const weeks = weeklySummaries({ sets, workouts, todayIso: TODAY, weeks: 3 });
    expect(weeks.map((w) => w.weekStart)).toEqual(["2026-10-12", "2026-10-19", "2026-10-26"]);
    expect(weeks.map((w) => w.tonnage)).toEqual([0, 800, 500]);
    expect(weeks.map((w) => w.sets)).toEqual([0, 2, 1]);
    expect(weeks.map((w) => w.workouts)).toEqual([0, 1, 1]);
  });

  it("средний RPE считается честно, пустая неделя — null", () => {
    const weeks = weeklySummaries({ sets, workouts, todayIso: TODAY, weeks: 3 });
    expect(weeks[0].avgRpe).toBeNull();
    expect(weeks[1].avgRpe).toBe(8);
    expect(weeks[2].avgRpe).toBe(8);
  });

  it("пустая история даёт нули, а не падение", () => {
    const weeks = weeklySummaries({ sets: [], workouts: [], todayIso: TODAY, weeks: 4 });
    expect(weeks).toHaveLength(4);
    expect(weeks.every((w) => w.tonnage === 0 && w.sets === 0 && w.avgRpe === null)).toBe(true);
  });
});

describe("тренд", () => {
  it("рост больше 2 % — прогресс", () => {
    const result = trendOf([100, 100, 103, 104]);
    expect(result.kind).toBe("progress");
    expect(result.changePct).toBe(3.5);
  });

  it("в пределах 2 % — плато", () => {
    expect(trendOf([100, 101, 100, 101]).kind).toBe("plateau");
  });

  it("падение больше 2 % — откат", () => {
    const result = trendOf([100, 100, 95, 94]);
    expect(result.kind).toBe("regress");
    expect(result.changePct).toBe(-5.5);
  });

  it("меньше четырёх недель — мало данных", () => {
    expect(trendOf([100, 102, 104]).kind).toBe("unknown");
    expect(trendOf([100, 102, 104]).changePct).toBeNull();
  });

  it("нули отбрасываются, а не ломают медиану", () => {
    expect(trendOf([0, 0, 100, 100, 105, 106]).kind).toBe("progress");
  });
});

describe("сила по неделям и рекорды", () => {
  const workouts = [
    workout("w1", "2026-10-26"),
    workout("w2", "2026-10-21"),
    workout("w3", "2026-10-01"),
    workout("w4", "2026-09-01"),
  ];
  const sets = [
    set("w1", "bb-bench-press", 100, 5), // 116.7
    set("w2", "bb-bench-press", 90, 10), // 120
    set("w2", "bb-bench-press", 95, 8), // 120.3
    set("w2", "bb-bench-press", 200, 1, 8, true),
    set("w2", "bb-romanian-deadlift", 100, 10),
    set("w3", "bb-bench-press", 300, 5), // вне окна 3 недель
    set("w4", "bb-back-squat", 140, 5), // 163.3
  ];

  it("берёт лучший e1RM недели и не выходит за окно", () => {
    const series = e1rmSeries({
      sets,
      workouts,
      exerciseId: "bb-bench-press",
      todayIso: TODAY,
      weeks: 3,
    });
    expect(series).toEqual([
      { weekStart: "2026-10-19", label: "19.10", value: 120.3 },
      { weekStart: "2026-10-26", label: "26.10", value: 116.7 },
    ]);
  });

  it("рекорды сортируются по силе и помечают свежие", () => {
    const bestSets = [
      set("w1", "bb-bench-press", 100, 5), // 116.7, свежий
      set("w2", "bb-bench-press", 95, 8), // 120.3 — лучший
      set("w4", "bb-back-squat", 140, 5), // 163.3, старый
      set("w4", "bb-back-squat", 200, 1, 8, true), // разминка не в счёт
    ];
    const bests = personalBests({ sets: bestSets, workouts, todayIso: TODAY, days: 14 });
    expect(bests[0].exerciseId).toBe("bb-back-squat");
    expect(bests[0].e1rm).toBe(163.3);
    expect(bests[0].recent).toBe(false);

    const bench = bests.find((b) => b.exerciseId === "bb-bench-press")!;
    expect(bench.e1rm).toBe(120.3);
    expect(bench.recent).toBe(true);
    expect(bench.weight).toBe(95);
    expect(bench.reps).toBe(8);
  });
});

describe("объём по группам", () => {
  const workouts = [workout("w1", "2026-10-20"), workout("w2", "2026-09-01")];
  const sets = [
    set("w1", "bb-bench-press", 100, 5),
    set("w1", "bb-bench-press", 80, 10),
    set("w2", "bb-bench-press", 300, 10), // до начала периода
  ];

  it("основная группа — 1 подход, синергисты — 0,5", () => {
    const volume = muscleVolume({
      sets,
      workouts,
      exercises: EXERCISES,
      sinceIso: "2026-10-01",
    });
    expect(muscleSets(volume, "chest")).toBe(2);
    expect(muscleSets(volume, "triceps")).toBe(1);
    expect(muscleSets(volume, "shoulders")).toBe(1);
    expect(muscleSets(volume, "quads")).toBe(0);
  });

  it("тоннаж приписывается пропорционально", () => {
    const volume = muscleVolume({
      sets,
      workouts,
      exercises: EXERCISES,
      sinceIso: "2026-10-01",
    });
    expect(volume.find((v) => v.muscle === "chest")?.tonnage).toBe(1300);
    expect(volume.find((v) => v.muscle === "triceps")?.tonnage).toBe(650);
  });

  it("неизвестное упражнение просто пропускается", () => {
    const volume = muscleVolume({
      sets: [set("w1", "no-such-exercise", 100, 5)],
      workouts,
      exercises: EXERCISES as Exercise[],
      sinceIso: "2026-10-01",
    });
    expect(volume).toEqual([]);
  });
});

describe("вес тела", () => {
  it("сортирует, убирает дубли и мусор", () => {
    const series = bodySeries(
      [
        body("2026-10-20", 78.9),
        body("2026-10-01", 78.2),
        body("2026-10-20", 79.0),
        body("2026-10-21", 1123),
        body("2026-10-22", Number.NaN),
      ],
      TODAY,
    );
    expect(series.map((p) => p.label)).toEqual(["1.10", "20.10"]);
    expect(series[1].weightKg).toBe(79);
  });

  it("считает изменение и скорость", () => {
    const series = bodySeries([body("2026-10-01", 78.2), body("2026-10-20", 79.0)], TODAY);
    const change = bodyChange(series)!;
    expect(change.deltaKg).toBe(0.8);
    expect(change.weeks).toBe(2.7);
    expect(change.perWeekKg).toBe(0.3);
  });

  it("одного замера мало для изменения", () => {
    expect(bodyChange(bodySeries([body("2026-10-01", 78.2)], TODAY))).toBeNull();
  });
});

describe("форматирование", () => {
  it("тоннаж с пробелами между тысячами", () => {
    expect(formatNumber(12340)).toBe("12 340");
    expect(formatNumber(500)).toBe("500");
    expect(formatNumber(Number.NaN)).toBe("—");
  });
});
