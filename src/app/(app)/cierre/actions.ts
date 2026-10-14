"use server";

import { revalidatePath } from "next/cache";
import { parseDateOnly } from "@/lib/domain/dates";
import { excelFileName } from "@/lib/domain/excel-rows";
import { parseEuros } from "@/lib/domain/money";
import { formValues, str, type FormState } from "@/lib/forms";
import { requireSession } from "@/lib/server/auth";

export type ClosingState = FormState & { download?: { url: string; fileName: string } };

export async function saveClosingAction(year: number, month: number, _prev: ClosingState, fd: FormData): Promise<ClosingState> {
  const { supabase, userId } = await requireSession();
  const errors: Record<string, string> = {};
  const advances: { position: number; date: string; amount_cents: number }[] = [];

  for (let i = 1; i <= 4; i++) {
    const date = str(fd, `advance_date_${i}`);
    const amount = str(fd, `advance_amount_${i}`);
    if (!date && !amount) continue;
    const cents = parseEuros(amount);
    if (!parseDateOnly(date)) errors[`advance_${i}`] = "Fecha no válida";
    else if (cents == null || cents <= 0) errors[`advance_${i}`] = "Importe no válido (mayor que 0)";
    else advances.push({ position: i, date, amount_cents: cents });
  }
  if (Object.keys(errors).length) return { fieldErrors: errors, values: formValues(fd) };

  const closing = await supabase.from("month_closings").upsert({
    user_id: userId,
    year,
    month,
    itm_hours: fd.get("itm_hours") === "on",
    time_control: fd.get("time_control") === "on",
  });
  // Los anticipos del mes se reemplazan por los del formulario.
  const del = await supabase.from("advances").delete().eq("year", year).eq("month", month);
  const ins = advances.length ? await supabase.from("advances").insert(advances.map((a) => ({ ...a, year, month }))) : { error: null };
  if (closing.error || del.error || ins.error) {
    console.error("Error guardando cierre", closing.error ?? del.error ?? ins.error);
    return { error: "No se ha podido guardar el cierre.", values: formValues(fd) };
  }

  revalidatePath("/cierre");
  const key = `${year}-${String(month).padStart(2, "0")}`;
  const then = str(fd, "then");
  return { ok: "Cierre guardado", ...(then === "excel" && { download: { url: `/api/export/excel/${key}`, fileName: excelFileName(year, month) } }) };
}
