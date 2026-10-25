import type { MuscleGroup } from "../types";

interface Part {
  view: "front" | "back";
  muscles: MuscleGroup[];
  /** Путь в координатах 120×250 */
  d: string;
}

/**
 * Схематичный, но человеческий силуэт: перед и спина.
 * Основа — тело, сверху — «мясные» зоны. Подсвечиваем только рабочие группы.
 */
const MUSCLES: Part[] = [
  // ───────── перед ─────────
  {
    view: "front",
    muscles: ["traps"],
    d: "M50 35 C54 38 66 38 70 35 L73.5 41.5 L60 48 L46.5 41.5 Z",
  },
  {
    view: "front",
    muscles: ["shoulders"],
    d: "M37 43 C31 44 27 49 26 56 C25.6 61.5 26.4 66 28 69 C31 68.5 34 66.5 36 63.5 C36.6 57 36.7 49 37 43 Z",
  },
  {
    view: "front",
    muscles: ["shoulders"],
    d: "M83 43 C89 44 93 49 94 56 C94.4 61.5 93.6 66 92 69 C89 68.5 86 66.5 84 63.5 C83.4 57 83.3 49 83 43 Z",
  },
  {
    view: "front",
    muscles: ["chest"],
    d: "M47 47 C52.5 43.5 58 45 59 49 L59 66 C56 70 49.5 69 47 64 C45.5 58.5 45.6 51.5 47 47 Z",
  },
  {
    view: "front",
    muscles: ["chest"],
    d: "M73 47 C67.5 43.5 62 45 61 49 L61 66 C64 70 70.5 69 73 64 C74.5 58.5 74.4 51.5 73 47 Z",
  },
  {
    view: "front",
    muscles: ["biceps"],
    d: "M28 65 C26.4 74 26.4 84 28 92 L36.5 90 C37.2 83 37.2 73 36.4 65 Z",
  },
  {
    view: "front",
    muscles: ["biceps"],
    d: "M92 65 C93.6 74 93.6 84 92 92 L83.5 90 C82.8 83 82.8 73 83.6 65 Z",
  },
  {
    view: "front",
    muscles: ["forearms"],
    d: "M27.6 97 C26.2 108 26.6 122 28.4 134 L35 132 C35.7 120 35.8 108 35.2 96 Z",
  },
  {
    view: "front",
    muscles: ["forearms"],
    d: "M92.4 97 C93.8 108 93.4 122 91.6 134 L85 132 C84.3 120 84.2 108 84.8 96 Z",
  },
  // пресс: три пары сегментов
  { view: "front", muscles: ["core"], d: "M54.6 70.5 H59.3 V78 H54.6 Z" },
  { view: "front", muscles: ["core"], d: "M60.7 70.5 H65.4 V78 H60.7 Z" },
  { view: "front", muscles: ["core"], d: "M54.3 79.5 H59.3 V87 H54.3 Z" },
  { view: "front", muscles: ["core"], d: "M60.7 79.5 H65.7 V87 H60.7 Z" },
  { view: "front", muscles: ["core"], d: "M54 88.5 H59.4 V96.5 H54 Z" },
  { view: "front", muscles: ["core"], d: "M60.6 88.5 H66 V96.5 H60.6 Z" },
  { view: "front", muscles: ["core"], d: "M53 97.5 H67 V106.5 C63 109 57 109 53 106.5 Z" },
  // косые
  {
    view: "front",
    muscles: ["core"],
    d: "M48.6 72 C46.6 80 46.7 92 49.4 101.5 L52.6 99.5 L53.4 74 Z",
  },
  {
    view: "front",
    muscles: ["core"],
    d: "M71.4 72 C73.4 80 73.3 92 70.6 101.5 L67.4 99.5 L66.6 74 Z",
  },
  {
    view: "front",
    muscles: ["quads"],
    d: "M44 127 C42 142 41.6 160 43 178 L44.6 192 L57 190 C57.6 172 57.6 149 57 129 Z",
  },
  {
    view: "front",
    muscles: ["quads"],
    d: "M76 127 C78 142 78.4 160 77 178 L75.4 192 L63 190 C62.4 172 62.4 149 63 129 Z",
  },
  {
    view: "front",
    muscles: ["calves"],
    d: "M44.6 201 C43.6 212 44.6 226 46.8 236.5 L55.2 234.5 C56.2 222 56.2 210 55.2 201 Z",
  },
  {
    view: "front",
    muscles: ["calves"],
    d: "M75.4 201 C76.4 212 75.4 226 73.2 236.5 L64.8 234.5 C63.8 222 63.8 210 64.8 201 Z",
  },

  // ───────── спина ─────────
  {
    view: "back",
    muscles: ["traps"],
    d: "M51.5 34 L60 43 L68.5 34 L74 41 L60 60 L46 41 Z",
  },
  {
    view: "back",
    muscles: ["shoulders"],
    d: "M37 43 C31 44 27 49 26 56 C25.6 61.5 26.4 66 28 69 C31 68.5 34 66.5 36 63.5 C36.6 57 36.7 49 37 43 Z",
  },
  {
    view: "back",
    muscles: ["shoulders"],
    d: "M83 43 C89 44 93 49 94 56 C94.4 61.5 93.6 66 92 69 C89 68.5 86 66.5 84 63.5 C83.4 57 83.3 49 83 43 Z",
  },
  {
    view: "back",
    muscles: ["lats"],
    d: "M57 61 C52 62.5 47.5 67 46 75 C44.6 83 45.4 91 47.5 96 L57.5 92 Z",
  },
  {
    view: "back",
    muscles: ["lats"],
    d: "M63 61 C68 62.5 72.5 67 74 75 C75.4 83 74.6 91 72.5 96 L62.5 92 Z",
  },
  {
    view: "back",
    muscles: ["back"],
    d: "M55.4 62 H64.6 V91 H55.4 Z",
  },
  {
    view: "back",
    muscles: ["back"],
    d: "M56 93 C55 104 55 116 56.2 126 L59.3 126 L59.3 93 Z",
  },
  {
    view: "back",
    muscles: ["back"],
    d: "M64 93 C65 104 65 116 63.8 126 L60.7 126 L60.7 93 Z",
  },
  {
    view: "back",
    muscles: ["triceps"],
    d: "M28 65 C26.6 74 26.8 85 28.4 93 L36.5 91 C37 82 37 72 36.4 65 Z",
  },
  {
    view: "back",
    muscles: ["triceps"],
    d: "M92 65 C93.4 74 93.2 85 91.6 93 L83.5 91 C83 82 83 72 83.6 65 Z",
  },
  {
    view: "back",
    muscles: ["forearms"],
    d: "M27.6 97 C26.2 108 26.6 122 28.4 134 L35 132 C35.7 120 35.8 108 35.2 96 Z",
  },
  {
    view: "back",
    muscles: ["forearms"],
    d: "M92.4 97 C93.8 108 93.4 122 91.6 134 L85 132 C84.3 120 84.2 108 84.8 96 Z",
  },
  {
    view: "back",
    muscles: ["glutes"],
    d: "M60 112 C54 111 48.6 115 46.6 122 C45.2 129 47 136 51.5 139.5 C55 142 59 141.5 60 139 Z",
  },
  {
    view: "back",
    muscles: ["glutes"],
    d: "M60 112 C66 111 71.4 115 73.4 122 C74.8 129 73 136 68.5 139.5 C65 142 61 141.5 60 139 Z",
  },
  {
    view: "back",
    muscles: ["hamstrings"],
    d: "M44 141 C42 155 42 172 44 188 L57 186 C57.6 170 57.6 152 57 141 Z",
  },
  {
    view: "back",
    muscles: ["hamstrings"],
    d: "M76 141 C78 155 78 172 76 188 L63 186 C62.4 170 62.4 152 63 141 Z",
  },
  {
    view: "back",
    muscles: ["calves"],
    d: "M44.8 200 C42.8 208 43.4 218 45.6 224.5 L54.8 222.5 C56.2 214 56.2 206 55.2 200 Z",
  },
  {
    view: "back",
    muscles: ["calves"],
    d: "M75.2 200 C77.2 208 76.6 218 74.4 224.5 L65.2 222.5 C63.8 214 63.8 206 64.8 200 Z",
  },
];

