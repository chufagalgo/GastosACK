import type { ExpenseCategory } from "@/lib/supabase/types";

export type TicketCategory = Exclude<ExpenseCategory, "km">;

/** Categorías de ticket, en el orden de las columnas H–L del Excel. */
export const TICKET_CATEGORIES: TicketCategory[] = ["autopistes", "dietes", "allotjaments", "bitllets", "altres"];

// label/hint: pantalla (castellano); ca: exportaciones (catalán, como la plantilla).
export const CATEGORY_INFO: Record<ExpenseCategory, { label: string; hint: string; emoji: string; excel: string; ca: string }> = {
  km: { label: "Kilometraje", hint: "Desplazamiento con coche", emoji: "🚗", excel: "K.M.", ca: "Quilometratge" },
  autopistes: { label: "Autopistas", hint: "Peajes y parking", emoji: "🛣️", excel: "Autopistes", ca: "Autopistes" },
  dietes: { label: "Dietas", hint: "Restaurantes y comidas", emoji: "🍽️", excel: "Dietes", ca: "Dietes" },
  allotjaments: { label: "Alojamiento", hint: "Hoteles", emoji: "🏨", excel: "Allotjaments", ca: "Allotjaments" },
  bitllets: { label: "Billetes", hint: "Tren, avión, transporte", emoji: "🚆", excel: "Bitllets de..", ca: "Bitllets" },
  altres: { label: "Otros", hint: "Cualquier otro gasto", emoji: "🧾", excel: "Altres", ca: "Altres" },
};

export function isTicketCategory(v: unknown): v is TicketCategory {
  return typeof v === "string" && (TICKET_CATEGORIES as string[]).includes(v);
}
