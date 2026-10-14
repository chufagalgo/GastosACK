import "server-only";
import type { Client } from "@/lib/supabase/types";
import { getProfile, requireSession } from "./auth";
import { roundTripDistance, type DistanceResult } from "./distance";

/** Dirección completa del cliente para el cálculo de ruta. */
export function clientDestination(c: Pick<Client, "address" | "town">): string {
  return [c.address, c.town].filter((s) => s.trim()).join(", ");
}

export function normalizeClient(c: Client): Client {
  return { ...c, round_trip_km: c.round_trip_km == null ? null : Number(c.round_trip_km) };
}

export async function listClients(opts: { includeArchived?: boolean } = {}): Promise<Client[]> {
  const { supabase } = await requireSession();
  let q = supabase.from("clients").select("*").order("name");
  if (!opts.includeArchived) q = q.eq("archived", false);
  const { data, error } = await q;
  if (error) throw error;
  return data.map(normalizeClient);
}

export async function getClient(id: string): Promise<Client | null> {
  const { supabase } = await requireSession();
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data && normalizeClient(data);
}

/** Calcula los km ida y vuelta desde la dirección de origen de Ajustes. */
export async function distanceFromOrigin(c: Pick<Client, "address" | "town">): Promise<DistanceResult> {
  const profile = await getProfile();
  return roundTripDistance(profile.origin_address, clientDestination(c));
}

/** Recalcula y guarda los km de un cliente. */
export async function recalculateClient(c: Client): Promise<DistanceResult> {
  const result = await distanceFromOrigin(c);
  if (!result.ok) return result;
  const { supabase } = await requireSession();
  const { error } = await supabase
    .from("clients")
    .update({ round_trip_km: result.roundTripKm, km_calculated_at: new Date().toISOString() })
    .eq("id", c.id);
  if (error) return { ok: false, error: "No se ha podido guardar el resultado." };
  return result;
}

export async function recalculateAllClients(): Promise<{ updated: number; failed: string[]; error?: string }> {
  const profile = await getProfile();
  if (!profile.origin_address) return { updated: 0, failed: [], error: "Falta la dirección de origen en Ajustes." };
  const clients = await listClients();
  let updated = 0;
  const failed: string[] = [];
  for (const c of clients) {
    const r = await recalculateClient(c);
    if (r.ok) updated++;
    else failed.push(c.name);
  }
  return { updated, failed };
}
