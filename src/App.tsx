import { useState } from "react";
import TodayScreen from "./screens/TodayScreen";
import CatalogScreen from "./screens/CatalogScreen";
import ProgressScreen from "./screens/ProgressScreen";
import SettingsScreen from "./screens/SettingsScreen";

type Tab = "today" | "catalog" | "progress" | "settings";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "today", label: "Сегодня", icon: "◎" },
  { id: "catalog", label: "Каталог", icon: "☰" },
  { id: "progress", label: "Прогресс", icon: "◔" },
  { id: "settings", label: "Настройки", icon: "⚙" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("today");

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Gym Coach</span>
        <span className="phase">P1</span>
      </header>

      <main className="content">
        {tab === "today" && <TodayScreen />}
        {tab === "catalog" && <CatalogScreen />}
        {tab === "progress" && <ProgressScreen />}
        {tab === "settings" && <SettingsScreen />}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === tab ? "tab tab--active" : "tab"}
            onClick={() => setTab(t.id)}
            aria-current={t.id === tab}
          >
            <span className="tab__icon" aria-hidden="true">
              {t.icon}
            </span>
            <span className="tab__label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
