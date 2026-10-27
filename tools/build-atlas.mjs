/**
 * Собирает данные карты мышц из SVG-исходника.
 *
 * Исходник: src/components/atlas.svg — левая половина фигуры, вид спереди и сзади,
 * холст 200×460, ось симметрии x = 100. Правая половина дорисовывается в компоненте
 * зеркалом, поэтому в SVG её нет.
 *
 * Группы мышц определяются по комментарию перед путём (<!-- TRAPS --> и т.п.).
 * Запуск: node tools/build-atlas.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "src", "components", "atlas.svg");
const target = join(root, "src", "components", "atlas.ts");

/** Комментарий в SVG → id группы из src/types.ts */
const GROUPS = {
  TRAPS: "traps",
  SHOULDERS: "shoulders",
  CHEST: "chest",
  LATS: "lats",
  BACK: "back",
  BICEPS: "biceps",
  TRICEPS: "triceps",
  FOREARMS: "forearms",
  CORE: "core",
  QUADS: "quads",
  HAMSTRINGS: "hamstrings",
  GLUTES: "glutes",
  CALVES: "calves",
};

const svg = readFileSync(source, "utf8");

/** Режет SVG на группы по id: body-front, muscles-front, details-front, … */
function group(id) {
  const start = svg.indexOf(`<g id="${id}">`);
  if (start === -1) throw new Error(`в atlas.svg нет группы ${id}`);
  const end = svg.indexOf("</g>", start);
  return svg.slice(start, end);
}

/** Все пути группы вместе с последним комментарием перед каждым. */
function paths(id) {
  const body = group(id);
  const out = [];
  let label = null;
  const re = /<!--([\s\S]*?)-->|<path\b([^>]*)\/?>/g;
  let match;
  while ((match = re.exec(body)) !== null) {
    if (match[1] !== undefined) {
      // «TRAPS (Upper, Middle…)» → TRAPS
      label = match[1].replace(/[^A-ZА-Я _]/g, " ").trim().split(/\s+/)[0];
      continue;
    }
    const attrs = match[2];
    const d = /d="([^"]+)"/.exec(attrs)?.[1];
    if (!d) throw new Error(`путь без d в ${id}`);
    out.push({ label, d, fill: /fill="none"/.test(attrs) });
  }
  return out;
}

const round = (value) => Math.round(value * 10) / 10;

/**
 * Контур без замыкающей линии по оси симметрии. Заливке она нужна (иначе
 * половина закрывается по диагонали), а обводке — нет: отражённая половина
 * нарисует её второй раз, и через всю фигуру пойдёт шов.
 */
function withoutAxis(d) {
  const match = /^(.*?)\s*L\s*100\s+[\d.]+\s*Z$/i.exec(d);
  if (!match) throw new Error("контур тела должен замыкаться линией по оси x = 100");
  return match[1];
}

const body = [
  ...paths("body-front").map((p) => ({ view: "front", d: p.d, outline: withoutAxis(p.d) })),
  ...paths("body-back").map((p) => ({ view: "back", d: p.d, outline: withoutAxis(p.d) })),
];

const muscles = [];
for (const view of ["front", "back"]) {
  for (const path of paths(`muscles-${view}`)) {
    const muscle = GROUPS[path.label];
    if (!muscle) throw new Error(`неизвестная группа «${path.label}» в muscles-${view}`);
    const previous = muscles[muscles.length - 1];
    // Соседние пути с той же меткой — это одна группа (дельты, квадрицепс и т.д.)
    if (previous && previous.view === view && previous.label === path.label) {
      previous.d.push(path.d);
      continue;
    }
    muscles.push({ view, label: path.label, muscles: [muscle], d: [path.d] });
  }
}

const details = [];
for (const view of ["front", "back"]) {
  for (const path of paths(`details-${view}`)) {
    details.push({ view, d: path.d });
  }
}

const q = (value) => `"${value}"`;
const lines = [];
lines.push(`/* Сгенерировано из src/components/atlas.svg — не править руками.`);
lines.push(` * Пересобрать: node tools/build-atlas.mjs`);
lines.push(` *`);
lines.push(` * Фигура — в память о Вадиме Иванове. */`);
lines.push(`import type { MuscleGroup } from "../types";`);
lines.push(``);
lines.push(`export interface AtlasView {`);
lines.push(`  view: "front" | "back";`);
lines.push(`  d: string;`);
lines.push(`}`);
lines.push(``);
lines.push(`/** Контур тела: заливка замкнута по оси, обводка — без линии по оси. */`);
lines.push(`export interface AtlasBody extends AtlasView {`);
lines.push(`  outline: string;`);
lines.push(`}`);
lines.push(``);
lines.push(`export interface AtlasMuscle extends AtlasView {`);
lines.push(`  muscles: MuscleGroup[];`);
lines.push(`}`);
lines.push(``);
lines.push(`export const ATLAS_BODY: AtlasBody[] = [`);
for (const part of body) {
  lines.push(`  { view: ${q(part.view)}, d: ${q(part.d)}, outline: ${q(part.outline)} },`);
}
lines.push(`];`);
lines.push(``);
lines.push(`export const ATLAS_MUSCLES: AtlasMuscle[] = [`);
for (const part of muscles) {
  const names = part.muscles.map(q).join(", ");
  lines.push(`  { view: ${q(part.view)}, muscles: [${names}], d: ${q(part.d[0])} },`);
  for (const extra of part.d.slice(1)) {
    lines.push(`  { view: ${q(part.view)}, muscles: [${names}], d: ${q(extra)} },`);
  }
}
lines.push(`];`);
lines.push(``);
lines.push(`export const ATLAS_DETAILS: AtlasView[] = [`);
for (const part of details) {
  lines.push(`  { view: ${q(part.view)}, d: ${q(part.d)} },`);
}
lines.push(`];`);
lines.push(``);

writeFileSync(target, lines.join("\n"), "utf8");

const counts = {
  body: body.length,
  muscles: muscles.reduce((sum, m) => sum + m.d.length, 0),
  details: details.length,
  groups: [...new Set(muscles.map((m) => m.muscles[0]))],
};
console.log(`atlas.ts: ${round(lines.join("\n").length / 1024)} КБ`);
console.log(`тел: ${counts.body}, мышц: ${counts.muscles}, линий: ${counts.details}`);
console.log(`группы (${counts.groups.length}/13): ${counts.groups.join(", ")}`);
