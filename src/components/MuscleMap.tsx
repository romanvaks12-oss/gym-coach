import { useId } from "react";
import type { MuscleGroup } from "../types";

/**
 * Атлас тела: перед и спина. Рисуем половину силуэта и зеркалим — так левая
 * и правая стороны всегда совпадают. Стиль — анатомический плакат: контурная
 * линия, «мясные» зоны отдельными формами, активные группы заливаются акцентом.
 *
 * Фигура — в память о Вадиме Иванове.
 */
interface Part {
  view: "front" | "back";
  muscles: MuscleGroup[];
  /** Путь в системе 200×460; зеркалится автоматически */
  d: string;
  /** Форма по центру: не зеркалим (пресс, позвоночник) */
  center?: boolean;
}

interface Base {
  view: "front" | "back";
  d: string;
  center?: boolean;
}

/** Контур тела, который рисуется под мышцами. */
const BODY: Base[] = [
  // голова и шея
  {
    view: "front",
    center: true,
    d: "M100,17 C108,17 114,25 114,35 C114,46 108,53 100,53 C92,53 86,46 86,35 C86,25 92,17 100,17 Z",
  },
  {
    view: "back",
    center: true,
    d: "M100,17 C108,17 114,25 114,35 C114,46 108,53 100,53 C92,53 86,46 86,35 C86,25 92,17 100,17 Z",
  },
  {
    view: "front",
    center: true,
    d: "M90,48 C91,56 90,61 86,65 L114,65 C110,61 109,56 110,48 Z",
  },
  {
    view: "back",
    center: true,
    d: "M90,48 C91,56 90,61 86,65 L114,65 C110,61 109,56 110,48 Z",
  },
  // торс
  {
    view: "front",
    center: true,
    d: "M72,74 C64,81 60,95 62,109 C64,124 69,139 75,151 C79,161 79,171 77,181 C75,192 79,203 85,211 L86,220 L114,220 L115,211 C121,203 125,192 123,181 C121,171 121,161 125,151 C131,139 136,124 138,109 C140,95 137,80 128,74 C121,68 111,64 100,64 C89,64 79,68 72,74 Z",
  },
  {
    view: "back",
    center: true,
    d: "M72,74 C64,81 60,95 62,109 C64,124 69,139 75,151 C79,161 79,171 77,181 C75,192 79,203 85,211 L86,220 L114,220 L115,211 C121,203 125,192 123,181 C121,171 121,161 125,151 C131,139 136,124 138,109 C140,95 137,80 128,74 C121,68 111,64 100,64 C89,64 79,68 72,74 Z",
  },
  // плечо и рука
  {
    view: "front",
    d: "M60,73 C52,79 47,93 46,109 C45,135 46,161 49,187 C50,195 52,199 56,199 L68,199 C70,193 71,185 70,177 C69,153 69,125 70,105 C70,89 66,79 60,73 Z",
  },
  {
    view: "back",
    d: "M60,73 C52,79 47,93 46,109 C45,135 46,161 49,187 C50,195 52,199 56,199 L68,199 C70,193 71,185 70,177 C69,153 69,125 70,105 C70,89 66,79 60,73 Z",
  },
  // предплечье и кисть
  {
    view: "front",
    d: "M56,199 C52,223 48,253 45,283 C44,293 43,299 43,305 C39,311 37,321 40,328 C43,334 49,335 53,331 C57,327 57,317 55,309 L55,301 C58,281 62,251 67,221 C68,213 69,205 69,199 Z",
  },
  {
    view: "back",
    d: "M56,199 C52,223 48,253 45,283 C44,293 43,299 43,305 C39,311 37,321 40,328 C43,334 49,335 53,331 C57,327 57,317 55,309 L55,301 C58,281 62,251 67,221 C68,213 69,205 69,199 Z",
  },
  // нога + стопа
  {
    view: "front",
    d: "M82,210 C76,222 73,242 74,264 C74,288 78,312 83,334 C82,342 81,348 81,354 C78,372 78,396 81,416 C82,425 84,431 86,433 L97,433 L97,415 C96,395 96,373 97,355 C98,345 99,339 100,334 C99,312 98,288 98,264 C98,242 99,224 100,212 Z",
  },
  {
    view: "back",
    d: "M82,210 C76,222 73,242 74,264 C74,288 78,312 83,334 C82,342 81,348 81,354 C78,372 78,396 81,416 C82,425 84,431 86,433 L97,433 L97,415 C96,395 96,373 97,355 C98,345 99,339 100,334 C99,312 98,288 98,264 C98,242 99,224 100,212 Z",
  },
  {
    view: "front",
    d: "M86,433 L97,433 L99,440 C99,444 94,446 89,446 L83,444 C81,441 82,436 86,433 Z",
  },
  {
    view: "back",
    d: "M86,433 L97,433 L99,440 C99,444 94,446 89,446 L83,444 C81,441 82,436 86,433 Z",
  },
];

