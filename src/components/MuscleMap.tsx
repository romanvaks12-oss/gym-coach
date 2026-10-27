import { useId } from "react";
import type { MuscleGroup } from "../types";
import { ATLAS_BODY, ATLAS_DETAILS, ATLAS_MUSCLES } from "./atlas";

/**
 * Атлас тела: перед и спина. В atlas.svg нарисована левая половина фигуры,
 * правая получается зеркалом — так стороны всегда совпадают.
 *
 * Стиль — трафарет в духе Вадима Иванова: чёрные «камни» мышц на светлом фоне,
 * между группами остаются чистые просветы. Активная группа заливается акцентом,
 * вспомогательная — полупрозрачным. Фигура — в память об авторе.
 */
function level(muscles: MuscleGroup[], primary: MuscleGroup, secondary: MuscleGroup[]) {
  if (muscles.includes(primary)) return "muscle muscle--primary";
  if (muscles.some((m) => secondary.includes(m))) return "muscle muscle--secondary";
  return "muscle";
}

/**
 * Зеркало относительно оси x = 100. Сдвиг `shift` — доля перекрытия: заливка
 * половины и её отражение стыкуются не «в упор», иначе на оси остаётся светлая
 * полоса от сглаживания краёв. Сдвигаем только заливку тела, контуры и мышцы
 * остаются ровно на оси.
 */
function mirror(shift = 0) {
  return `translate(${200 + shift},0) scale(-1,1)`;
}

/** Половина фигуры + её зеркало. */
function half(
  d: string,
  className: string | undefined,
  key: string,
  muscle?: MuscleGroup,
  shift?: number,
) {
  return (
    <g key={key}>
      <path d={d} className={className} data-muscle={muscle} />
      <path
        d={d}
        className={className}
        data-muscle={muscle}
        transform={mirror(shift)}
      />
    </g>
  );
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
        {ATLAS_BODY.filter((part) => part.view === view).map((part, index) =>
          half(part.d, undefined, `body-${view}-${index}`, undefined, -0.4),
        )}
      </g>

      <g className="musclemap__outline">
        {ATLAS_BODY.filter((part) => part.view === view).map((part, index) =>
          half(part.outline, undefined, `outline-${view}-${index}`),
        )}
      </g>

      <g className="musclemap__parts">
        {ATLAS_MUSCLES.filter((part) => part.view === view).map((part, index) =>
          half(
            part.d,
            level(part.muscles, primary, secondary),
            `muscle-${view}-${index}`,
            part.muscles[0],
          ),
        )}
      </g>

      <g className="musclemap__details">
        {ATLAS_DETAILS.filter((part) => part.view === view).map((part, index) =>
          half(part.d, undefined, `detail-${view}-${index}`),
        )}
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
