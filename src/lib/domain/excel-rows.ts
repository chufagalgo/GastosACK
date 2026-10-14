// Convierte los gastos de un mes en las filas de la hoja "Hoja de Gastos" (una por día).
// Lógica pura, sin ExcelJS, para poder probarla sin generar el fichero.

import { TICKET_CATEGORIES, type TicketCategory } from "./categories";
import { daysInMonth } from "./dates";

export const CATALAN_MONTHS = [
  "Gener", "Febrer", "Març", "Abril", "Maig", "Juny", "Juliol", "Agost", "Setembre", "Octubre", "Novembre", "Desembre",
];

/** Valor de una celda: vacía, un número, o una fórmula suma (sin "=", como la guarda ExcelJS). */
export type CellValue = null | number | { formula: string };

export interface ExpenseForExcel {
  date: string; // YYYY-MM-DD
  category: "km" | TicketCategory;
  client_name: string | null;
  project: string;
  place: string;
  km: number | null;
  km_rate: number | null;
  amount_cents: number;
}

export interface DayRow {
  day: number;
  row: number; // fila del Excel (8 + día)
  client: string; // B
  project: string; // C
  place: string; // D
  km: CellValue; // E
  rate: number; // F
  amounts: Record<TicketCategory, CellValue>; // H–L
}

/** Columna del Excel de cada categoría de ticket. */
export const CATEGORY_COLUMN: Record<TicketCategory, string> = {
  autopistes: "H",
  dietes: "I",
  allotjaments: "J",
  bitllets: "K",
  altres: "L",
};

/** 12.82 → "12.82"; números con punto decimal, como los escribe Excel en una fórmula. */
function num(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** Uno → el número; varios → fórmula "12.82+2+6.5" para que se vea el desglose; ninguno → null. */
export function sumCell(values: number[]): CellValue {
  if (values.length === 0) return null;
  if (values.length === 1) return values[0];
  return { formula: values.map(num).join("+") };
}

/** Valores distintos y no vacíos, en orden de aparición, unidos con " / ". */
function joinDistinct(values: string[]): string {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].join(" / ");
}

/**
 * Filas de los días que existen en el mes (1..28/29/30/31).
 * `defaultRate` es la tarifa para la columna F en días sin km (la plantilla la lleva en todas las filas).
 */
export function buildDayRows(expenses: ExpenseForExcel[], year: number, month: number, defaultRate: number): DayRow[] {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  const rows: DayRow[] = [];
  for (let day = 1; day <= daysInMonth(year, month); day++) {
    const date = `${prefix}${String(day).padStart(2, "0")}`;
    const items = expenses.filter((e) => e.date === date);
    const kmItems = items.filter((e) => e.category === "km" && e.km != null);
    const amounts = Object.fromEntries(
      TICKET_CATEGORIES.map((c) => [c, sumCell(items.filter((e) => e.category === c).map((e) => e.amount_cents / 100))]),
    ) as Record<TicketCategory, CellValue>;
    rows.push({
      day,
      row: 8 + day,
      client: joinDistinct(items.map((e) => e.client_name ?? "")),
      project: joinDistinct(items.map((e) => e.project)),
      place: joinDistinct(items.map((e) => e.place)),
      km: sumCell(kmItems.map((e) => e.km!)),
      rate: kmItems[0]?.km_rate ?? defaultRate,
      amounts,
    });
  }
  return rows;
}

/** Nombre del fichero: Gastos_Març_2026.xlsx */
export function excelFileName(year: number, month: number): string {
  return `Gastos_${CATALAN_MONTHS[month - 1]}_${year}.xlsx`;
}
