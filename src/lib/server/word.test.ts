import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { beforeAll, describe, expect, it } from "vitest";
import { imageSize } from "@/lib/domain/images";
import { buildWord, wordFileName, type WordExpense } from "./word";

const fixture = (name: string) => new Uint8Array(readFileSync(path.join(process.cwd(), "tests/fixtures", name)));
const alto = fixture("alto.jpg"); // 600×800
const apaisado = fixture("apaisado.png"); // 800×450
const pequeno = fixture("pequeno.jpg"); // 200×150

const e = (date: string, category: WordExpense["category"], euros: number, image: Uint8Array | null, extra: Partial<WordExpense> = {}): WordExpense => ({
  date, category, client_name: "Reig Jofre", project: "125.9.720", km: null, amount_cents: Math.round(euros * 100), image, ...extra,
});

const EXPENSES: WordExpense[] = [
  e("2026-03-31", "dietes", 15.5, pequeno),
  e("2026-03-02", "km", 6.36, null, { km: 57.8 }),
  e("2026-03-02", "dietes", 12.82, alto),
  e("2026-03-02", "autopistes", 2, apaisado, { client_name: null, project: "" }),
  e("2026-03-20", "bitllets", 23.4, apaisado),
  e("2026-03-24", "altres", 5, null), // foto que no se ha podido cargar
];

const hasSoffice = (() => {
  try {
    execFileSync("soffice", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe("Word de tickets", () => {
  let docx: Buffer;
  let xml: string;

  beforeAll(async () => {
    docx = await buildWord({ company: "ACK Logic", fullName: "Héctor Alcañiz", year: 2026, month: 3, expenses: EXPENSES });
    xml = await (await JSZip.loadAsync(docx)).file("word/document.xml")!.async("string");
  });

  it("nombre del fichero en catalán", () => {
    expect(wordFileName(2026, 3)).toBe("Tickets_Març_2026.docx");
  });

  it("portada y tabla resumen", () => {
    expect(xml).toContain("Liquidació despeses – Març 2026");
    expect(xml).toContain("Héctor Alcañiz");
    expect(xml).toContain("ACK Logic");
    expect(xml).toContain("Total del mes: 65,08 €");
    for (const h of ["Data", "Client", "Projecte", "Categoria", "Import"]) expect(xml).toContain(`>${h}<`);
    expect(xml).toContain("02/03/2026");
    expect(xml).toContain("Quilometratge (57,8 km)");
    // Ordenada por fecha: el día 2 antes que el 31
    expect(xml.indexOf("02/03/2026")).toBeLessThan(xml.indexOf("31/03/2026"));
  });

  it("un bloque por ticket, ordenados por fecha, con encabezado Dia – Client – Categoria – Import", () => {
    const titles = [...xml.matchAll(/>(Dia \d+ – [^<]+)</g)].map((m) => m[1]);
    expect(titles).toEqual([
      "Dia 2 – Reig Jofre – Dietes – 12,82 €",
      "Dia 2 – Autopistes – 2,00 €",
      "Dia 20 – Reig Jofre – Bitllets – 23,40 €",
      "Dia 24 – Reig Jofre – Altres – 5,00 €",
      "Dia 31 – Reig Jofre – Dietes – 15,50 €",
    ]);
    expect(xml).toContain("pogut carregar la imatge"); // el apóstrofo va escapado en el XML
  });

  it("imágenes escaladas sin deformar y sin agrandar", () => {
    const extents = [...xml.matchAll(/<wp:extent cx="(\d+)" cy="(\d+)"\/>/g)].map((m) => [Number(m[1]), Number(m[2])]);
    expect(extents).toHaveLength(4);
    const originals = [alto, apaisado, apaisado, pequeno].map((b) => imageSize(b)!);
    extents.forEach(([cx, cy], i) => {
      const o = originals[i];
      expect(Math.abs(cx / cy - o.width / o.height)).toBeLessThan(0.01); // misma proporción
      expect(cx / 9525).toBeLessThanOrEqual(o.width + 1); // no se agranda
      expect(cy / 9525).toBeLessThanOrEqual(435); // cabe en media página
    });
  });

  it.skipIf(!hasSoffice)("en PDF: portada + resumen + 2 tickets por página = 5 páginas", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "word-"));
    writeFileSync(path.join(dir, "t.docx"), docx);
    execFileSync("soffice", ["--headless", "--convert-to", "pdf", "--outdir", dir, path.join(dir, "t.docx")], { stdio: "ignore", timeout: 120_000 });
    const info = execFileSync("pdfinfo", [path.join(dir, "t.pdf")]).toString();
    expect(info).toMatch(/Pages:\s+5\b/);
    if (process.env.WORD_PDF_OUT) writeFileSync(process.env.WORD_PDF_OUT, readFileSync(path.join(dir, "t.pdf")));
  }, 120_000);
});
