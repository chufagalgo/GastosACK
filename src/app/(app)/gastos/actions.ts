"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isTicketCategory } from "@/lib/domain/categories";
import { isInMonth, monthLabel, parseDateOnly, todayInSpain } from "@/lib/domain/dates";
import { kmAmountCents, parseKm } from "@/lib/domain/km";
import { parseEuros } from "@/lib/domain/money";
import { formValues, str, type FormState } from "@/lib/forms";
import { getProfile, requireSession } from "@/lib/server/auth";
import { distanceFromOrigin, getClient } from "@/lib/server/clients";
import { getExpense, isOwnPath, removeReceipts } from "@/lib/server/expenses";
import type { Client, Expense } from "@/lib/supabase/types";

// ─────────────────────────── Fotos ───────────────────────────

/** Borra las fotos subidas de un ticket que no se llega a guardar. */
export async function discardUploadAction(paths: string[]): Promise<void> {
  await removeReceipts(paths);
}

// ─────────────────────────── Cliente nuevo desde el formulario ───────────────────────────

export async function createClientInlineAction(input: { name: string; address: string; town: string }): Promise<
  { ok: true; client: Client; notice?: string } | { ok: false; error: string }
> {
  const { supabase } = await requireSession();
  const name = input.name.trim();
  const address = input.address.trim();
  const town = input.town.trim();
  if (!name || !address || !town) return { ok: false, error: "Rellena nombre, dirección y población." };

  const distance = await distanceFromOrigin({ address, town });
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name, address, town,
      round_trip_km: distance.ok ? distance.roundTripKm : null,
      km_calculated_at: distance.ok ? new Date().toISOString() : null,
    })
    .select("*")
    .single();
  if (error) return { ok: false, error: error.code === "23505" ? "Ya tienes un cliente con ese nombre." : "No se ha podido crear el cliente." };
  revalidatePath("/clientes");
  return { ok: true, client: { ...data, round_trip_km: data.round_trip_km == null ? null : Number(data.round_trip_km) }, notice: distance.ok ? undefined : distance.error };
}

// ─────────────────────────── Guardar / borrar ───────────────────────────

type Kind = "ticket" | "km";

interface Parsed {
  row: Partial<Expense> & Pick<Expense, "date" | "category" | "amount_cents">;
  client: Client | null;
}

async function parseExpenseForm(fd: FormData, kind: Kind, existing: Expense | null): Promise<{ errors: Record<string, string> } | Parsed> {
  const { userId } = await requireSession();
  const errors: Record<string, string> = {};

  // Fecha: válida, no futura y dentro del mes en el que se está trabajando.
  const dateStr = str(fd, "date");
  const [year, month] = str(fd, "month").split("-").map(Number);
  if (!parseDateOnly(dateStr)) errors.date = "Fecha no válida";
  else if (dateStr > todayInSpain()) errors.date = "La fecha no puede ser futura";
  else if (!year || !month || !isInMonth(dateStr, year, month)) errors.date = `La fecha tiene que estar dentro de ${year && month ? monthLabel(year, month) : "el mes"}`;

  const clientId = str(fd, "client_id") || null;
  const client = clientId ? await getClient(clientId) : null;
  if (clientId && !client) errors.client_id = "Cliente no válido";

  const project = str(fd, "project").slice(0, 100);
  const place = (str(fd, "place") || client?.town || "").slice(0, 120);
  const notes = str(fd, "notes").slice(0, 500) || null;

  if (kind === "km") {
    if (!client) errors.client_id = "Elige el cliente del desplazamiento";
    const km = parseKm(str(fd, "km"));
    if (km == null || km <= 0) errors.km = "Km no válidos (p. ej. 57,8)";
    else if (km > 5000) errors.km = "Demasiados km";
    if (Object.keys(errors).length) return { errors };
    // La tarifa se fija al crear el gasto: cambiarla en Ajustes no altera lo ya registrado.
    const rate = existing?.km_rate ?? (await getProfile()).km_rate;
    return {
      client,
      row: { date: dateStr, category: "km", client_id: client!.id, project, place, km: km!, km_rate: rate, amount_cents: kmAmountCents(km!, rate), notes },
    };
  }

  const category = str(fd, "category");
  if (!isTicketCategory(category)) errors.category = "Elige el tipo de gasto";
  const amount = parseEuros(str(fd, "amount"));
  if (amount == null || amount <= 0) errors.amount = "El importe debe ser mayor que 0 (p. ej. 12,82)";
  const receiptPath = existing?.receipt_path ?? str(fd, "receipt_path");
  if (!isOwnPath(userId, receiptPath)) errors._ = "Falta la foto del ticket";
  if (Object.keys(errors).length) return { errors };

  const receiptImage = existing ? existing.receipt_image_path : str(fd, "receipt_image_path") || null;
  return {
    client,
    row: {
      date: dateStr,
      category: category as Expense["category"],
      client_id: client?.id ?? null,
      project,
      place,
      amount_cents: amount!,
      vendor_name: str(fd, "vendor_name").slice(0, 120) || null,
      vendor_tax_id: str(fd, "vendor_tax_id").replace(/[\s.-]/g, "").toUpperCase().slice(0, 20) || null,
      notes,
      receipt_path: receiptPath,
      receipt_image_path: isOwnPath(userId, receiptImage) ? receiptImage : null,
    },
  };
}