const MUSCLES: Part[] = [
  // ─────────── перед ───────────
  {
    view: "front",
    muscles: ["traps"],
    d: "M100,56 L78,70 C75,74 77,79 82,80 L100,67 Z",
  },
  {
    view: "front",
    muscles: ["shoulders"],
    d: "M74,72 C64,74 56,83 53,95 C51,105 53,114 57,119 C63,121 69,116 72,108 C74,98 74,84 74,72 Z",
  },
  {
    view: "front",
    muscles: ["chest"],
    d: "M100,82 C92,80 83,82 78,89 C74,95 74,105 77,113 C80,121 90,127 100,124 Z",
  },
  {
    view: "front",
    muscles: ["biceps"],
    d: "M62,80 C56,88 53,102 53,118 C53,138 55,160 57,180 L67,182 C68,160 69,136 69,116 C69,98 68,86 66,79 Z",
  },
  {
    view: "front",
    muscles: ["forearms"],
    d: "M57,192 C54,216 50,246 47,276 C46,286 45,294 45,300 L54,302 C57,284 61,258 64,232 C66,216 67,204 67,194 Z",
  },
  // пресс: 4 пары сегментов
  { view: "front", muscles: ["core"], center: true, d: "M89,129 h9 v11 h-9 z" },
  { view: "front", muscles: ["core"], center: true, d: "M102,129 h9 v11 h-9 z" },
  { view: "front", muscles: ["core"], center: true, d: "M89,143 h9 v11 h-9 z" },
  { view: "front", muscles: ["core"], center: true, d: "M102,143 h9 v11 h-9 z" },
  { view: "front", muscles: ["core"], center: true, d: "M89,157 h9 v11 h-9 z" },
  { view: "front", muscles: ["core"], center: true, d: "M102,157 h9 v11 h-9 z" },
  { view: "front", muscles: ["core"], center: true, d: "M89,171 h9 v11 h-9 z" },
  { view: "front", muscles: ["core"], center: true, d: "M102,171 h9 v11 h-9 z" },
  // косые
  {
    view: "front",
    muscles: ["core"],
    d: "M78,130 C75,143 75,159 78,173 C80,181 84,186 88,188 L88,131 Z",
  },
  // зубчатые — тонкие полоски под грудью
  { view: "front", muscles: ["core"], d: "M79,119 L86,121 L86,124 L79,122 Z" },
  { view: "front", muscles: ["core"], d: "M79,125 L87,127 L87,130 L79,128 Z" },
  {
    view: "front",
    muscles: ["quads"],
    d: "M86,220 C79,229 76,245 77,265 C78,287 82,309 86,329 L100,331 C99,311 98,287 98,263 C98,241 99,227 100,221 Z",
  },
  {
    view: "front",
    muscles: ["calves"],
    d: "M83,344 C80,360 80,380 82,400 C83,412 85,422 86,426 L95,426 C94,412 93,392 93,372 C93,358 94,350 95,342 Z",
  },

  // ─────────── спина ───────────
  {
    view: "back",
    muscles: ["traps"],
    d: "M100,56 L80,71 C76,76 79,83 85,88 L100,108 Z",
  },
  {
    view: "back",
    muscles: ["shoulders"],
    d: "M74,72 C64,74 56,83 53,95 C51,105 53,114 57,119 C63,121 69,116 72,108 C74,98 74,84 74,72 Z",
  },
  {
    view: "back",
    muscles: ["lats"],
    d: "M80,89 C72,98 69,118 72,141 C74,159 80,173 88,181 C92,183 95,180 95,171 C95,148 93,120 91,104 C89,95 85,89 80,89 Z",
  },
  {
    view: "back",
    muscles: ["back"],
    d: "M90,112 C88,132 88,158 90,182 L99,186 L99,112 Z",
  },
  {
    view: "back",
    muscles: ["triceps"],
    d: "M62,80 C55,89 52,104 52,122 C52,142 54,164 57,182 L67,183 C68,162 69,138 69,118 C69,100 68,87 66,79 Z",
  },
  {
    view: "back",
    muscles: ["forearms"],
    d: "M57,192 C54,216 50,246 47,276 C46,286 45,294 45,300 L54,302 C57,284 61,258 64,232 C66,216 67,204 67,194 Z",
  },
  {
    view: "back",
    muscles: ["glutes"],
    d: "M98,196 C88,194 80,200 78,210 C76,222 79,234 85,240 C90,245 96,245 99,241 L99,206 Z",
  },
  {
    view: "back",
    muscles: ["hamstrings"],
    d: "M85,246 C79,257 76,275 78,297 C79,313 82,327 86,336 L100,336 C99,320 98,296 98,272 C98,258 99,250 100,246 Z",
  },
  {
    view: "back",
    muscles: ["calves"],
    d: "M83,344 C77,360 77,384 81,404 C83,416 85,424 87,428 L96,428 C95,412 94,390 95,370 C95,358 96,350 98,342 Z",
  },
];

