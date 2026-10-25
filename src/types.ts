/**
 * Domain types. Source of truth for storage and UI.
 * Naming: latin. Values: kg, local dates YYYY-MM-DD.
 */

export type MuscleGroup =
  | "chest"
  | "back"
  | "lats"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "calves"
  | "core"
  | "traps"
  | "forearms";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "smith"
  | "bodyweight";

export type Pattern =
  | "squat"
  | "hinge"
  | "push"
  | "pull"
  | "lunge"
  | "isolation"
  | "core";

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  pattern: Pattern;
  isCompound: boolean;
  isUnilateral: boolean;
  /** Short technique cues shown during the workout. */
  cues: string[];
}

export interface Brief {
  sleep: number; // 1..5
  energy: number; // 1..5
  stress: number; // 1..5
  soreness: Partial<Record<MuscleGroup, number>>; // 0..10
  minutes: 30 | 45 | 60 | 90;
  painNote?: string;
}

export interface Workout {
  id: string;
  date: string; // local date YYYY-MM-DD
  readiness: number; // 0..100
  durationMin: number;
  planId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  pendingSync?: boolean;
}

export interface SetLog {
  id: string;
  workoutId: string;
  exerciseId: string;
  setIndex: number;
  weight: number; // kg, 0 for bodyweight
  reps: number;
  rpe: number; // 1..10
  isWarmup: boolean;
  createdAt: string;
  pendingSync?: boolean;
}

export interface BodyMetric {
  id: string;
  date: string;
  weightKg: number;
  waistCm?: number;
  createdAt: string;
  pendingSync?: boolean;
}

export interface AppSettings {
  syncUrl: string;
  syncToken: string;
  lastSync?: string;
  schemaVersion: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  syncUrl: "",
  syncToken: "",
  schemaVersion: 1,
};
