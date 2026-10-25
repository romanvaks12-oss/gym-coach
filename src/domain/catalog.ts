import type { Equipment, Exercise, MuscleGroup } from "../types";
import catalog from "../data/exercises.json";

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: "Грудь",
  back: "Спина",
  lats: "Широчайшие",
  quads: "Квадрицепс",
  hamstrings: "Бицепс бедра",
  glutes: "Ягодицы",
  shoulders: "Плечи",
  biceps: "Бицепс",
  triceps: "Трицепс",
  calves: "Икры",
  core: "Пресс",
  traps: "Трапеции",
  forearms: "Предплечья",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "Штанга",
  dumbbell: "Гантели",
  machine: "Тренажёр",
  cable: "Блок",
  smith: "Смит",
  bodyweight: "Своё тело",
};

export const EXERCISES = (catalog as { exercises: Exercise[] }).exercises;

export const MUSCLE_ORDER: MuscleGroup[] = [
  "chest",
  "back",
  "lats",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
  "traps",
  "forearms",
];

export function byId(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

export interface CatalogFilter {
  query: string;
  muscle: MuscleGroup | "all";
}

export function filterExercises({ query, muscle }: CatalogFilter): Exercise[] {
  const q = query.trim().toLowerCase();
  return EXERCISES.filter((e) => {
    if (muscle !== "all" && e.primaryMuscle !== muscle) return false;
    if (!q) return true;
    return (
      e.name.toLowerCase().includes(q) ||
      MUSCLE_LABELS[e.primaryMuscle].toLowerCase().includes(q) ||
      EQUIPMENT_LABELS[e.equipment].toLowerCase().includes(q)
    );
  });
}
