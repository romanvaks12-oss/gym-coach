---
name: sheets-backend
description: Google Sheets + Apps Script как бесплатный бэкенд — JSON API через Web App, схема листов, батч-запись, LockService, квоты и лимиты, синк из PWA. Использовать при работе с хранилищем, синхронизацией и деплоем скрипта.
---

# Google Sheets как база (Apps Script Web App)

## Схема

Один лист на сущность, первая строка — заголовки, дальше данные:

| Лист | Колонки |
|---|---|
| `_meta` | key, value (schemaVersion, lastSync, deviceId) |
| `workouts` | id, date, readiness, durationMin, planId, notes, createdAt |
| `sets` | id, workoutId, exerciseId, setIndex, weight, reps, rpe, isWarmup, createdAt |
| `briefs` | workoutId, sleep, energy, stress, sorenessJson, minutes, painNote |
| `body` | date, weightKg, waistCm |
| `exercises` | id, name, primaryMuscle, secondaryMuscles, equipment, pattern, isCompound, isUnilateral, cues |

Каталог упражнений живёт в репозитории (`src/data/exercises.json`) — в Sheets его дублировать не нужно.

## Ключевые правила Apps Script

- `doPost(e)`: тело читать как `JSON.parse(e.postData.contents)`. От клиента отправлять
  `Content-Type: text/plain;charset=utf-8` — иначе CORS-preflight и запрос падает.
- `doGet(e)`: `?action=pull&since=<iso>&token=<...>` → отдаём JSON через `ContentService`.
- Ответ: `ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON)`.
- Любая запись — под `LockService.getScriptLock()` (два устройства не должны затереть друг друга).
- Запись батчами: `sheet.getRange(row, 1, rows.length, cols).setValues(rows)` — одна операция вместо N.
- Чтение: `getDataRange().getValues()` один раз в память, дальше фильтрация в JS. Не `getRange` в цикле.
- Идемпотентность: `id` генерирует клиент (uuid), сервер делает upsert по `id`.

## Реальные ограничения (держать в голове)

- Время выполнения 6 мин — при нашем объёме данных не проблема, но батчить всё равно.
- Запрос к Web App: ~0,5–2 с холодный старт, ~0,3–0,8 с тёплый. Поэтому UI **никогда** не ждёт сеть.
- Web App, развёрнутый «Anyone», доступен по URL всем, кто его знает → обязательный
  `token` в запросе (случайная строка, хранится в localStorage телефона), без него 403.
- Квоты Sheets API для Apps Script щедрые для одного пользователя, но не парсить лист в цикле каждые 5 с.
- Триггеры/таймеры не нужны: вся инициализация при первом открытии.

## Модель синхронизации (write-through)

1. Ввод → запись в IndexedDB, флаг `pendingSync = true`.
2. Фон: `POST` батчем всех pending (до 50 строк). Успех → снять флаг, обновить `lastSync`.
3. Ошибка/офлайн → тихо повторяем позже (экспоненциальная пауза, максимум 1 попытка в 30 с).
4. Pull при старте: `since=lastSync` → мержим по `id`, конфликт решает `updatedAt` (последняя запись).
5. Кнопка «Слить сейчас» на экране настроек — ручной синк для параноиков.

## Деплой (ручной, для не-разработчика)

1. Google Sheets → Расширения → Apps Script → вставить `apps-script/Code.gs`.
2. Deploy → New deployment → Web app → Execute as: **Me**, Who has access: **Anyone**.
3. Скопировать URL `/exec` в приложение (экран настроек, поле «URL синка» + токен).
4. Изменения кода: Deploy → Manage deployments → **Edit** → Version: New. Иначе живёт старая версия.

`clasp` не обязателен: один файл проще вставить руками, чем настраивать OAuth для CLI.
