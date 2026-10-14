"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseDateOnly } from "@/lib/domain/dates";
import { parseEuros } from "@/lib/domain/money";
import { fieldErrors, str, type FormState } from "@/lib/forms";
import { requireMember } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

const expenseSchema = z.object({
  amountCents: z.number({ message: "Importe no válido" }).int().positive("El importe debe ser mayor que 0"),
  date: z.date({ message: "Fecha no válida" }),
  description: z.string().min(1, "Escribe una descripción").max(200),
  categoryId: z.uuid().nullable(),
});

export async function createExpense(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireMember();
  const parsed = expenseSchema.safeParse({
    amountCents: parseEuros(str(fd, "amount")) ?? undefined,
    date: parseDateOnly(str(fd, "date")) ?? undefined,
    description: str(fd, "description"),
    categoryId: str(fd, "categoryId") || null,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };

  await db.expense.create({ data: { ...parsed.data, memberId: me.id } });
  revalidatePath("/");
  redirect(`/?mes=${str(fd, "date").slice(0, 7)}`);
}

/** Cada uno borra sus gastos; un admin puede borrar cualquiera. */
export async function deleteExpense(id: string): Promise<FormState> {
  const me = await requireMember();
  const expense = await db.expense.findUnique({ where: { id } });
  if (!expense) return { error: "Ese gasto ya no existe." };
  if (expense.memberId !== me.id && !me.isAdmin) return { error: "No puedes borrar gastos de otra persona." };
  await db.expense.delete({ where: { id } });
  revalidatePath("/");
  return { ok: "Gasto borrado" };
}
