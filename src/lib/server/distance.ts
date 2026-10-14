import "server-only";
import { roundTripKm } from "@/lib/domain/km";

export type DistanceResult = { ok: true; roundTripKm: number } | { ok: false; error: string };

const TIMEOUT_MS = 10_000;

/**
 * Distancia por carretera origen → destino, devuelta ya como km de ida y vuelta.
 * Usa OpenRouteService (gratis, sin tarjeta) con OPENROUTESERVICE_API_KEY.
 */
export async function roundTripDistance(origin: string, destination: string): Promise<DistanceResult> {
  if (!origin.trim()) return { ok: false, error: "Falta la dirección de origen en Ajustes." };
  if (!destination.trim()) return { ok: false, error: "Falta la dirección del cliente." };

  try {
    const key = process.env.OPENROUTESERVICE_API_KEY;
    if (!key) return { ok: false, error: "No hay clave de mapas configurada. Escribe los km a mano." };
    const meters = await orsMeters(origin, destination, key);

    if (meters == null) return { ok: false, error: "No se ha encontrado ruta por carretera. Revisa las direcciones." };
    return { ok: true, roundTripKm: roundTripKm(meters) };
  } catch (e) {
    console.error("Error calculando distancia", e);
    return { ok: false, error: "No se ha podido calcular la distancia. Inténtalo más tarde o escribe los km a mano." };
  }
}

// OpenRouteService: geocodifica las dos direcciones y pide la ruta en coche.
async function orsMeters(origin: string, destination: string, key: string): Promise<number | null> {
  const [from, to] = await Promise.all([orsGeocode(origin, key), orsGeocode(destination, key)]);
  if (!from || !to) return null;
  const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-car", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: key },
    body: JSON.stringify({ coordinates: [from, to] }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`ORS directions ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { routes?: { summary?: { distance?: number } }[] };
  return data.routes?.[0]?.summary?.distance ?? null;
}

async function orsGeocode(text: string, key: string): Promise<[number, number] | null> {
  const url = new URL("https://api.openrouteservice.org/geocode/search");
  url.search = new URLSearchParams({ api_key: key, text, size: "1", "boundary.country": "ES" }).toString();
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  if (!res.ok) throw new Error(`ORS geocode ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { features?: { geometry: { coordinates: [number, number] } }[] };
  return data.features?.[0]?.geometry.coordinates ?? null;
}
