/**
 * Matches our catalog to the public-domain exercise database (yuhonas/free-exercise-db)
 * and writes src/data/exercise-media.json with image paths + muscle metadata.
 *
 * Run: node tools/match-exercise-media.mjs
 * Source license: Unlicense (public domain). Images served from jsDelivr CDN.
 */
import { readFile, writeFile } from "node:fs/promises";

const DB_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

/** our catalog id -> candidate English name in the database */
const QUERIES = {
  "bb-back-squat": "Barbell Squat",
  "bb-front-squat": "Front Barbell Squat",
  "db-goblet-squat": "Goblet Squat",
  "machine-leg-press": "Leg Press",
  "machine-hack-squat": "Hack Squat",
  "machine-leg-extension": "Leg Extensions",
  "bb-romanian-deadlift": "Romanian Deadlift",
  "bb-deadlift": "Barbell Deadlift",
  "machine-leg-curl": "Lying Leg Curls",
  "bb-hip-thrust": "Barbell Hip Thrust",
  "db-bulgarian-split-squat": "Split Squat with Dumbbells",
  "db-walking-lunge": "Walking Lunge",
  "cable-glute-kickback": "Glute Kickback",
  "machine-calf-raise": "Standing Calf Raises",
  "machine-seated-calf-raise": "Seated Calf Raise",
  "bb-bench-press": "Barbell Bench Press - Medium Grip",
  "bb-incline-bench-press": "Barbell Incline Bench Press - Medium Grip",
  "db-bench-press": "Dumbbell Bench Press",
  "db-incline-press": "Incline Dumbbell Press",
  "machine-chest-press": "Machine Bench Press",
  "cable-fly": "Cable Crossover",
  "machine-pec-deck": "Butterfly",
  "bodyweight-dips": "Dips - Chest Version",
  "bodyweight-push-up": "Pushups",
  "bb-overhead-press": "Barbell Shoulder Press",
  "db-shoulder-press": "Dumbbell Shoulder Press",
  "db-lateral-raise": "Side Lateral Raise",
  "cable-lateral-raise": "Cable Seated Lateral Raise",
  "db-rear-delt-fly": "Reverse Flyes",
  "cable-face-pull": "Face Pull",
  "db-shrug": "Dumbbell Shrug",
  "bodyweight-pull-up": "Pullups",
  "machine-lat-pulldown": "Wide-Grip Lat Pulldown",
  "bb-row": "Bent Over Barbell Row",
  "db-row": "One-Arm Dumbbell Row",
  "cable-seated-row": "Seated Cable Rows",
  "machine-chest-supported-row": "T-Bar Row with Handle",
  "cable-straight-arm-pulldown": "Straight-Arm Pulldown",
  "machine-back-extension": "Hyperextensions (Back Extensions)",
  "bb-curl": "Barbell Curl",
  "db-curl": "Dumbbell Bicep Curl",
  "db-hammer-curl": "Hammer Curls",
  "machine-preacher-curl": "Preacher Curl",
  "cable-curl": "Standing Biceps Cable Curl",
  "bb-close-grip-bench": "Close-Grip Barbell Bench Press",
  "cable-triceps-pushdown": "Triceps Pushdown",
  "db-overhead-triceps": "Seated Triceps Press",
  "bb-skull-crusher": "Lying Triceps Press",
  "machine-triceps-dip": "Dip Machine",
  "bodyweight-plank": "Plank",
  "bodyweight-hanging-leg-raise": "Hanging Leg Raise",
  "cable-crunch": "Cable Crunch",
  "machine-ab-crunch": "Ab Crunch Machine",
  "db-wrist-curl": "Seated Palm-Up Barbell Wrist Curl",
  "db-farmers-walk": "Farmer's Walk",
  "smith-squat": "Smith Machine Squat",
  "machine-glute-kickback": "Glute Kickback",
  "machine-hip-abduction": "Thigh Abductor",
};

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|with|a|of|and|version|grip|machine|barbell|dumbbell|cable)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokens = (s) => new Set(norm(s).split(" ").filter(Boolean));

function score(query, candidate) {
  const q = tokens(query);
  const c = tokens(candidate);
  if (q.size === 0 || c.size === 0) return 0;
  let inter = 0;
  for (const t of q) if (c.has(t)) inter += 1;
  return inter / (q.size + c.size - inter);
}

const res = await fetch(DB_URL);
if (!res.ok) throw new Error(`fetch ${DB_URL} failed: ${res.status}`);
const db = await res.json();
console.log(`database: ${db.length} exercises`);

const out = {};
const problems = [];

for (const [ourId, query] of Object.entries(QUERIES)) {
  const ranked = db
    .map((e) => ({ e, s: score(query, e.name) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);

  const best = ranked[0];
  if (!best || best.s < 0.6) {
    problems.push({ ourId, query, best: best ? `${best.e.name} (${best.s.toFixed(2)})` : "none" });
    continue;
  }

  out[ourId] = {
    dbId: best.e.id,
    nameEn: best.e.name,
    images: best.e.images.map(
      (p) => `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/${p}`,
    ),
    primaryMuscles: best.e.primaryMuscles,
    secondaryMuscles: best.e.secondaryMuscles,
    score: Number(best.s.toFixed(2)),
  };

  if (best.s < 0.85) {
    console.log(
      `weak  ${ourId} -> ${best.e.name} (${best.s.toFixed(2)}) | alt: ${ranked
        .slice(1)
        .map((r) => r.e.name)
        .join(" / ")}`,
    );
  }
}

await writeFile("src/data/exercise-media.json", JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`matched: ${Object.keys(out).length}/${Object.keys(QUERIES).length}`);
if (problems.length) console.log("unmatched:", JSON.stringify(problems, null, 2));
