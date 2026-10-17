import "server-only";
import path from "node:path";
import ExcelJS from "exceljs";
import { CATEGORY_COLUMN, CATALAN_MONTHS, buildDayRows, type CellValue, type ExpenseForExcel } from "@/lib/domain/excel-rows";
import { TICKET_CATEGORIES } from "@/lib/domain/categories";

// Rellena la plantilla del usuario (templates/Gastos_Marzo.xlsx) conservando formato,
// celdas combinadas, impresión y fórmulas. Solo se tocan las celdas de datos.

export const TEMPLATE_PATH = path.join(process.cwd(), "templates", "Gastos_Marzo.xlsx");
const SHEET = "Hoja de Gastos";
const FIRST_ROW = 9; // día 1
const LAST_ROW = 39; // día 31

export interface ExcelInput {
  company: string;
  fullName: string;
  year: number;
  month: number;
  defaultRate: number;
  expenses: ExpenseForExcel[];
  advances: { position: number; date: string; amount_cents: number }[]; // hasta 4
  itmHours: boolean;
  timeControl: boolean;
}

// Cada fórmula se guarda con su resultado ya calculado: si no, Excel en "Vista protegida"
// (ficheros descargados) y las vistas previas del móvil/correo muestran las celdas vacías.
function toExcel(v: CellValue, result: number): ExcelJS.CellValue {
  return v == null || typeof v === "number" ? v : { formula: v.formula, result };
}

export async function buildExcel(input: ExcelInput, templatePath = TEMPLATE_PATH): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.getWorksheet(SHEET);
  if (!ws) throw new Error(`La plantilla no tiene la hoja "${SHEET}"`);

  // Cabecera
  ws.getCell("B3").value = input.company;
  ws.getCell("B4").value = input.fullName;
  ws.getCell("K4").value = CATALAN_MONTHS[input.month - 1];
  ws.getCell("M4").value = input.year;

  // Días: primero se vacía todo lo que traía la plantilla (datos de marzo), después se rellena.
  const rows = new Map(buildDayRows(input.expenses, input.year, input.month, input.defaultRate).map((r) => [r.row, r]));
  for (let r = FIRST_ROW; r <= LAST_ROW; r++) {
    for (const col of "ABCDEFGHIJKLM") ws.getCell(`${col}${r}`).value = null;
    const d = rows.get(r);
    if (!d) continue; // día que no existe en el mes (p. ej. 30 de febrero): fila vacía
    ws.getCell(`A${r}`).value = d.day;
    ws.getCell(`B${r}`).value = d.client || null;
    ws.getCell(`C${r}`).value = d.project || null;
    ws.getCell(`D${r}`).value = d.place || null;
    ws.getCell(`E${r}`).value = toExcel(d.km, d.kmSum);
    ws.getCell(`F${r}`).value = d.rate;
    ws.getCell(`G${r}`).value = { formula: `F${r}*E${r}`, result: d.kmAmount };
    for (const c of TICKET_CATEGORIES) ws.getCell(`${CATEGORY_COLUMN[c]}${r}`).value = toExcel(d.amounts[c], d.sums[c]);
    // La plantilla lleva un 0 en Autopistes en todos los días.
    if (ws.getCell(`H${r}`).value == null) ws.getCell(`H${r}`).value = 0;
    ws.getCell(`M${r}`).value = { formula: `G${r}+H${r}+I${r}+J${r}+K${r}+L${r}`, result: d.total };
  }

  // Cálculos sueltos del usuario en P8:Q13 (de cuando no tenía coche de empresa): fuera.
  for (let r = 8; r <= 13; r++) for (const col of "PQ") ws.getCell(`${col}${r}`).value = null;

  // Anticipos ("Bestretes a compte") en A44:B47
  for (let i = 0; i < 4; i++) {
    const a = input.advances.find((x) => x.position === i + 1);
    const dateCell = ws.getCell(`A${44 + i}`);
    const amountCell = ws.getCell(`B${44 + i}`);
    dateCell.value = a ? new Date(`${a.date}T00:00:00Z`) : null;
    amountCell.value = a ? a.amount_cents / 100 : null;
    if (a) {
      dateCell.numFmt = "dd/mm/yyyy";
      amountCell.numFmt = "#,##0.00";
    }
  }

  ws.getCell("M42").value = input.itmHours ? "si" : "no";
  ws.getCell("M43").value = input.timeControl ? "si" : "no";
  const monthTotal = [...rows.values()].reduce((a, d) => a + d.total, 0);
  const advancesTotal = input.advances.reduce((a, x) => a + x.amount_cents, 0) / 100;
  ws.getCell("M44").value = { formula: "SUM(M9:M39)", result: monthTotal };
  ws.getCell("M45").value = { formula: "+B44+B45+B46+B47", result: advancesTotal };
  ws.getCell("M46").value = { formula: "M44-M45", result: monthTotal - advancesTotal };

  // ExcelJS activaría la numeración de página propia; la plantilla no la usa.
  delete ws.pageSetup.firstPageNumber;

  // Además, que Excel lo recalcule todo al abrir (cuando no está en Vista protegida).
  wb.calcProperties = { ...wb.calcProperties, fullCalcOnLoad: true };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
