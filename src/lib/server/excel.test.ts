import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { beforeAll, describe, expect, it } from "vitest";
import type { ExpenseForExcel } from "@/lib/domain/excel-rows";
import { buildExcel, TEMPLATE_PATH, type ExcelInput } from "./excel";

// Los gastos de marzo de 2026 tal como están en la plantilla del usuario.
const RJ = { client_name: "Reig Jofre", place: "Sant Joan d'espi" };
const km = (date: string, km: number, extra: Partial<ExpenseForExcel>): ExpenseForExcel => ({
  date, category: "km", km, km_rate: 0.11, amount_cents: Math.round(km * 11), client_name: null, project: "", place: "", ...extra,
});
const ticket = (date: string, euros: number, extra: Partial<ExpenseForExcel>): ExpenseForExcel => ({
  date, category: "dietes", km: null, km_rate: null, amount_cents: Math.round(euros * 100), client_name: null, project: "", place: "", ...extra,
});

const MARCH: ExcelInput = {
  company: "ACK Logic",
  fullName: "Héctor Alcañiz",
  year: 2026,
  month: 3,
  defaultRate: 0.11,
  itmHours: true,
  timeControl: true,
  advances: [],
  expenses: [
    km("2026-03-02", 57.8, { ...RJ, project: "Comercial" }),
    ticket("2026-03-02", 12.82, { ...RJ, project: "Comercial" }),
    ticket("2026-03-02", 2, { ...RJ, project: "Comercial" }),
    ticket("2026-03-02", 6.5, { ...RJ, project: "Comercial" }),
    km("2026-03-20", 21.2, { client_name: "Revision Medica", project: "NA", place: "Rubi" }),
    ticket("2026-03-20", 6.7, { client_name: "Revision Medica", project: "NA", place: "Rubi" }),
    km("2026-03-24", 21.2, { client_name: "Revision Medica 2", project: "NA", place: "Rubi" }),
    km("2026-03-30", 57.8, { ...RJ, project: "125.9.720" }),
    ticket("2026-03-30", 11.45, { ...RJ, project: "125.9.720" }),
    ticket("2026-03-30", 14, { ...RJ, project: "125.9.720" }),
    km("2026-03-31", 57.8, { ...RJ, project: "125.9.720" }),
    ticket("2026-03-31", 5.1, { ...RJ, project: "125.9.720" }),
    ticket("2026-03-31", 15.5, { ...RJ, project: "125.9.720" }),
  ],
};

async function load(source: string | Buffer) {
  const wb = new ExcelJS.Workbook();
  if (typeof source === "string") await wb.xlsx.readFile(source);
  else await wb.xlsx.load(source as unknown as ArrayBuffer);
  return wb.getWorksheet("Hoja de Gastos")!;
}

/** Valor comparable: fórmula normalizada o valor literal. */
function content(cell: ExcelJS.Cell): unknown {
  if (cell.formula) return { formula: cell.formula.replace(/^\+/, "") };
  return cell.value;
}

/** Recalcula con LibreOffice y devuelve las celdas pedidas como texto (vía CSV). */
function recalc(buf: Buffer): string[][] {
  const dir = mkdtempSync(path.join(tmpdir(), "gastos-"));
  const file = path.join(dir, "out.xlsx");
  writeFileSync(file, buf);
  execFileSync("soffice", ["--headless", "--calc", "--convert-to", "csv:Text - txt - csv (StarCalc):44,34,76,1,,0,false,true,false,false", "--outdir", dir, file], { stdio: "ignore", timeout: 120_000 });
  return readFileSync(path.join(dir, "out.csv"), "utf8").split("\n").map((l) => l.split(","));
}

