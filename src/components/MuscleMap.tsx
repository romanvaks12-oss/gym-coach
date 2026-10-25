import type { MuscleGroup } from "../types";

interface Patch {
  view: "front" | "back";
  /** Наши группы, которые подсвечиваются этим участком */
  muscles: MuscleGroup[];
  shape: "ellipse" | "rect" | "path";
  x: number;
  y: number;
  w: number;
  h: number;
  /** Поворот вокруг центра (градусы) */
  rotate?: number;
  d?: string;
}

/**
 * Схематичная карта мышц: перед и спина.
 * Не анатомический атлас, а быстрый ориентир «что сегодня работает».
 */
const PATCHES: Patch[] = [
  // ───────── передняя проекция ─────────
  // дельты (передняя + средняя головка)
  { view: "front", muscles: ["shoulders"], shape: "ellipse", x: 41, y: 41, w: 16, h: 13 },
  { view: "front", muscles: ["shoulders"], shape: "ellipse", x: 79, y: 41, w: 16, h: 13 },
  // грудь: верх и низ
  { view: "front", muscles: ["chest"], shape: "rect", x: 45, y: 44, w: 13, h: 10 },
  { view: "front", muscles: ["chest"], shape: "rect", x: 62, y: 44, w: 13, h: 10 },
  { view: "front", muscles: ["chest"], shape: "rect", x: 45, y: 56, w: 13, h: 9 },
  { view: "front", muscles: ["chest"], shape: "rect", x: 62, y: 56, w: 13, h: 9 },
  // бицепс и плечевая
  { view: "front", muscles: ["biceps"], shape: "ellipse", x: 34, y: 58, w: 10, h: 17 },
  { view: "front", muscles: ["biceps"], shape: "ellipse", x: 86, y: 58, w: 10, h: 17 },
  { view: "front", muscles: ["biceps"], shape: "ellipse", x: 34, y: 76, w: 8, h: 12 },
  { view: "front", muscles: ["biceps"], shape: "ellipse", x: 86, y: 76, w: 8, h: 12 },
  // предплечья
  { view: "front", muscles: ["forearms"], shape: "rect", x: 30, y: 98, w: 7, h: 16 },
  { view: "front", muscles: ["forearms"], shape: "rect", x: 30, y: 116, w: 7, h: 14 },
  { view: "front", muscles: ["forearms"], shape: "rect", x: 83, y: 98, w: 7, h: 16 },
  { view: "front", muscles: ["forearms"], shape: "rect", x: 83, y: 116, w: 7, h: 14 },
  // пресс: три пары сегментов + косые
  { view: "front", muscles: ["core"], shape: "rect", x: 54, y: 68, w: 5, h: 9 },
  { view: "front", muscles: ["core"], shape: "rect", x: 61, y: 68, w: 5, h: 9 },
  { view: "front", muscles: ["core"], shape: "rect", x: 54, y: 79, w: 5, h: 9 },
  { view: "front", muscles: ["core"], shape: "rect", x: 61, y: 79, w: 5, h: 9 },
  { view: "front", muscles: ["core"], shape: "rect", x: 54, y: 90, w: 5, h: 9 },
  { view: "front", muscles: ["core"], shape: "rect", x: 61, y: 90, w: 5, h: 9 },
  { view: "front", muscles: ["core"], shape: "rect", x: 47, y: 72, w: 5, h: 24 },
  { view: "front", muscles: ["core"], shape: "rect", x: 68, y: 72, w: 5, h: 24 },
  // квадрицепс: наружная и внутренняя головки
  { view: "front", muscles: ["quads"], shape: "ellipse", x: 49, y: 146, w: 11, h: 40 },
  { view: "front", muscles: ["quads"], shape: "ellipse", x: 56, y: 156, w: 8, h: 30 },
  { view: "front", muscles: ["quads"], shape: "ellipse", x: 71, y: 146, w: 11, h: 40 },
  { view: "front", muscles: ["quads"], shape: "ellipse", x: 64, y: 156, w: 8, h: 30 },
  // икры
  { view: "front", muscles: ["calves"], shape: "ellipse", x: 50, y: 200, w: 9, h: 28 },
  { view: "front", muscles: ["calves"], shape: "ellipse", x: 70, y: 200, w: 9, h: 28 },

  // ───────── задняя проекция ─────────
  // трапеции: верх и середина
  { view: "back", muscles: ["traps"], shape: "rect", x: 53, y: 33, w: 14, h: 8 },
  { view: "back", muscles: ["traps"], shape: "rect", x: 55, y: 42, w: 10, h: 10 },
  // дельты (задняя головка)
  { view: "back", muscles: ["shoulders"], shape: "ellipse", x: 41, y: 41, w: 16, h: 13 },
  { view: "back", muscles: ["shoulders"], shape: "ellipse", x: 79, y: 41, w: 16, h: 13 },
  // широчайшие: два «крыла»
  { view: "back", muscles: ["lats"], shape: "ellipse", x: 49, y: 62, w: 17, h: 26, rotate: 12 },
  { view: "back", muscles: ["lats"], shape: "ellipse", x: 71, y: 62, w: 17, h: 26, rotate: -12 },
  // середина спины и разгибатели
  { view: "back", muscles: ["back"], shape: "rect", x: 55, y: 52, w: 10, h: 14 },
  { view: "back", muscles: ["back"], shape: "rect", x: 55, y: 68, w: 10, h: 12 },
  { view: "back", muscles: ["back"], shape: "rect", x: 51, y: 92, w: 6, h: 26 },
  { view: "back", muscles: ["back"], shape: "rect", x: 63, y: 92, w: 6, h: 26 },
  // трицепс: длинная и латеральная головки
  { view: "back", muscles: ["triceps"], shape: "ellipse", x: 34, y: 58, w: 9, h: 18 },
  { view: "back", muscles: ["triceps"], shape: "ellipse", x: 86, y: 58, w: 9, h: 18 },
  { view: "back", muscles: ["triceps"], shape: "ellipse", x: 35, y: 78, w: 8, h: 12 },
  { view: "back", muscles: ["triceps"], shape: "ellipse", x: 85, y: 78, w: 8, h: 12 },
  // ягодицы: большая и средняя
  { view: "back", muscles: ["glutes"], shape: "ellipse", x: 51, y: 123, w: 15, h: 16 },
  { view: "back", muscles: ["glutes"], shape: "ellipse", x: 69, y: 123, w: 15, h: 16 },
  { view: "back", muscles: ["glutes"], shape: "ellipse", x: 46, y: 114, w: 8, h: 9 },
  { view: "back", muscles: ["glutes"], shape: "ellipse", x: 74, y: 114, w: 8, h: 9 },
  // бицепс бедра: две головки
  { view: "back", muscles: ["hamstrings"], shape: "ellipse", x: 50, y: 152, w: 10, h: 36 },
  { view: "back", muscles: ["hamstrings"], shape: "ellipse", x: 55, y: 158, w: 8, h: 28 },
  { view: "back", muscles: ["hamstrings"], shape: "ellipse", x: 70, y: 152, w: 10, h: 36 },
  { view: "back", muscles: ["hamstrings"], shape: "ellipse", x: 65, y: 158, w: 8, h: 28 },
  // икры: икроножная и камбаловидная
  { view: "back", muscles: ["calves"], shape: "ellipse", x: 50, y: 196, w: 10, h: 20 },
  { view: "back", muscles: ["calves"], shape: "ellipse", x: 50, y: 216, w: 8, h: 12 },
  { view: "back", muscles: ["calves"], shape: "ellipse", x: 70, y: 196, w: 10, h: 20 },
  { view: "back", muscles: ["calves"], shape: "ellipse", x: 70, y: 216, w: 8, h: 12 },
  // предплечья сзади
  { view: "back", muscles: ["forearms"], shape: "rect", x: 30, y: 98, w: 7, h: 30 },
  { view: "back", muscles: ["forearms"], shape: "rect", x: 83, y: 98, w: 7, h: 30 },
];

