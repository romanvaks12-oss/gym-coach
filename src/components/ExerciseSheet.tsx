import type { Exercise } from "../types";
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from "../domain/catalog";
import { mediaFor } from "../domain/media";
import MuscleMap from "./MuscleMap";

export default function ExerciseSheet({
  exercise,
  onClose,
}: {
  exercise: Exercise;
  onClose: () => void;
}) {
  const media = mediaFor(exercise.id);

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={exercise.name}>
      <button type="button" className="sheet__backdrop" onClick={onClose} aria-label="Закрыть" />
      <div className="sheet__panel">
        <header className="sheet__head">
          <div>
            <h2 className="sheet__title">{exercise.name}</h2>
            <p className="hint">
              {MUSCLE_LABELS[exercise.primaryMuscle]} · {EQUIPMENT_LABELS[exercise.equipment]}
              {exercise.isCompound ? " · многосуставное" : " · изолирующее"}
              {exercise.isUnilateral ? " · по одной стороне" : ""}
            </p>
          </div>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </header>

        {media && media.images.length > 0 && (
          <div className="media">
            {media.images.slice(0, 2).map((src, index) => (
              <figure key={src} className="media__item">
                <img
                  src={src}
                  alt={`${exercise.name}: положение ${index + 1}`}
                  loading="eager"
                  decoding="async"
                />
                <figcaption>{index === 0 ? "старт" : "финиш"}</figcaption>
              </figure>
            ))}
          </div>
        )}

        <section className="sheet__block">
          <h3 className="sheet__subtitle">Что работает</h3>
          <MuscleMap primary={exercise.primaryMuscle} secondary={exercise.secondaryMuscles} />
          <p className="hint">
            <span className="dot dot--primary" /> {MUSCLE_LABELS[exercise.primaryMuscle]}
            {exercise.secondaryMuscles.length > 0 && (
              <>
                {" · "}
                <span className="dot dot--secondary" />{" "}
                {exercise.secondaryMuscles.map((m) => MUSCLE_LABELS[m]).join(", ")}
              </>
            )}
          </p>
        </section>

        <section className="sheet__block">
          <h3 className="sheet__subtitle">Техника</h3>
          <ul className="list">
            {exercise.cues.map((cue) => (
              <li key={cue}>{cue}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
