import { describe, expect, it } from "vitest";
import { monthKey, monthRange, parseDateOnly, parseMonth, shiftMonth } from "./dates";
import { formatEuros, parseEuros } from "./money";

describe("money", () => {
  it("formatea y parsea importes", () => {
    expect(formatEuros(200)).toBe("2 €");
    expect(formatEuros(250)).toBe("2,50 €");
    expect(formatEuros(-1205)).toBe("-12,05 €");
    expect(parseEuros("2,5")).toBe(250);
    expect(parseEuros("12.34 €")).toBe(1234);
    expect(parseEuros("abc")).toBeNull();
    expect(parseEuros("1,234")).toBeNull();
  });
});

describe("dates", () => {
  it("valida fechas de calendario", () => {
    expect(parseDateOnly("2026-10-14")?.toISOString()).toBe("2026-10-14T00:00:00.000Z");
    expect(parseDateOnly("2026-02-30")).toBeNull();
    expect(parseDateOnly("14/10/2026")).toBeNull();
  });

  it("calcula meses", () => {
    const now = new Date("2026-10-14T10:00:00Z");
    expect(parseMonth(undefined, now)).toEqual({ year: 2026, month: 10 });
    expect(parseMonth("2025-13", now)).toEqual({ year: 2026, month: 10 });
    expect(parseMonth("2025-03", now)).toEqual({ year: 2025, month: 3 });
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(monthKey(2026, 3)).toBe("2026-03");
    const { start, end } = monthRange(2026, 12);
    expect(start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});
