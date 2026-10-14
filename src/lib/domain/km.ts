// Kilometraje. Los km se guardan con un decimal y la tarifa en €/km con tres.

/** Distancia de ida (metros) → km de ida y vuelta, redondeado a 1 decimal. */
export function roundTripKm(oneWayMeters: number): number {
  return Math.round((oneWayMeters / 1000) * 2 * 10) / 10;
}

/** Importe de un desplazamiento en céntimos: km × €/km. */
export function kmAmountCents(km: number, ratePerKm: number): number {
  return Math.round(km * ratePerKm * 100);
}

/** "57,8" o "57.8" → 57.8. null si no es un número ≥ 0 con como mucho 1 decimal. */
export function parseKm(input: string): number | null {
  const s = input.trim().replace(",", ".");
  if (!/^\d+(\.\d)?$/.test(s)) return null;
  return Number(s);
}

/** "0,11" → 0.11. null si no es una tarifa válida (≥ 0, hasta 3 decimales). */
export function parseRate(input: string): number | null {
  const s = input.trim().replace("€", "").trim().replace(",", ".");
  if (!/^\d+(\.\d{1,3})?$/.test(s)) return null;
  return Number(s);
}

/** 57.8 → "57,8" */
export function formatKm(km: number): string {
  return km.toLocaleString("es-ES", { maximumFractionDigits: 1 });
}
