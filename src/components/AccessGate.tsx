import { useState, type FormEvent, type ReactNode } from "react";
import { INVITE_CODE } from "../config";

const STORAGE_KEY = "gym-coach:access";

function hasAccess(): boolean {
  if (!INVITE_CODE) return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === INVITE_CODE;
  } catch {
    return false;
  }
}

/**
 * Мягкий код доступа для тестового периода. Если VITE_INVITE_CODE не задан,
 * просто показывает приложение — никаких лишних экранов.
 */
export default function AccessGate({ children }: { children: ReactNode }) {
  const [allowed, setAllowed] = useState(hasAccess);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  if (allowed) return <>{children}</>;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (value.trim() !== INVITE_CODE) {
      setError(true);
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, INVITE_CODE);
    } catch {
      // приватный режим Safari может запрещать localStorage — пускаем до перезагрузки
    }
    setError(false);
    setAllowed(true);
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Gym Coach</span>
      </header>
      <main className="content">
        <form className="screen" onSubmit={submit}>
          <h1 className="screen__title">Тестовый доступ</h1>
          <p className="card__text">
            Приложение пока в тестовом периоде. Введи код, который дал Рома — дальше всё работает
            как обычно, спрашивать больше не будет.
          </p>
          <label className="field">
            <span className="field__label">Код</span>
            <input
              className="input"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError(false);
              }}
            />
          </label>
          {error && <p className="notice notice--error">Код не подошёл.</p>}
          <button type="submit" className="button">
            Войти
          </button>
          <p className="hint">
            Данные тренировок хранятся только на этом устройстве и никуда не отправляются.
          </p>
        </form>
      </main>
    </div>
  );
}
