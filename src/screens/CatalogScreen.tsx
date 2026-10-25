import { useMemo, useState } from "react";
import type { MuscleGroup } from "../types";
import {
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  MUSCLE_ORDER,
  filterExercises,
} from "../domain/catalog";

export default function CatalogScreen() {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useMemo(() => filterExercises({ query, muscle }), [query, muscle]);

  return (
    <div className="screen">
      <h1 className="screen__title">Каталог</h1>

      <input
        className="input"
        type="search"
        inputMode="search"
        placeholder="Поиск: жим, ноги, блок…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="chips">
        <button
          type="button"
          className={muscle === "all" ? "chip chip--active" : "chip"}
          onClick={() => setMuscle("all")}
        >
          Все
        </button>
        {MUSCLE_ORDER.map((m) => (
          <button
            key={m}
            type="button"
            className={muscle === m ? "chip chip--active" : "chip"}
            onClick={() => setMuscle(m)}
          >
            {MUSCLE_LABELS[m]}
          </button>
        ))}
      </div>

      <p className="hint">Найдено: {list.length}</p>

      <ul className="exercises">
        {list.map((ex) => {
          const open = openId === ex.id;
          return (
            <li key={ex.id} className="exercise">
              <button
                type="button"
                className="exercise__head"
                onClick={() => setOpenId(open ? null : ex.id)}
                aria-expanded={open}
              >
                <span className="exercise__name">{ex.name}</span>
                <span className="exercise__meta">
                  {MUSCLE_LABELS[ex.primaryMuscle]} · {EQUIPMENT_LABELS[ex.equipment]}
                  {ex.isCompound ? " · база" : ""}
                </span>
              </button>
              {open && (
                <ul className="exercise__cues">
                  {ex.cues.map((cue) => (
                    <li key={cue}>{cue}</li>
                  ))}
                  {ex.secondaryMuscles.length > 0 && (
                    <li className="exercise__secondary">
                      Дополнительно:{" "}
                      {ex.secondaryMuscles.map((m) => MUSCLE_LABELS[m]).join(", ")}
                    </li>
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