/** Базовое тело: голова, шея, торс, руки, ноги, стопы */
function Body() {
  return (
    <g className="musclemap__body">
      <ellipse cx="60" cy="17" rx="11" ry="13.5" />
      <path d="M54.5 28 H65.5 L67 38 H53 Z" />
      <path d="M60 33 C51 33 44 36.5 41 42 C38 47 36.5 52 36 58 C35.6 64 37.5 72 39.5 78 C41 84 42 88 43 92 C42.5 100 42 108 43 114 C43.5 120 46 125 50 128 L60 130 L70 128 C74 125 76.5 120 77 114 C78 108 77.5 100 77 92 C78 88 79 84 80.5 78 C82.5 72 84.4 64 84 58 C83.5 52 82 47 79 42 C76 36.5 69 33 60 33 Z" />
      <g className="musclemap__limb">
        <path d="M37 44 C31 45 27.5 50 26.5 57 L25 86 C24.6 91 25.4 95 27 98 L26 134 C25.7 140 27 144 30 144 C33 144 34 140 33.8 134 L34.5 99 C36 96 36.8 92 37 87 L38 57 C38.2 50 38.6 45 37 44 Z" />
        <rect x="26.6" y="142.5" width="7.6" height="12.5" rx="3.6" />
      </g>
      <g className="musclemap__limb">
        <path d="M83 44 C89 45 92.5 50 93.5 57 L95 86 C95.4 91 94.6 95 93 98 L94 134 C94.3 140 93 144 90 144 C87 144 86 140 86.2 134 L85.5 99 C84 96 83.2 92 83 87 L82 57 C81.8 50 81.4 45 83 44 Z" />
        <rect x="85.8" y="142.5" width="7.6" height="12.5" rx="3.6" />
      </g>
      <g className="musclemap__limb">
        <path d="M43 122 C41 135 40.6 155 42 176 L43.6 196 L44.8 214 C44.8 226 45.8 236 47.2 241 L56 240 C57 232 57.5 222 57 212 L56.6 196 L57 176 C58 155 58.4 135 57 122 Z" />
        <path d="M46.5 239.5 L56.5 238.5 L56.5 245.5 C56.5 248 53.5 248.8 50 248.8 L46.8 248.2 C45.4 246.4 45.4 242 46.5 239.5 Z" />
      </g>
      <g className="musclemap__limb">
        <path d="M77 122 C79 135 79.4 155 78 176 L76.4 196 L75.2 214 C75.2 226 74.2 236 72.8 241 L64 240 C63 232 62.5 222 63 212 L63.4 196 L63 176 C62 155 61.6 135 63 122 Z" />
        <path d="M73.5 239.5 L63.5 238.5 L63.5 245.5 C63.5 248 66.5 248.8 70 248.8 L73.2 248.2 C74.6 246.4 74.6 242 73.5 239.5 Z" />
      </g>
    </g>
  );
}

