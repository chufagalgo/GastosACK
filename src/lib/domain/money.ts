// Utilidades de dinero. Todo se maneja en céntimos (enteros).

/** 200 → "2 €", 250 → "2,50 €" */
export function formatEuros(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const rest = abs % 100;
  const body = rest === 0 ? `${euros}` : `${euros},${String(rest).padStart(2, "0")}`;
  return `${sign}${body} €`;
}

/** "2", "2,5", "2.50" → céntimos. Devuelve null si no es un importe válido. */
export function parseEuros(input: string): number | null {
  const normalized = input.trim().replace("€", "").trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}
