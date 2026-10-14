// Utilidades de dinero. Todo se maneja en céntimos (enteros).

const eurFormat = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });

/** 1234567 → "12.345,67 €" (siempre 2 decimales y coma decimal) */
export function formatEuros(cents: number): string {
  return `${eurFormat.format(cents / 100)} €`;
}

/** 1250 → "12,50" (para rellenar inputs) */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** "2", "2,5", "2.50", "1.234,56" → céntimos. Devuelve null si no es un importe válido. */
export function parseEuros(input: string): number | null {
  let s = input.trim().replace("€", "").trim();
  // Con coma decimal, los puntos son separadores de miles.
  if (s.includes(",")) s = s.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}