const hasSoffice = (() => {
  try {
    execFileSync("soffice", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe("Excel mensual", () => {
  let template: ExcelJS.Worksheet;
  let march: ExcelJS.Worksheet;
  let marchBuf: Buffer;

  beforeAll(async () => {
    expect(existsSync(TEMPLATE_PATH)).toBe(true);
    template = await load(TEMPLATE_PATH);
    marchBuf = await buildExcel(MARCH);
    march = await load(marchBuf);
  });

  it("reconstruye marzo igual que la plantilla, celda a celda (A1:M47)", () => {
    const diffs: string[] = [];
    for (let r = 1; r <= 47; r++) {
      for (const col of "ABCDEFGHIJKLM") {
        const addr = `${col}${r}`;
        let expected = content(template.getCell(addr));
        // La plantilla tiene E28 como "=10.6*2"; la app guarda los km ya calculados (21,2).
        if (addr === "E28") expected = 21.2;
        // Celdas combinadas J42:L42 / J43:L43: ExcelJS repite el valor; da igual.
        if (JSON.stringify(content(march.getCell(addr))) !== JSON.stringify(expected)) {
          diffs.push(`${addr}: plantilla=${JSON.stringify(expected)} app=${JSON.stringify(content(march.getCell(addr)))}`);
        }
      }
    }
    expect(diffs).toEqual([]);
  });

  it("conserva formato, celdas combinadas, anchos e impresión", () => {
    for (let r = 1; r <= 50; r++) {
      expect(march.getRow(r).height, `alto fila ${r}`).toBe(template.getRow(r).height);
      for (const col of "ABCDEFGHIJKLMNOPQ") {
        const addr = `${col}${r}`;
        expect(march.getCell(addr).style, addr).toEqual(template.getCell(addr).style);
      }
    }
    expect(march.model.merges).toEqual(template.model.merges);
    for (let c = 1; c <= 17; c++) expect(march.getColumn(c).width, `ancho col ${c}`).toBe(template.getColumn(c).width);
    expect(march.pageSetup).toEqual(template.pageSetup);
  });

  it("vacía los cálculos sueltos de P8:Q13", () => {
    for (let r = 8; r <= 13; r++) for (const col of "PQ") expect(march.getCell(`${col}${r}`).value).toBeNull();
  });

  it.skipIf(!hasSoffice)("recalculado con LibreOffice, los totales cuadran con la plantilla (97,81 €)", () => {
    const rows = recalc(marchBuf);
    const cell = (addr: string) => Number(rows[Number(addr.slice(1)) - 1][addr.charCodeAt(0) - 65]);
    // Mismos resultados que guardaba la plantilla (6,358 + 21,32 …; total 97,808 → 97,81 €).
    for (const addr of ["M10", "M28", "M32", "M38", "M39", "M44"]) {
      const cached = (template.getCell(addr).value as { result: number }).result;
      expect(cell(addr), addr).toBeCloseTo(cached, 9);
    }
    expect(cell("M44")).toBeCloseTo(97.808, 9);
    expect(cell("M45")).toBe(0);
    expect(cell("M46")).toBeCloseTo(97.808, 9);
  }, 120_000);

  it("febrero: los días 29–31 quedan vacíos; anticipos y casillas", async () => {
    const buf = await buildExcel({
      ...MARCH,
      month: 2,
      itmHours: false,
      timeControl: true,
      expenses: [km("2026-02-27", 40, { client_name: "A", project: "P1", place: "X" }), km("2026-02-27", 12.5, { client_name: "B", project: "P2", place: "Y" })],
      advances: [
        { position: 1, date: "2026-02-03", amount_cents: 5000 },
        { position: 3, date: "2026-02-20", amount_cents: 1000 },
      ],
    });
    const ws = await load(buf);
    expect(ws.getCell("K4").value).toBe("Febrer");
    expect(ws.getCell("A36").value).toBe(28);
    for (const r of [37, 38, 39]) for (const col of "ABCDEFGHIJKLM") expect(ws.getCell(`${col}${r}`).value, `${col}${r}`).toBeNull();
    // Dos clientes el mismo día: unidos con " / " y km como suma.
    expect(ws.getCell("B35").value).toBe("A / B");
    expect(ws.getCell("C35").value).toBe("P1 / P2");
    expect(ws.getCell("D35").value).toBe("X / Y");
    expect(ws.getCell("E35").formula).toBe("40+12.5");
    expect(ws.getCell("M42").value).toBe("no");
    expect(ws.getCell("M43").value).toBe("si");
    expect((ws.getCell("A44").value as Date).toISOString().slice(0, 10)).toBe("2026-02-03");
    expect(ws.getCell("B44").value).toBe(50);
    expect(ws.getCell("A45").value).toBeNull();
    expect(ws.getCell("B46").value).toBe(10);

    if (hasSoffice) {
      const rows = recalc(buf);
      const cell = (addr: string) => Number(rows[Number(addr.slice(1)) - 1][addr.charCodeAt(0) - 65]);
      expect(cell("M44")).toBeCloseTo(5.775, 9); // 52,5 km × 0,11
      expect(cell("M45")).toBe(60);
      expect(cell("M46")).toBeCloseTo(-54.225, 9);
    }
  }, 120_000);

  it("cada fórmula lleva su resultado guardado (Vista protegida y vistas previas no recalculan)", async () => {
    const xml = await (await JSZip.loadAsync(marchBuf)).file("xl/worksheets/sheet1.xml")!.async("string");
    const formulaCells = [...xml.matchAll(/<c r="([A-Z]+\d+)"[^>]*>(.*?)<\/c>/g)].filter((m) => m[2].includes("<f>"));
    expect(formulaCells.length).toBeGreaterThan(60);
    const withoutValue = formulaCells.filter((m) => !/<v>[^<]+<\/v>/.test(m[2])).map((m) => m[1]);
    expect(withoutValue).toEqual([]);

    // Los resultados guardados son los mismos que daba la plantilla de marzo.
    // (al releer, ExcelJS convierte un resultado 0 en undefined; en el fichero sí está "<v>0</v>")
    const result = (addr: string) => (march.getCell(addr).value as { result?: number }).result ?? 0;
    expect(result("I10")).toBeCloseTo(21.32, 9); // =12.82+2+6.5
    expect(result("M10")).toBeCloseTo(27.678, 9);
    expect(result("I38")).toBeCloseTo(25.45, 9); // =11.45+14
    expect(result("M44")).toBeCloseTo(97.808, 9);
    expect(result("M45")).toBe(0);
    expect(result("M46")).toBeCloseTo(97.808, 9);
  });

  it.skipIf(!hasSoffice)("los resultados guardados coinciden con los que recalcula LibreOffice en todas las celdas", () => {
    const rows = recalc(marchBuf);
    for (let r = 9; r <= 46; r++) {
      for (const col of "EGHIJKLM") {
        const cell = march.getCell(`${col}${r}`);
        if (!cell.formula) continue;
        const lo = Number(rows[r - 1][col.charCodeAt(0) - 65]);
        expect((cell.value as { result?: number }).result ?? 0, `${col}${r}`).toBeCloseTo(lo, 9);
      }
    }
  }, 120_000);
});