/** Тонкие линии внутри форм: ключицы, разделение головок, позвоночник. */
const DETAILS: Base[] = [
  { view: "front", d: "M79,81 C87,75 94,73 100,75" },
  { view: "front", center: true, d: "M100,82 L100,123" },
  { view: "front", d: "M79,111 C87,119 94,122 100,122" },
  { view: "front", d: "M89,225 C87,253 87,283 89,307" },
  { view: "front", d: "M98,301 C94,313 92,323 92,330" },
  { view: "front", d: "M90,349 C89,373 89,397 90,421" },
  { view: "front", d: "M84,338 C88,336 92,336 96,338" },
  { view: "back", center: true, d: "M100,60 L100,190" },
  { view: "back", d: "M83,96 C89,101 95,107 99,115" },
  { view: "back", center: true, d: "M100,196 L100,244" },
  { view: "back", d: "M92,252 C90,282 91,312 94,334" },
  { view: "back", d: "M89,352 C87,376 87,400 89,422" },
];

function level(part: Part, primary: MuscleGroup, secondary: MuscleGroup[]) {
  if (part.muscles.includes(primary)) return "muscle muscle--primary";
  if (part.muscles.some((m) => secondary.includes(m))) return "muscle muscle--secondary";
  return "muscle";
}

export default function MuscleMap({
  primary,
  secondary,
}: {
  primary: MuscleGroup;
  secondary: MuscleGroup[];
}) {
  const uid = useId().replace(/[:]/g, "");
  const gradientId = `body-${uid}`;

  const renderView = (view: "front" | "back") => (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#333a47" />
          <stop offset="55%" stopColor="#2b313c" />
          <stop offset="100%" stopColor="#232833" />
        </linearGradient>
      </defs>

      <g className="musclemap__body" fill={`url(#${gradientId})`}>
        {BODY.filter((part) => part.view === view).map((part, index) => (
          <g key={`body-${view}-${index}`}>
            <path d={part.d} />
            {!part.center && <path d={part.d} transform="translate(200,0) scale(-1,1)" />}
          </g>
        ))}
      </g>

      <g className="musclemap__parts">
        {MUSCLES.filter((part) => part.view === view).map((part, index) => (
          <g key={`muscle-${view}-${index}`}>
            <path d={part.d} className={level(part, primary, secondary)} />
            {!part.center && (
              <path
                d={part.d}
                className={level(part, primary, secondary)}
                transform="translate(200,0) scale(-1,1)"
              />
            )}
          </g>
        ))}
      </g>

      <g className="musclemap__details">
        {DETAILS.filter((part) => part.view === view).map((part, index) => (
          <g key={`detail-${view}-${index}`}>
            <path d={part.d} />
            {!part.center && <path d={part.d} transform="translate(200,0) scale(-1,1)" />}
          </g>
        ))}
      </g>
    </>
  );

  return (
    <div className="musclemap">
      <figure className="musclemap__view">
        <svg viewBox="0 0 200 460" role="img" aria-label="Передняя проекция тела">
          {renderView("front")}
        </svg>
        <figcaption>перед</figcaption>
      </figure>
      <figure className="musclemap__view">
        <svg viewBox="0 0 200 460" role="img" aria-label="Задняя проекция тела">
          {renderView("back")}
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
      <p className="musclemap__credit">контур — в память о Вадиме Иванове</p>
    </div>
  );
}

