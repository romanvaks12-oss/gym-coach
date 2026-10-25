import media from "../data/exercise-media.json";

export interface ExerciseMedia {
  dbId: string;
  nameEn: string;
  images: string[];
  /** Мышечные группы в терминах free-exercise-db (английский) */
  primaryMuscles: string[];
  secondaryMuscles: string[];
  score: number;
}

const MEDIA = media as Record<string, ExerciseMedia>;

export function mediaFor(exerciseId: string): ExerciseMedia | undefined {
  return MEDIA[exerciseId];
}
