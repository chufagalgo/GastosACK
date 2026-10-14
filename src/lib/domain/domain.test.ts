import { describe, expect, it } from "vitest";
import { monthKey, monthRange, parseDateOnly, parseMonth, shiftMonth } from "./dates";
import { formatKm, kmAmountCents, parseKm, parseRate, roundTripKm } from "./km";
import { centsToInput, formatEuros, parseEuros } from "./money";

describe("money", () => {
  it("formatea con 2 decimales y coma decimal", () => {
    expect(formatEuros(200)).toBe("2,00 €");
    expect(formatEuros(2132)).toBe("21,32 €");
    expect(formatEuros(123456)).toBe("1.234,56 €");
    expect(formatEuros(-1205)).toBe("-12,05 €");
    expect(centsToInput(1250)).toBe("12,50");
  });

  it("parsea importes escritos de varias formas", () => {
    expect(parseEuros("2,5")).toBe(250);
    expect(parseEuros("12.34 €")).toBe(1234);
    expect(parseEuros("1.234,56")).toBe(123456);
    expect(parseEuros("12,82")).toBe(1282);
    expect(parseEuros("abc")).toBeNull();
    expect(parseEuros("1,234")).toBeNull();
    expect(parseEuros("")).toBeNull();
  });
});

describe("km", () => {
  it("calcula ida y vuelta y el importe", () => {
    expect(roundTripKm(28_900)).toBe(57.8);
    expect(roundTripKm(10_600)).toBe(21.2);
    expect(roundTripKm(10_649)).toBe(21.3);
    expect(kmAmountCents(57.8, 0.11)).toBe(636); // 6,358 → 6,36
    expect(kmAmountCents(21.2, 0.11)).toBe(233);
  });

  it("parsea km y tarifa", () => {
    expect(parseKm("57,8")).toBe(57.8);
    expect(parseKm("120")).toBe(120);
    expect(parseKm("1,25")).toBeNull();
    expect(parseKm("-3")).toBeNull();
    expect(parseRate("0,11")).toBe(0.11);
    expect(parseRate("0.195")).toBe(0.195);
    expect(parseRate("x")).toBeNull();
    expect(formatKm(57.8)).toBe("57,8");
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

describe("csv", async () => {
  const { csvCell, toCsv } = await import("./csv");
  it("escapa y usa coma decimal", () => {
    expect(csvCell(12.82)).toBe("12,82");
    expect(csvCell('Bar "Pepe"; Rubí')).toBe('"Bar ""Pepe""; Rubí"');
    expect(csvCell(null)).toBe("");
    expect(toCsv([["a", 1.5], ["b", null]])).toBe("﻿a;1,5\r\nb;\r\n");
  });
});

describe("resumen anual", async () => {
  const { buildYearSummary } = await import("./summary");
  it("suma por mes, tipo y cliente", () => {
    const s = buildYearSummary(
      [
        { date: "2026-03-02", category: "km", client_name: "Reig Jofre", km: 57.8, amount_cents: 636 },
        { date: "2026-03-02", category: "dietes", client_name: "Reig Jofre", km: null, amount_cents: 1282 },
        { date: "2026-03-30", category: "km", client_name: "Reig Jofre", km: 57.8, amount_cents: 636 },
        { date: "2026-05-10", category: "altres", client_name: null, km: null, amount_cents: 500 },
        { date: "2026-05-11", category: "km", client_name: "Rubí", km: 21.2, amount_cents: 233 },
      ],
      [{ month: 3, amount_cents: 1000 }],
    );
    expect(s.months).toHaveLength(12);
    expect(s.months[2]).toMatchObject({ total: 2554, advances: 1000, km: 115.6, count: 3 });
    expect(s.months[3].total).toBe(0);
    expect(s.total).toBe(3287);
    expect(s.advances).toBe(1000);
    expect(s.km).toBe(136.8);
    expect(s.byCategory).toMatchObject({ km: 1505, dietes: 1282, altres: 500, autopistes: 0 });
    expect(s.byClient).toEqual([
      { name: "Reig Jofre", total: 2554, km: 115.6, days: 2 },
      { name: "Rubí", total: 233, km: 21.2, days: 1 },
    ]);
  });
});
