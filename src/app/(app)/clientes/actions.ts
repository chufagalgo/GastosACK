"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseKm } from "@/lib/domain/km";
import { fieldErrors, formValues, str, type FormState } from "@/lib/forms";
import { requireSession } from "@/lib/server/auth";
import { distanceFromOrigin, getClient, recalculateClient } from "@/lib/server/clients";

const clientSchema = z.object({
  name: z.string().min(1, "Escribe el nombre").max(120),
  address: z.string().min(1, "Escribe la dirección").max(300),
  town: z.string().min(1, "Escribe la población").max(120),
  round_trip_km: z.number({ message: "Km no válidos (p. ej. 57,8)" }).max(5000).nullable(),
});

function parseForm(fd: FormData) {
  const kmInput = str(fd, "round_trip_km");
  return clientSchema.safeParse({
    name: str(fd, "name"),
    address: str(fd, "address"),
    town: str(fd, "town"),
    round_trip_km: kmInput === "" ? null : (parseKm(kmInput) ?? undefined),
  });
}

const DUPLICATE = "23505";

/** Alta: si no se escriben los km, se calculan desde la dirección de origen. */
export async function createClientAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireSession();
  const parsed = parseForm(fd);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), values: formValues(fd) };
  const data = { ...parsed.data, km_calculated_at: null as string | null };

  let notice: string | undefined;
  if (data.round_trip_km == null) {
    const distance = await distanceFromOrigin(data);
    if (distance.ok) {
      data.round_trip_km = distance.roundTripKm;
      data.km_calculated_at = new Date().toISOString();
    } else {
      notice = distance.error;
    }
  }

  const { data: row, error } = await supabase.from("clients").insert(data).select("id").single();
  if (error) {
    if (error.code === DUPLICATE) return { fieldErrors: { name: "Ya tienes un cliente con ese nombre" }, values: formValues(fd) };
    return { error: "No se ha podido guardar el cliente.", values: formValues(fd) };
  }
  revalidatePath("/clientes");
  redirect(`/clientes/${row.id}${notice ? `?aviso=${encodeURIComponent(notice)}` : ""}`);
}

/** Edición: los km se guardan tal cual; si se dejan vacíos, se recalculan. */
export async function updateClientAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireSession();
  const current = await getClient(id);
  if (!current) return { error: "Ese cliente ya no existe." };
  const parsed = parseForm(fd);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), values: formValues(fd) };

  const kmChanged = parsed.data.round_trip_km !== current.round_trip_km;
  const { error } = await supabase
    .from("clients")
    .update({ ...parsed.data, ...(kmChanged && { km_calculated_at: null }) })
    .eq("id", id);
  if (error) {
    if (error.code === DUPLICATE) return { fieldErrors: { name: "Ya tienes un cliente con ese nombre" }, values: formValues(fd) };
    return { error: "No se han podido guardar los cambios.", values: formValues(fd) };
  }

  let message = "Cambios guardados";
  if (parsed.data.round_trip_km == null) {
    const r = await recalculateClient({ ...current, ...parsed.data });
    if (!r.ok) {
      revalidatePath("/clientes");
      return { error: `Guardado, pero sin km: ${r.error}` };
    }
    message += " y km calculados";
  }
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ok: message };
}

export async function recalculateClientAction(id: string): Promise<FormState & { km?: number }> {
  const client = await getClient(id);
  if (!client) return { error: "Ese cliente ya no existe." };
  const r = await recalculateClient(client);
  if (!r.ok) return { error: r.error };
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ok: "Km recalculados", km: r.roundTripKm };
}

export async function setArchivedAction(id: string, archived: boolean): Promise<FormState> {
  const { supabase } = await requireSession();
  const { error } = await supabase.from("clients").update({ archived }).eq("id", id);
  if (error) return { error: "No se ha podido actualizar el cliente." };
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ok: archived ? "Cliente archivado" : "Cliente recuperado" };
}

/** Solo se pueden borrar clientes sin gastos; los demás se archivan. */
export async function deleteClientAction(id: string): Promise<FormState> {
  const { supabase } = await requireSession();
  const { count } = await supabase.from("expenses").select("id", { count: "exact", head: true }).eq("client_id", id);
  if (count) return { error: "Este cliente tiene gastos: archívalo en lugar de borrarlo." };
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { error: "No se ha podido borrar el cliente." };
  revalidatePath("/clientes");
  redirect("/clientes");
}