function Silhouette() {
  return (
    <g>
      <g fill="#343a46" stroke="#1b1f27" strokeWidth="1">
        <path d="M40 36 H80 L77.5 96 L76 126 H44 L42.5 96 Z" />
        <rect x="30" y="36" width="10" height="66" rx="5" />
        <rect x="80" y="36" width="10" height="66" rx="5" />
        <rect x="28.5" y="96" width="8.5" height="36" rx="4" />
        <rect x="83" y="96" width="8.5" height="36" rx="4" />
        <path d="M46 122 H60 V186 H46 Z" />
        <path d="M60 122 H74 V186 H60 Z" />
        <rect x="47" y="184" width="11" height="52" rx="5" />
        <rect x="62" y="184" width="11" height="52" rx="5" />
      </g>
      <circle cx="60" cy="16" r="11" fill="#3d4452" stroke="#1b1f27" strokeWidth="1" />
      <rect x="55" y="25" width="10" height="9" rx="3" fill="#3d4452" stroke="#1b1f27" strokeWidth="1" />
    </g>
  );
}

function level(muscles: MuscleGroup[], primary: MuscleGroup, secondary: MuscleGroup[]) {
  if (muscles.includes(primary)) return "primary";
  if (muscles.some((m) => secondary.includes(m))) return "secondary";
  return "none";
}

export default function MuscleMap({
  primary,
  secondary,
}: {
  primary: MuscleGroup;
  secondary: MuscleGroup[];
}) {
  const render = (view: "front" | "back") =>
    PATCHES.filter((p) => p.view === view).map((patch, index) => {
      const state = level(patch.muscles, primary, secondary);
      if (state === "none") return null;

      const fill = state === "primary" ? "url(#primaryGrad)" : "var(--accent-dim)";
      const stroke = state === "primary" ? "#eafff3" : "transparent";
      const common = { fill, stroke, strokeWidth: state === "primary" ? 0.7 : 0, opacity: 0.95 };

      if (patch.shape === "ellipse") {
        return (
          <ellipse
            key={`${view}-${index}`}
            cx={patch.x}
            cy={patch.y}
            rx={patch.w / 2}
            ry={patch.h / 2}
            transform={patch.rotate ? `rotate(${patch.rotate} ${patch.x} ${patch.y})` : undefined}
            {...common}
          />
        );
      }
      return (
        <rect
          key={`${view}-${index}`}
          x={patch.x}
          y={patch.y}
          width={patch.w}
          height={patch.h}
          rx={Math.min(patch.w, patch.h) / 2.6}
          {...common}
        />
      );
    });

  return (
    <div className="musclemap">
      <svg className="musclemap__defs" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="primaryGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9ef0bb" />
            <stop offset="100%" stopColor="#4fbe86" />
          </linearGradient>
        </defs>
      </svg>
      <figure className="musclemap__view">
        <svg viewBox="0 0 120 245" role="img" aria-label="Передняя проекция">
          <Silhouette />
          {render("front")}
        </svg>
        <figcaption>перед</figcaption>
      </figure>
      <figure className="musclemap__view">
        <svg viewBox="0 0 120 245" role="img" aria-label="Задняя проекция">
          <Silhouette />
          {render("back")}
        </svg>
        <figcaption>спина</figcaption>
      </figure>
    </div>
  );
}
