---
name: pwa-iphone
description: Веб-приложение под iPhone — manifest, safe-area, dvh, зум инпутов, standalone-режим, service worker, IndexedDB, деплой статики на GitHub Pages. Использовать при верстке экранов, настройке офлайна и публикации.
---

# PWA для iPhone (и деплой на GitHub Pages)

## Обязательный минимум для «как приложение»

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#111318">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
<link rel="manifest" href="/manifest.webmanifest">
```

`manifest.webmanifest`: `name`, `short_name`, `start_url: "/"`, `display: "standalone"`,
`background_color`, `theme_color`, иконки 192 и 512 (maskable).

## iOS-квирки, которые ломают вёрстку

- `100vh` врёт (учитывает панель Safari) → использовать `100dvh` + fallback `100vh`.
- Нужен `padding: env(safe-area-inset-*)` для «челки» и нижней полосы. `body { overscroll-behavior: none }`.
- Поле ввода с `font-size < 16px` вызывает принудительный зум → везде **16px минимум**.
- `position: fixed` под клавиатурой прыгает → нижнюю навигацию делать `sticky`, а не `fixed`, где можно.
- Нет `beforeinstallprompt` (только Android) → на iPhone показываем инструкцию
  «Поделиться → На экран Домой».
- Долгое нажатие выделяет текст → `user-select: none` на кнопках, но не на таблицах.
- Тач-таргеты **≥ 44×44 px**, отступы между кнопками ≥ 8 px, ввод одной рукой (главные кнопки внизу).

## Офлайн и данные

- `vite-plugin-pwa` (generateSW, `registerType: "autoUpdate"`), стратегия: app shell — precache,
  данные — из IndexedDB, сеть не блокирует UI.
- IndexedDB через тонкую обёртку (`src/storage/db.ts`): один объект-стор на сущность, версия схемы,
  функция `migrate(oldVersion)`. Никаких ORM.
- Запись: сначала локально, затем очередь синка (`pending` флаг у записи). Синк — фоновой, батчами,
  при возврате сети. Никогда не блокируем ввод ожиданием сети.
- Экспорт/импорт JSON — всегда доступен, это аварийный выход из любой ситуации.

## Деплой на GitHub Pages

- `vite.config.ts`: `base: "/<repo>/"` (или кастомный домен → `base: "/"`).
- Роутинг — **HashRouter**, иначе перезагрузка на вложенном адресе даёт 404.
- GitHub Actions: `npm ci && npm run build` → `actions/upload-pages-artifact` → `actions/deploy-pages`.
  Права: `pages: write`, `id-token: write`.
- Публичный репозиторий = бесплатные минуты Actions; данные всё равно только в телефоне и в Sheets.

## Проверка перед «готово»

Открыть в браузере на 390×844, проверить: нет горизонтального скролла, нет зума при фокусе,
нижняя навигация не перекрыта, тёмная тема, работа после перезагрузки без сети (DevTools → Offline).
