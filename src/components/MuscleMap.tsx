import type { MuscleGroup } from "../types";

interface Patch {
  view: "front" | "back";
  muscles: MuscleGroup[];
  shape: "ellipse" | "rect";
  x: number;
  y: number;
  w: number;
  h: number;
}

const PATCHES: Patch[] = [
  // ── передняя проекция ──
  { view: "front", muscles: ["shoulders"], shape: "ellipse", x: 42, y: 42, w: 18, h: 14 },
  { view: "front", muscles: ["shoulders"], shape: "ellipse", x: 78, y: 42, w: 18, h: 14 },
  { view: "front", muscles: ["chest"], shape: "rect", x: 44, y: 44, w: 14, h: 22 },
  { view: "front", muscles: ["chest"], shape: "rect", x: 62, y: 44, w: 14, h: 22 },
  { view: "front", muscles: ["biceps"], shape: "ellipse", x: 35, y: 62, w: 11, h: 24 },
  { view: "front", muscles: ["biceps"], shape: "ellipse", x: 85, y: 62, w: 11, h: 24 },
  { view: "front", muscles: ["forearms"], shape: "rect", x: 29, y: 100, w: 8, h: 30 },
  { view: "front", muscles: ["forearms"], shape: "rect", x: 83, y: 100, w: 8, h: 30 },
  { view: "front", muscles: ["core"], shape: "rect", x: 52, y: 70, w: 16, h: 40 },
  { view: "front", muscles: ["quads"], shape: "rect", x: 47, y: 128, w: 12, h: 44 },
  { view: "front", muscles: ["quads"], shape: "rect", x: 61, y: 128, w: 12, h: 44 },
  { view: "front", muscles: ["calves"], shape: "rect", x: 48, y: 186, w: 10, h: 36 },
  { view: "front", muscles: ["calves"], shape: "rect", x: 62, y: 186, w: 10, h: 36 },
  // ── задняя проекция ──
  { view: "back", muscles: ["traps"], shape: "rect", x: 52, y: 34, w: 16, h: 16 },
  { view: "back", muscles: ["lats", "back"], shape: "ellipse", x: 48, y: 64, w: 20, h: 32 },
  { view: "back", muscles: ["lats", "back"], shape: "ellipse", x: 72, y: 64, w: 20, h: 32 },
  { view: "back", muscles: ["back"], shape: "rect", x: 55, y: 84, w: 10, h: 30 },
  { view: "back", muscles: ["triceps"], shape: "ellipse", x: 35, y: 64, w: 11, h: 24 },
  { view: "back", muscles: ["triceps"], shape: "ellipse", x: 85, y: 64, w: 11, h: 24 },
  { view: "back", muscles: ["shoulders"], shape: "ellipse", x: 42, y: 42, w: 18, h: 14 },
  { view: "back", muscles: ["shoulders"], shape: "ellipse", x: 78, y: 42, w: 18, h: 14 },
  { view: "back", muscles: ["glutes"], shape: "ellipse", x: 51, y: 126, w: 16, h: 18 },
  { view: "back", muscles: ["glutes"], shape: "ellipse", x: 69, y: 126, w: 16, h: 18 },
  { view: "back", muscles: ["hamstrings"], shape: "rect", x: 47, y: 140, w: 12, h: 36 },
  { view: "back", muscles: ["hamstrings"], shape: "rect", x: 61, y: 140, w: 12, h: 36 },
  { view: "back", muscles: ["calves"], shape: "rect", x: 48, y: 186, w: 10, h: 36 },
  { view: "back", muscles: ["calves"], shape: "rect", x: 62, y: 186, w: 10, h: 36 },
];

const BODY = "#2b303b";
const SKIN = "#3a4150";

function Silhouette() {
  return (
    <g fill={BODY}>
      <circle cx="60" cy="16" r="11" fill={SKIN} />
      <rect x="55" y="25" width="10" height="9" rx="3" fill={SKIN} />
      <path d="M40 36 H80 L77 110 L75 126 H45 L43 110 Z" />
      <rect x="30" y="38" width="10" height="62" rx="5" />
      <rect x="80" y="38" width="10" height="62" rx="5" />
      <rect x="28" y="98" width="9" height="34" rx="4" />
      <rect x="83" y="98" width="9" height="34" rx="4" />
      <rect x="46" y="124" width="14" height="60" rx="7" />
      <rect x="60" y="124" width="14" height="60" rx="7" />
      <rect x="47" y="182" width="12" height="52" rx="6" />
      <rect x="61" y="182" width="12" height="52" rx="6" />
    </g>
  );
}

function intensity(muscles: MuscleGroup[], primary: MuscleGroup, secondary: MuscleGroup[]) {
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
      const level = intensity(patch.muscles, primary, secondary);
      const fill =
        level === "primary" ? "var(--accent)" : level === "secondary" ? "var(--accent-dim)" : "transparent";
      const common = { fill, opacity: level === "none" ? 0 : 1 } as const;

      return patch.shape === "ellipse" ? (
        <ellipse
          key={`${view}-${index}`}
          cx={patch.x}
          cy={patch.y}
          rx={patch.w / 2}
          ry={patch.h / 2}
          {...common}
        />
      ) : (
        <rect
          key={`${view}-${index}`}
          x={patch.x}
          y={patch.y}
          width={patch.w}
          height={patch.h}
          rx={Math.min(patch.w, patch.h) / 2.4}
          {...common}
        />
      );
    });

  return (
    <div className="musclemap">
      <figure className="musclemap__view">
        <svg viewBox="0 0 120 240" role="img" aria-label="Передняя проекция">
          <Silhouette />
          {render("front")}
        </svg>
        <figcaption>перед</figcaption>
      </figure>
      <figure className="musclemap__view">
        <svg viewBox="0 0 120 240" role="img" aria-label="Задняя проекция">
          <Silhouette />
          {render("back")}
        </svg>
        <figcaption>спина</figcaption>
      </figure>
    </div>
  );
}
