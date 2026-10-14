"use client";

import { useActionState } from "react";
import { Field } from "@/components/form/field";
import { NativeSelect } from "@/components/form/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";
import { createExpense } from "../actions";

interface Props {
  categories: { id: string; name: string; emoji: string }[];
  today: string;
}

export function ExpenseForm({ categories, today }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(createExpense, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Importe (€)" htmlFor="amount" error={errors.amountCents}>
        <Input id="amount" name="amount" inputMode="decimal" placeholder="12,50" autoFocus required />
      </Field>
      <Field label="Descripción" htmlFor="description" error={errors.description}>
        <Input id="description" name="description" maxLength={200} placeholder="Comida con clientes" required />
      </Field>
      <Field label="Categoría" htmlFor="categoryId" error={errors.categoryId}>
        <NativeSelect id="categoryId" name="categoryId" defaultValue="">
          <option value="">Sin categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Fecha" htmlFor="date" error={errors.date}>
        <Input id="date" name="date" type="date" defaultValue={today} required />
      </Field>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Guardando…" : "Guardar gasto"}
      </Button>
    </form>
  );
}
