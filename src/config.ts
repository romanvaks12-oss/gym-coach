/**
 * Настройки времени сборки.
 *
 * VITE_INVITE_CODE — необязательный код тестового доступа. Пусто (по умолчанию)
 * — приложение открывается сразу, без каких-либо экранов входа.
 * Задаётся переменной репозитория в GitHub Actions (Settings → Variables → INVITE_CODE).
 *
 * Важно: переменные Vite попадают в JS-бандл, поэтому код — «шторка» от случайных
 * людей, а не защита данных. Подробности — docs/access.md.
 */
const raw = (import.meta.env.VITE_INVITE_CODE as string | undefined) ?? "";

export const INVITE_CODE = raw.trim();