function level(part: Part, primary: MuscleGroup, secondary: MuscleGroup[]) {
  if (part.muscles.includes(primary)) return "primary";
  if (part.muscles.some((m) => secondary.includes(m))) return "secondary";
  return "idle";
}

export default function MuscleMap({
  primary,
  secondary,
}: {
  primary: MuscleGroup;
  secondary: MuscleGroup[];
}) {
  const render = (view: "front" | "back") => (
    <g className="musclemap__parts">
      {MUSCLES.filter((part) => part.view === view).map((part, index) => {
        const state = level(part, primary, secondary);
        const className =
          state === "primary"
            ? "muscle muscle--primary"
            : state === "secondary"
              ? "muscle muscle--secondary"
              : "muscle";
        return <path key={`${view}-${index}`} d={part.d} className={className} />;
      })}
    </g>
  );

  return (
    <div className="musclemap">
      <figure className="musclemap__view">
        <svg viewBox="0 0 120 252" role="img" aria-label="Передняя проекция тела">
          <Body />
          {render("front")}
        </svg>
        <figcaption>перед</figcaption>
      </figure>
      <figure className="musclemap__view">
        <svg viewBox="0 0 120 252" role="img" aria-label="Задняя проекция тела">
          <Body />
          {render("back")}
        </svg>
        <figcaption>спина</figcaption>
      </figure>
      <div className="musclemap__legend">
        <span>
          <i className="dot dot--primary" />
          основная
        </span>
        <span>
          <i className="dot dot--secondary" />
          помогает
        </span>
      </div>
    </div>
  );
}
