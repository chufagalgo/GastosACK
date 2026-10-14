import type { ExpenseCategory } from "@/lib/supabase/types";

export type TicketCategory = Exclude<ExpenseCategory, "km">;

/** Categorías de ticket, en el orden de las columnas H–L del Excel. */
export const TICKET_CATEGORIES: TicketCategory[] = ["autopistes", "dietes", "allotjaments", "bitllets", "altres"];

export const CATEGORY_INFO: Record<ExpenseCategory, { label: string; hint: string; emoji: string; excel: string }> = {
  km: { label: "Kilometraje", hint: "Desplazamiento con coche", emoji: "🚗", excel: "K.M." },
  autopistes: { label: "Autopistas", hint: "Peajes y parking", emoji: "🛣️", excel: "Autopistes" },
  dietes: { label: "Dietas", hint: "Restaurantes y comidas", emoji: "🍽️", excel: "Dietes" },
  allotjaments: { label: "Alojamiento", hint: "Hoteles", emoji: "🏨", excel: "Allotjaments" },
  bitllets: { label: "Billetes", hint: "Tren, avión, transporte", emoji: "🚆", excel: "Bitllets de.." },
  altres: { label: "Otros", hint: "Cualquier otro gasto", emoji: "🧾", excel: "Altres" },
};

export function isTicketCategory(v: unknown): v is TicketCategory {
  return typeof v === "string" && (TICKET_CATEGORIES as string[]).includes(v);
}
