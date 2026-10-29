/**
 * Gym Coach — бэкенд в Google Sheets (Apps Script Web App).
 *
 * Как подключить — пошагово в docs/sheets-setup.md. Коротко:
 * 1. Google Sheets → Расширения → Apps Script → вставить этот файл целиком.
 * 2. Задать токен: либо в константе TOKEN ниже, либо в Свойствах проекта →
 *    Свойства скрипта → добавить свойство TOKEN.
 * 3. Развернуть: Deploy → New deployment → Web app → Execute as: Me,
 *    Who has access: Anyone → скопировать URL, заканчивающийся на /exec.
 *
 * Токен — единственная защита: без него сервер отвечает forbidden.
 * Данные никогда не удаляются: сервер только добавляет и обновляет строки по id.
 */

const TOKEN_FALLBACK = "PASTE_YOUR_TOKEN_HERE";
const SCHEMA_VERSION = 1;

function getToken() {
  try {
    const props = PropertiesService.getScriptProperties();
    const fromProps = props.getProperty("TOKEN");
    if (fromProps && String(fromProps).trim()) {
      return String(fromProps).trim();
    }
  } catch (error) {
    // Если нет доступа к свойствам — используем константу
  }
  return TOKEN_FALLBACK;
}

const SPEC = {
  workouts: {
    headers: ["id", "date", "readiness", "durationMin", "planId", "notes", "createdAt", "updatedAt"],
    formats: ["@", "@", "0", "0", "@", "@", "@", "@"],
  },
  sets: {
    headers: ["id", "workoutId", "exerciseId", "setIndex", "weight", "reps", "rpe", "isWarmup", "createdAt"],
    formats: ["@", "@", "@", "0", "0.0#", "0", "0", "@", "@"],
  },
  body: {
    headers: ["id", "date", "weightKg", "waistCm", "createdAt"],
    formats: ["@", "@", "0.0#", "0.0#", "@"],
  },
  _meta: {
    headers: ["key", "value"],
    formats: ["@", "@"],
  },
};

/* ---------- HTTP ---------- */

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (!checkToken(params.token)) return json({ ok: false, error: tokenError() });

  const action = params.action || "ping";
  if (action === "ping") {
    return json({ ok: true, serverTime: new Date().toISOString(), schemaVersion: SCHEMA_VERSION });
  }
  if (action === "pull") {
    return json({ ok: true, serverTime: new Date().toISOString(), data: readAll() });
  }
  return json({ ok: false, error: "unknown_action" });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (!checkToken(body.token)) return json({ ok: false, error: tokenError() });

    if (body.action === "push") {
      const result = pushAll(body.data || {});
      return json({ ok: true, serverTime: new Date().toISOString(), ...result });
    }
    return json({ ok: false, error: "unknown_action" });
  } catch (error) {
    return json({ ok: false, error: String(error) });
  }
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function checkToken(value) {
  const token = getToken();
  return token !== "PASTE_YOUR_TOKEN_HERE" && String(value || "") === token;
}

function tokenError() {
  const token = getToken();
  return token === "PASTE_YOUR_TOKEN_HERE" ? "token_not_configured" : "forbidden";
}

/* ---------- запись ---------- */

function pushAll(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const pushed = {};
    ["workouts", "sets", "body"].forEach(function (name) {
      pushed[name] = upsert(name, data[name] || []);
    });
    putMeta("schemaVersion", SCHEMA_VERSION);
    putMeta("lastSync", new Date().toISOString());
    return { pushed: pushed };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Обновляет существующие строки по id и дописывает новые.
 * Одна операция setValues на пачку новых строк — быстрее, чем по одной.
 */
function upsert(name, rows) {
  const sheet = ensureSheet(name);
  const headers = SPEC[name].headers;
  const width = headers.length;

  const lastRow = Math.max(sheet.getLastRow(), 1);
  const values = sheet.getRange(1, 1, lastRow, width).getValues();
  const rowById = {};
  for (let i = 1; i < values.length; i += 1) {
    const id = String(values[i][0] || "");
    if (id) rowById[id] = i + 1;
  }

  let written = 0;
  const appended = [];

  rows.forEach(function (row) {
    if (!row || typeof row !== "object") return;
    const id = String(row.id || "").trim();
    if (!id) return;

    const line = headers.map(function (header) {
      const value = row[header];
      return value === undefined || value === null ? "" : value;
    });

    const rowNumber = rowById[id];
    if (rowNumber) {
      sheet.getRange(rowNumber, 1, 1, width).setValues([line]);
    } else {
      appended.push(line);
    }
    written += 1;
  });

  if (appended.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, appended.length, width).setValues(appended);
  }

  return written;
}

function putMeta(key, value) {
  upsert("_meta", [{ id: key, key: key, value: value }]);
}

/* ---------- чтение ---------- */

function readAll() {
  return {
    workouts: readRows("workouts"),
    sets: readRows("sets"),
    body: readRows("body"),
    schemaVersion: SCHEMA_VERSION,
  };
}

function readRows(name) {
  const sheet = ensureSheet(name);
  const headers = SPEC[name].headers;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const out = [];

  values.forEach(function (row) {
    if (String(row[0] || "") === "") return;
    const item = {};
    headers.forEach(function (header, index) {
      let value = row[index];
      if (value instanceof Date) value = value.toISOString();
      item[header] = value;
    });
    out.push(item);
  });

  return out;
}

/* ---------- листы ---------- */

function ensureSheet(name) {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(name);
  const spec = SPEC[name];

  if (!sheet) {
    sheet = book.insertSheet(name);
    sheet
      .getRange(1, 1, 1, spec.headers.length)
      .setValues([spec.headers])
      .setFontWeight("bold");
    sheet.setFrozenRows(1);
    spec.formats.forEach(function (format, index) {
      if (format) sheet.getRange(1, index + 1, sheet.getMaxRows(), 1).setNumberFormat(format);
    });
  }

  return sheet;
}

/** Меню в таблице: «Gym Coach → Подготовить листы». */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Gym Coach")
    .addItem("Подготовить листы", "setupSheets")
    .addToUi();
}

function setupSheets() {
  Object.keys(SPEC).forEach(ensureSheet);
  SpreadsheetApp.getActiveSpreadsheet().toast("Листы готовы: workouts, sets, body, _meta");
}
