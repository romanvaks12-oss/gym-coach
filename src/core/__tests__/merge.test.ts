import { describe, expect, it } from "vitest";
import { mergeById, type Mergeable } from "../merge";

interface Row extends Mergeable {
  value: number;
}

const row = (id: string, value: number, updatedAt?: string, pendingSync = false): Row => ({
  id,
  value,
  updatedAt,
  pendingSync,
});

describe("mergeById", () => {
  it("добавляет записи, которых нет локально", () => {
    const result = mergeById<Row>([], [row("a", 1), row("b", 2)]);
    expect(result.added).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.merged.map((r) => r.id).sort()).toEqual(["a", "b"]);
  });

  it("более свежая запись с сервера заменяет локальную", () => {
    const result = mergeById<Row>(
      [row("a", 1, "2026-10-20T10:00:00.000Z")],
      [row("a", 2, "2026-10-21T10:00:00.000Z")],
    );
    expect(result.updated).toBe(1);
    expect(result.merged[0].value).toBe(2);
    expect(result.merged[0].pendingSync).toBe(false);
  });

  it("старая запись с сервера не затирает новую локальную", () => {
    const result = mergeById<Row>(
      [row("a", 5, "2026-10-25T10:00:00.000Z")],
      [row("a", 1, "2026-10-20T10:00:00.000Z")],
    );
    expect(result.updated).toBe(0);
    expect(result.merged[0].value).toBe(5);
  });

  it("локальная неотправленная запись главнее серверной", () => {
    const result = mergeById<Row>(
      [row("a", 99, "2026-10-01T10:00:00.000Z", true)],
      [row("a", 1, "2026-10-26T10:00:00.000Z")],
    );
    expect(result.updated).toBe(0);
    expect(result.merged[0].value).toBe(99);
    expect(result.merged[0].pendingSync).toBe(true);
  });

  it("без updatedAt локальное не перезаписывается", () => {
    const result = mergeById<Row>([row("a", 7)], [row("a", 1)]);
    expect(result.updated).toBe(0);
    expect(result.merged[0].value).toBe(7);
  });

  it("мусорные записи из таблицы игнорируются", () => {
    const remote = [
      { value: 1 } as unknown as Row,
      { id: "", value: 2 } as Row,
      row("ok", 3),
    ];
    const result = mergeById<Row>([], remote);
    expect(result.added).toBe(1);
    expect(result.merged).toHaveLength(1);
    expect(result.merged[0].id).toBe("ok");
  });

  it("пустые стороны не ломают результат", () => {
    expect(mergeById<Row>([], []).merged).toEqual([]);
    const onlyLocal = mergeById<Row>([row("a", 1)], []);
    expect(onlyLocal.merged).toHaveLength(1);
    expect(onlyLocal.added + onlyLocal.updated).toBe(0);
  });
});
