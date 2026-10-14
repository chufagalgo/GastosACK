import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { TICKET_CATEGORIES } from "@/lib/domain/categories";

// Lectura de tickets con Claude (visión). Solo se llama desde el servidor:
// ANTHROPIC_API_KEY nunca llega al navegador.

const MODEL = "claude-opus-5-5";

export const receiptSchema = z.object({
  date: z.string().nullable().describe("Fecha del ticket en formato YYYY-MM-DD, o null si no aparece"),
  vendor_name: z.string().nullable().describe("Nombre comercial del establecimiento"),
  total_amount: z.number().nullable().describe("Importe TOTAL pagado, IVA incluido, en euros (p. ej. 12.82)"),
  tax_id: z.string().nullable().describe("CIF/NIF del establecimiento tal como aparece, o null"),
  category: z.enum(TICKET_CATEGORIES as [string, ...string[]]).describe("Tipo de gasto sugerido"),
});

export type ReceiptData = z.infer<typeof receiptSchema>;

const SYSTEM = `Lees tickets y facturas de gastos de empresa en España para rellenar una hoja de liquidación.
Devuelve solo lo que se ve en el documento; si un dato no aparece o no se lee con claridad, usa null en lugar de adivinar.
- date: la fecha de la operación (no la de caducidad ni otras). Los tickets españoles usan DD/MM/AAAA.
- total_amount: el total final pagado con IVA incluido, no la base imponible ni el cambio entregado.
- tax_id: el CIF/NIF del comercio (p. ej. B12345678), no el del cliente.
- category:
  - autopistes: peajes de autopista y parkings
  - dietes: restaurantes, bares, cafeterías, comidas
  - allotjaments: hoteles y alojamiento
  - bitllets: tren, avión, autobús, metro, taxi y otros transportes
  - altres: cualquier otra cosa (gasolina, material, etc.)`;

export type ReceiptFile = { data: Buffer; mediaType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf" };

export type ReceiptResult = { ok: true; data: ReceiptData; raw: unknown } | { ok: false; error: string };

export function isReceiptReaderConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function readReceipt(file: ReceiptFile, client?: Anthropic): Promise<ReceiptResult> {
  if (!client && !isReceiptReaderConfigured()) {
    return { ok: false, error: "La lectura automática no está configurada (falta ANTHROPIC_API_KEY). Rellena los datos a mano." };
  }
  const anthropic = client ?? new Anthropic({ maxRetries: 1, timeout: 60_000 });
  const data = file.data.toString("base64");
  const source =
    file.mediaType === "application/pdf"
      ? ({ type: "document", source: { type: "base64", media_type: "application/pdf", data } } as const)
      : ({ type: "image", source: { type: "base64", media_type: file.mediaType, data } } as const);

  try {
    const response = await anthropic.beta.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      // Si el modelo rechaza la petición, la API la repite con el modelo de respaldo recomendado.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "low", format: betaZodOutputFormat(receiptSchema) },
      messages: [{ role: "user", content: [source, { type: "text", text: "Extrae los datos de este ticket." }] }],
    });

    if (response.stop_reason === "refusal") return { ok: false, error: "No se ha podido leer el ticket. Rellena los datos a mano." };
    if (!response.parsed_output) return { ok: false, error: "No se ha entendido el ticket. Rellena los datos a mano." };
    return { ok: true, data: normalize(response.parsed_output), raw: response.parsed_output };
  } catch (e) {
    console.error("Error leyendo ticket", e);
    if (e instanceof Anthropic.AuthenticationError) return { ok: false, error: "La clave de Anthropic no es válida. Rellena los datos a mano." };
    if (e instanceof Anthropic.RateLimitError) return { ok: false, error: "Demasiadas lecturas seguidas. Espera un momento o rellena a mano." };
    return { ok: false, error: "No se ha podido leer el ticket ahora mismo. Rellena los datos a mano." };
  }
}

/** Limpia lo que devuelve el modelo para que el formulario no reciba basura. */
function normalize(d: ReceiptData): ReceiptData {
  const date = d.date && /^\d{4}-\d{2}-\d{2}$/.test(d.date) && !Number.isNaN(Date.parse(d.date)) ? d.date : null;
  const amount = d.total_amount != null && d.total_amount > 0 && d.total_amount < 100_000 ? Math.round(d.total_amount * 100) / 100 : null;
  const taxId = d.tax_id?.replace(/[\s.-]/g, "").toUpperCase() || null;
  return { date, vendor_name: d.vendor_name?.trim() || null, total_amount: amount, tax_id: taxId, category: d.category };
}