function backToMonth(date: string): never {
  redirect(`/?mes=${date.slice(0, 7)}#dia-${date}`);
}

export async function createExpenseAction(kind: Kind, _prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireSession();
  const parsed = await parseExpenseForm(fd, kind, null);
  if ("errors" in parsed) return { fieldErrors: parsed.errors, error: parsed.errors._, values: formValues(fd) };

  const { error } = await supabase.from("expenses").insert(parsed.row);
  if (error) {
    console.error("Error guardando gasto", error);
    return { error: "No se ha podido guardar el gasto.", values: formValues(fd) };
  }

  // Ticket con cliente: añade también el desplazamiento si se pidió y ese día aún no lo tiene.
  if (kind === "ticket" && fd.get("add_km") === "on" && parsed.client?.round_trip_km) {
    await addKmIfMissing(parsed.row.date, parsed.client, parsed.row.project ?? "", parsed.row.place ?? "");
  }

  revalidatePath("/");
  backToMonth(parsed.row.date);
}

async function addKmIfMissing(date: string, client: Client, project: string, place: string) {
  const { supabase } = await requireSession();
  const { count } = await supabase
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .eq("date", date)
    .eq("category", "km")
    .eq("client_id", client.id);
  if (count) return;
  const rate = (await getProfile()).km_rate;
  const km = client.round_trip_km!;
  await supabase.from("expenses").insert({
    date, category: "km", client_id: client.id, project, place, km, km_rate: rate, amount_cents: kmAmountCents(km, rate),
  });
}

export async function updateExpenseAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireSession();
  const existing = await getExpense(id);
  if (!existing) return { error: "Ese gasto ya no existe." };
  const parsed = await parseExpenseForm(fd, existing.category === "km" ? "km" : "ticket", existing);
  if ("errors" in parsed) return { fieldErrors: parsed.errors, error: parsed.errors._, values: formValues(fd) };

  const { error } = await supabase.from("expenses").update(parsed.row).eq("id", id);
  if (error) {
    console.error("Error actualizando gasto", error);
    return { error: "No se han podido guardar los cambios.", values: formValues(fd) };
  }
  revalidatePath("/");
  backToMonth(parsed.row.date);
}

export async function deleteExpenseAction(id: string): Promise<FormState> {
  const { supabase } = await requireSession();
  const existing = await getExpense(id);
  if (!existing) return { error: "Ese gasto ya no existe." };
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { error: "No se ha podido borrar el gasto." };
  await removeReceipts([existing.receipt_path, existing.receipt_image_path]);
  revalidatePath("/");
  backToMonth(existing.date);
}

/** Copia un desplazamiento (mismo cliente, proyecto, lloc, km y tarifa) a otro día. */
export async function repeatKmAction(id: string, date: string): Promise<FormState> {
  const { supabase } = await requireSession();
  const source = await getExpense(id);
  if (!source || source.category !== "km" || !source.client_id) return { error: "Solo se pueden repetir desplazamientos." };
  if (!parseDateOnly(date)) return { error: "Fecha no válida." };
  if (date > todayInSpain()) return { error: "La fecha no puede ser futura." };

  const { count } = await supabase
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .eq("date", date)
    .eq("category", "km")
    .eq("client_id", source.client_id);
  if (count) return { error: "Ese día ya tiene un desplazamiento a este cliente." };

  const { error } = await supabase.from("expenses").insert({
    date,
    category: "km",
    client_id: source.client_id,
    project: source.project,
    place: source.place,
    km: source.km,
    km_rate: source.km_rate,
    amount_cents: source.amount_cents,
    notes: source.notes,
  });
  if (error) return { error: "No se ha podido copiar el desplazamiento." };
  revalidatePath("/");
  const [y, m, d] = date.split("-");
  return { ok: `Copiado al ${Number(d)}/${Number(m)}/${y}` };
}
