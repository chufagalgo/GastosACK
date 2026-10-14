import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { CATEGORY_INFO } from "@/lib/domain/categories";
import { CATALAN_MONTHS } from "@/lib/domain/excel-rows";
import { fitInside, imageSize } from "@/lib/domain/images";
import { formatKm } from "@/lib/domain/km";
import { formatEuros } from "@/lib/domain/money";
import type { ExpenseCategory } from "@/lib/supabase/types";

// Word del mes: portada, tabla resumen y un bloque por ticket (dos por página), en catalán.

export interface WordExpense {
  date: string;
  category: ExpenseCategory;
  client_name: string | null;
  project: string;
  km: number | null;
  amount_cents: number;
  image: Uint8Array | null; // foto del ticket (JPEG/PNG); null en km o si no se ha podido cargar
}

export interface WordInput {
  company: string;
  fullName: string;
  year: number;
  month: number;
  expenses: WordExpense[];
}

// A4 con márgenes de 1,5 cm. 1 px = 15 twips (96 ppp).
const PAGE = { width: 11906, height: 16838, margin: 850 };
const CONTENT_W_PX = Math.floor((PAGE.width - 2 * PAGE.margin) / 15); // ≈ 680
const CONTENT_H_PX = Math.floor((PAGE.height - 2 * PAGE.margin) / 15); // ≈ 1009
// Dos tickets por página: cada bloque tiene media página, menos el encabezado.
const IMAGE_MAX_H_PX = Math.floor(CONTENT_H_PX / 2) - 70;

export function wordFileName(year: number, month: number): string {
  return `Tickets_${CATALAN_MONTHS[month - 1]}_${year}.docx`;
}

function dayMonth(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

function categoryText(e: WordExpense): string {
  return e.category === "km" && e.km != null ? `${CATEGORY_INFO.km.ca} (${formatKm(e.km)} km)` : CATEGORY_INFO[e.category].ca;
}

function cell(text: string, opts: { bold?: boolean; right?: boolean; shade?: boolean } = {}) {
  return new TableCell({
    children: [
      new Paragraph({
        alignment: opts.right ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [new TextRun({ text, bold: opts.bold, size: 20 })],
      }),
    ],
    shading: opts.shade ? { fill: "E7E6E6" } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
  });
}

export async function buildWord(input: WordInput): Promise<Buffer> {
  const monthName = CATALAN_MONTHS[input.month - 1];
  const sorted = [...input.expenses].sort((a, b) => a.date.localeCompare(b.date));
  const total = sorted.reduce((s, e) => s + e.amount_cents, 0);
  const tickets = sorted.filter((e) => e.category !== "km");

  // ── Portada
  const cover = [
    new Paragraph({ spacing: { before: 3000 } }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Liquidació despeses – ${monthName} ${input.year}`, bold: true, size: 48 })],
    }),
    new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: input.fullName, size: 32 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: input.company, size: 28 })] }),
    new Paragraph({
      spacing: { before: 800 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Total del mes: ${formatEuros(total)}`, bold: true, size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `${tickets.length} tiquets · ${sorted.length} despeses`, size: 22, color: "666666" })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  // ── Tabla resumen
  const widths = [14, 26, 18, 26, 16]; // %
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widths.map((w) => Math.round(((PAGE.width - 2 * PAGE.margin) * w) / 100)),
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: ["Data", "Client", "Projecte", "Categoria", "Import"].map((h, i) => cell(h, { bold: true, shade: true, right: i === 4 })),
      }),
      ...sorted.map(
        (e) =>
          new TableRow({
            cantSplit: true,
            children: [
              cell(dayMonth(e.date)),
              cell(e.client_name ?? ""),
              cell(e.project),
              cell(categoryText(e)),
              cell(formatEuros(e.amount_cents), { right: true }),
            ],
          }),
      ),
      new TableRow({
        children: [cell("Total", { bold: true, shade: true }), cell("", { shade: true }), cell("", { shade: true }), cell("", { shade: true }), cell(formatEuros(total), { bold: true, right: true, shade: true })],
      }),
    ],
  });
  const summary = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 200 }, children: [new TextRun({ text: "Resum de despeses", bold: true })] }),
    table,
  ];

  // ── Tickets: dos por página
  const ticketBlocks = tickets.flatMap((e, i) => {
    const day = Number(e.date.slice(8, 10));
    const title = [`Dia ${day}`, e.client_name, CATEGORY_INFO[e.category].ca, formatEuros(e.amount_cents)].filter(Boolean).join(" – ");
    const heading = new Paragraph({
      heading: HeadingLevel.HEADING_2,
      pageBreakBefore: i % 2 === 0, // el 1.º, 3.º, 5.º… empiezan página
      spacing: { before: i % 2 === 0 ? 0 : 300, after: 120 },
      keepNext: true,
      children: [new TextRun({ text: title, bold: true, size: 24 })],
    });
    const size = e.image ? imageSize(e.image) : null;
    if (!e.image || !size) {
      return [heading, new Paragraph({ children: [new TextRun({ text: "(No s'ha pogut carregar la imatge del tiquet)", italics: true, color: "999999" })] })];
    }
    const fit = fitInside(size.width, size.height, CONTENT_W_PX, IMAGE_MAX_H_PX);
    return [
      heading,
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({ type: size.type, data: e.image, transformation: fit, altText: { name: title, description: title, title } })],
      }),
    ];
  });

  const doc = new Document({
    creator: input.fullName,
    title: `Liquidació despeses – ${monthName} ${input.year}`,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        properties: { page: { size: { width: PAGE.width, height: PAGE.height }, margin: { top: PAGE.margin, bottom: PAGE.margin, left: PAGE.margin, right: PAGE.margin } } },
        children: [...cover, ...summary, ...ticketBlocks],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
