import { useEffect, useState } from "react";
import type { AppSettings } from "../types";
import { exportAll, loadSettings, saveSettings } from "../storage/db";

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings()
      .then(setSettings)
      .catch(() => setError("Локальная база недоступна"));
  }, []);

  async function onSave() {
    if (!settings) return;
    await saveSettings(settings);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  async function onExport() {
    const payload = await exportAll();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gym-coach-backup-${payload.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="screen">
      <h1 className="screen__title">Настройки</h1>

      {error && <p className="card__text card__text--warn">{error}</p>}

      <section className="card">
        <h2 className="card__title">Синхронизация с Google Sheets</h2>
        <p className="card__text">
          Вставь URL веб-приложения Apps Script (заканчивается на <code>/exec</code>) и токен.
          Пока они пустые — приложение работает полностью локально.
        </p>

        <label className="field">
          <span className="field__label">URL синка</span>
          <input
            className="input"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://script.google.com/macros/s/…/exec"
            value={settings?.syncUrl ?? ""}
            onChange={(e) =>
              setSettings((s) => (s ? { ...s, syncUrl: e.target.value } : s))
            }
          />
        </label>

        <label className="field">
          <span className="field__label">Токен</span>
          <input
            className="input"
            type="text"
            autoComplete="off"
            placeholder="случайная строка"
            value={settings?.syncToken ?? ""}
            onChange={(e) =>
              setSettings((s) => (s ? { ...s, syncToken: e.target.value } : s))
            }
          />
        </label>

        <button type="button" className="button" onClick={onSave} disabled={!settings}>
          {saved ? "Сохранено" : "Сохранить"}
        </button>
        <p className="hint">
          Синк появится в P2. Токен хранится только в памяти этого телефона.
        </p>
      </section>

      <section className="card">
        <h2 className="card__title">Данные</h2>
        <p className="card__text">
          Экспорт — аварийный выход: один JSON-файл со всеми тренировками, подходами и замерами.
        </p>
        <button type="button" className="button button--ghost" onClick={onExport}>
          Скачать бэкап JSON
        </button>
      </section>

      <p className="hint">Схема данных: v{settings?.schemaVersion ?? 1} · P0</p>
    </div>
  );
}
