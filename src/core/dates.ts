/** Локальная дата пользователя в формате YYYY-MM-DD (не UTC!). */
export function todayIso(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function nowIso(date: Date = new Date()): string {
  return date.toISOString();
}
