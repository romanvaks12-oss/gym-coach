import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "../types";
import { exportAll, loadSettings, saveSettings } from "../storage/db";
import { isConfigured, normalizeUrl, pendingCount, syncNow, testConnection } from "../storage/sync";

type Tone = "idle" | "busy" | "ok" | "error";

interface Status {
  tone: Tone;
  text: string;
}

/** «26.10, 18:40» — короткая подпись времени синка по локальным часам. */
function when(iso?: string): string | null {
  if (!iso) return null;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${day}.${month}, ${hh}:${mm}`;
}



export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [status, setStatus] = useState<Status>({ tone: "idle", text: "" });

  const refreshPending = useCallback(() => {
    pendingCount()
      .then(setPending)
      .catch(() => setPending(0));
  }, []);

  useEffect(() => {
    loadSettings()
      .then(setSettings)
      .catch(() => setError("Локальная база недоступна"));
    refreshPending();
  }, [refreshPending]);

  const configured = settings ? isConfigured(settings) : false;

  async function persist(next: AppSettings): Promise<AppSettings> {
    const clean: AppSettings = {
      ...next,
      syncUrl: normalizeUrl(next.syncUrl),
      syncToken: next.syncToken.trim(),
    };
    await saveSettings(clean);
    setSettings(clean);
    return clean;
  }

  async function onSave() {
    if (!settings) return;
    await persist(settings);
    setSaved(true);
    setStatus({ tone: "idle", text: "" });
    window.setTimeout(() => setSaved(false), 1500);
  }

  async function onPing() {
    if (!settings) return;
    setStatus({ tone: "busy", text: "Проверяю связь…" });
    const clean = await persist(settings);
    const result = await testConnection(clean);
    setStatus(
      result.ok
        ? { tone: "ok", text: "Связь есть — таблица отвечает" }
        : { tone: "error", text: result.error ?? "Не получилось" },
    );
  }

  async function onSync() {
    if (!settings) return;
    setStatus({ tone: "busy", text: "Сливаю данные…" });
    const clean = await persist(settings);
    const result = await syncNow(clean);
    if (result.ok) {
      const next = await loadSettings();
      setSettings(next);
      setStatus({
        tone: "ok",
        text: `Готово: отправлено ${result.pushed}, получено ${result.pulled}`,
      });
      refreshPending();
    } else {
      setStatus({ tone: "error", text: result.error ?? "Синк не удался" });
    }
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

  const lastSync = when(settings?.lastSync);

  return (
    <div className="screen">
      <h1 className="screen__title">Настройки</h1>

      {error && <p className="card__text card__text--warn">{error}</p>}

      <section className="card">
        <h2 className="card__title">
          Синхронизация с Google Sheets{" "}
          <span className={configured ? "badge badge--progress" : "badge"}>
            {configured ? "вкл" : "выкл"}
          </span>
        </h2>
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
            autoCapitalize="off"
            spellCheck={false}
            placeholder="https://script.google.com/macros/s/…/exec"
            value={settings?.syncUrl ?? ""}
            onChange={(e) => setSettings((s) => (s ? { ...s, syncUrl: e.target.value } : s))}
          />
        </label>

        <label className="field">
          <span className="field__label">Токен</span>
          <input
            className="input"
            type="text"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="случайная строка"
            value={settings?.syncToken ?? ""}
            onChange={(e) => setSettings((s) => (s ? { ...s, syncToken: e.target.value } : s))}
          />
        </label>

        <div className="row">
          <button type="button" className="button" onClick={onSave} disabled={!settings}>
            {saved ? "Сохранено" : "Сохранить"}
          </button>
        </div>

        <div className="row">
          <button
            type="button"
            className="button button--ghost"
            onClick={onPing}
            disabled={!settings || status.tone === "busy"}
          >
            Проверить связь
          </button>
          <button
            type="button"
            className="button"
            onClick={onSync}
            disabled={!settings || status.tone === "busy"}
          >
            Слить сейчас
          </button>
        </div>

        {status.text && (
          <p
            className={
              status.tone === "error"
                ? "notice notice--error"
                : status.tone === "ok"
                  ? "notice notice--ok"
                  : "hint"
            }
          >
            {status.text}
          </p>
        )}

        <p className="hint">
          {pending > 0
            ? `Ждут отправки: ${pending}. Уйдут при следующем синке или после тренировки.`
            : "Все записи отправлены."}
          {lastSync && ` Последний синк: ${lastSync}.`}
        </p>
        <p className="hint">
          Токен хранится только на этом телефоне. Пошаговая настройка — в{" "}
          <code>docs/sheets-setup.md</code>.
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

      <p className="hint">Схема данных: v{settings?.schemaVersion ?? 1} · P2.5</p>
    </div>
  );
}
