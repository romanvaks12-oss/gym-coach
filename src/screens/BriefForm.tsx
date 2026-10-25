import { useState } from "react";
import type { Brief, MuscleGroup } from "../types";

const GROUPS: { muscle: MuscleGroup; label: string }[] = [
  { muscle: "quads", label: "Ноги" },
  { muscle: "chest", label: "Грудь" },
  { muscle: "back", label: "Спина" },
  { muscle: "shoulders", label: "Плечи" },
  { muscle: "biceps", label: "Руки" },
  { muscle: "core", label: "Пресс" },
];

function Scale({
  label,
  value,
  onChange,
  names,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  names: [string, string];
}) {
  return (
    <div className="scale">
      <div className="scale__head">
        <span>{label}</span>
        <span className="scale__value">{value}</span>
      </div>
      <div className="segmented">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={value === n ? "seg segmented__item--active" : "seg"}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="scale__hint">
        <span>{names[0]}</span>
        <span>{names[1]}</span>
      </div>
    </div>
  );
}

export default function BriefForm({ onDone }: { onDone: (brief: Brief) => void }) {
  const [sleep, setSleep] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [stress, setStress] = useState(3);
  const [minutes, setMinutes] = useState<Brief["minutes"]>(60);
  const [painNote, setPainNote] = useState("");
  const [soreness, setSoreness] = useState<Record<string, number>>({});

  const setSore = (muscle: string, value: number) =>
    setSoreness((prev) => ({ ...prev, [muscle]: value }));

  return (
    <div className="screen">
      <h1 className="screen__title">Как самочувствие?</h1>

      <section className="card">
        <Scale label="Сон" value={sleep} onChange={setSleep} names={["разбитый", "выспался"]} />
        <Scale label="Энергия" value={energy} onChange={setEnergy} names={["нет сил", "хоть сейчас"]} />
        <Scale label="Стресс" value={stress} onChange={setStress} names={["спокойно", "на пределе"]} />
      </section>

      <section className="card">
        <h2 className="card__title">Болят ли мышцы</h2>
        {GROUPS.map(({ muscle, label }) => {
          const value = soreness[muscle] ?? 0;
          return (
            <div key={muscle} className="scale">
              <div className="scale__head">
                <span>{label}</span>
                <span className={value >= 7 ? "scale__value scale__value--warn" : "scale__value"}>
                  {value}
                </span>
              </div>
              <input
                className="range"
                type="range"
                min={0}
                max={10}
                step={1}
                value={value}
                onChange={(e) => setSore(muscle, Number(e.target.value))}
                aria-label={`Болезненность: ${label}`}
              />
            </div>
          );
        })}
        <p className="hint">0 — не болит, 10 — больно даже ходить. 7 и выше — группу не трогаем.</p>
      </section>

      <section className="card">
        <h2 className="card__title">Сколько времени</h2>
        <div className="chips">
          {([30, 45, 60, 90] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={minutes === m ? "chip chip--active" : "chip"}
              onClick={() => setMinutes(m)}
            >
              {m} мин
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <label className="field">
          <span className="field__label">Есть боль или ограничение? (не обязательно)</span>
          <input
            className="input"
            type="text"
            placeholder="например: тянет правое плечо"
            value={painNote}
            onChange={(e) => setPainNote(e.target.value)}
          />
        </label>
      </section>

      <button
        type="button"
        className="button"
        onClick={() =>
          onDone({
            sleep,
            energy,
            stress,
            minutes,
            painNote: painNote.trim() || undefined,
            soreness: soreness as Brief["soreness"],
          })
        }
      >
        Собрать план
      </button>

      <p className="disclaimer">
        Острая или стреляющая боль, боль в суставе, головокружение — не тренировочная боль.
        Остановись и обратись к врачу.
      </p>
    </div>
  );
}
