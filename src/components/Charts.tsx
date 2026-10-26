import { useId } from "react";
import type { WeekSummary } from "../core/analytics";

/** Столбики тоннажа по неделям: высота относительно лучшей недели. */
export function WeekBars({
  weeks,
  format,
}: {
  weeks: WeekSummary[];
  format: (value: number) => string;
}) {
  const max = Math.max(...weeks.map((w) => w.tonnage), 1);
  return (
    <div className="bars" role="img" aria-label="Тоннаж по неделям">
      {weeks.map((week) => (
        <div
          key={week.weekStart}
          className="bars__col"
          title={`Неделя ${week.label}: ${format(week.tonnage)} кг, ${week.sets} подх.`}
        >
          <div className="bars__barwrap">
            <div
              className={week.tonnage > 0 ? "bars__bar" : "bars__bar bars__bar--empty"}
              style={{ height: `${Math.max(2, (week.tonnage / max) * 100)}%` }}
            />
          </div>
          <span className="bars__label">{week.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Линия по точкам (e1RM, вес тела). Без сглаживания — честно показываем данные. */
export function LineChart({
  points,
  format,
  unit,
  ariaLabel,
}: {
  points: { label: string; value: number }[];
  format: (value: number) => string;
  unit: string;
  ariaLabel: string;
}) {
  const gradientId = `chart${useId().replace(/:/g, "")}`;

  if (points.length === 0) {
    return <p className="hint">Пока нет данных для графика.</p>;
  }

  const W = 300;
  const H = 112;
  const padLeft = 40;
  const padRight = 8;
  const padTop = 12;
  const padBottom = 22;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(1, max * 0.05);

  const x = (index: number) =>
    points.length === 1
      ? padLeft + (W - padLeft - padRight) / 2
      : padLeft + (index * (W - padLeft - padRight)) / (points.length - 1);
  const y = (value: number) =>
    padTop + (1 - (value - min) / span) * (H - padTop - padBottom);

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${y(point.value).toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${x(points.length - 1).toFixed(1)} ${H - padBottom} L ${x(0).toFixed(1)} ${H - padBottom} Z`;

  const labelIndexes =
    points.length <= 6
      ? points.map((_, index) => index)
      : [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${ariaLabel}: от ${format(min)} до ${format(max)} ${unit}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[max, (max + min) / 2, min].map((value) => (
        <line
          key={value}
          x1={padLeft}
          x2={W - padRight}
          y1={y(value)}
          y2={y(value)}
          className="chart__grid"
        />
      ))}

      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} className="chart__line" />

      {points.map((point, index) => (
        <circle
          key={`${point.label}-${index}`}
          cx={x(index)}
          cy={y(point.value)}
          r={2.6}
          className="chart__dot"
        />
      ))}

      <text x={padLeft - 6} y={y(max) + 3} textAnchor="end" className="chart__ylabel">
        {format(max)}
      </text>
      {min !== max && (
        <text x={padLeft - 6} y={y(min) + 3} textAnchor="end" className="chart__ylabel">
          {format(min)}
        </text>
      )}

      {labelIndexes.map((index) => (
        <text
          key={`x-${index}`}
          x={x(index)}
          y={H - 6}
          textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
          className="chart__xlabel"
        >
          {points[index].label}
        </text>
      ))}
    </svg>
  );
}

/** Горизонтальные полосы: объём по группам мышц. */
export function MuscleBars({ rows }: { rows: { label: string; value: number }[] }) {
  if (rows.length === 0) {
    return <p className="hint">Пока нет рабочих подходов за период.</p>;
  }
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <div className="mbars">
      {rows.map((row) => (
        <div key={row.label} className="mbars__row">
          <span className="mbars__name">{row.label}</span>
          <span className="mbars__track">
            <span className="mbars__fill" style={{ width: `${(row.value / max) * 100}%` }} />
          </span>
          <span className="mbars__value">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
