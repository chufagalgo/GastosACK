"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseRate } from "@/lib/domain/km";
import { fieldErrors, formValues, str, type FormState } from "@/lib/forms";
import { requireSession } from "@/lib/server/auth";
import { recalculateAllClients } from "@/lib/server/clients";
import { removeOrphanReceipts } from "@/lib/server/expenses";

const settingsSchema = z.object({
  full_name: z.string().min(1, "Escribe tu nombre").max(100),
  company: z.string().min(1, "Escribe la empresa").max(100),
  origin_address: z.string().max(300),
  km_rate: z.number({ message: "Tarifa no válida (p. ej. 0,11)" }).min(0).max(10, "Tarifa demasiado alta"),
});

export async function saveSettings(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, userId } = await requireSession();
  const parsed = settingsSchema.safeParse({
    full_name: str(fd, "full_name"),
    company: str(fd, "company"),
    origin_address: str(fd, "origin_address"),
    km_rate: parseRate(str(fd, "km_rate")) ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), values: formValues(fd) };

  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: userId, ...parsed.data, updated_at: new Date().toISOString() });
  if (error) return { error: "No se han podido guardar los ajustes.", values: formValues(fd) };
  revalidatePath("/", "layout");
  return { ok: "Ajustes guardados" };
}

export async function recalculateAll(): Promise<FormState> {
  const result = await recalculateAllClients();
  revalidatePath("/clientes");
  if (result.error) return { error: result.error };
  const msg = `${result.updated} cliente(s) actualizados`;
  return result.failed.length ? { error: `${msg}. Sin calcular: ${result.failed.join(", ")}` } : { ok: msg };
}

export async function cleanOrphansAction(): Promise<FormState> {
  const removed = await removeOrphanReceipts();
  return { ok: removed ? `${removed} foto(s) sin usar borradas` : "No había fotos sin usar" };
}
