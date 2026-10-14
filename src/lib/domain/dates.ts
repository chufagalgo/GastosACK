// Fechas "de calendario" (sin hora), guardadas como medianoche UTC.

/** "2026-10-14" → Date a medianoche UTC. null si no es válida. */
export function parseDateOnly(input: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const d = new Date(`${input}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== input ? null : d;
}

export function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Primer día del mes y primer día del mes siguiente (UTC). */
export function monthRange(year: number, month: number): { start: Date; end: Date } {
  return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
}

/** "2026-10" → { year: 2026, month: 10 }; si no es válido, el mes de `fallback`. */
export function parseMonth(input: string | undefined, fallback: Date): { year: number; month: number } {
  const m = input?.match(/^(\d{4})-(\d{2})$/);
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return { year: Number(m[1]), month: Number(m[2]) };
  return { year: fallback.getUTCFullYear(), month: fallback.getUTCMonth() + 1 };
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function monthLabel(year: number, month: number): string {
  const s = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDay(d: Date): string {
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/** Hoy en España como "YYYY-MM-DD" (el servidor puede estar en UTC). */
export function todayInSpain(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** ¿La fecha "YYYY-MM-DD" cae en ese mes? */
export function isInMonth(date: string, year: number, month: number): boolean {
  return date.startsWith(`${monthKey(year, month)}-`);
}

/** Días que tiene un mes (28–31). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** "2026-03-02" → "lunes 2" */
export function weekdayDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", timeZone: "UTC" });
}
