"use client";

import { useActionState, useEffect, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";
import type { Profile } from "@/lib/supabase/types";
import { recalculateAll, saveSettings } from "./actions";

export function SettingsForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettings, {});
  const errors = state.fieldErrors ?? {};
  const v = state.values;

  useEffect(() => {
    if (state.ok) toast.success(state.ok);
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Nombre" htmlFor="full_name" error={errors.full_name}>
        <Input id="full_name" name="full_name" defaultValue={v?.full_name ?? profile.full_name} placeholder="Héctor Alcañiz" required />
      </Field>
      <Field label="Empresa" htmlFor="company" error={errors.company}>
        <Input id="company" name="company" defaultValue={v?.company ?? profile.company} required />
      </Field>
      <Field
        label="Dirección de origen (oficina de ACK Logic)"
        htmlFor="origin_address"
        hint="Calle, número, código postal y población. Desde aquí se calculan los km a cada cliente."
        error={errors.origin_address}
      >
        <Input id="origin_address" name="origin_address" defaultValue={v?.origin_address ?? profile.origin_address} autoComplete="street-address" />
      </Field>
      <Field label="Tarifa (€/km)" htmlFor="km_rate" error={errors.km_rate}>
        <Input
          id="km_rate"
          name="km_rate"
          inputMode="decimal"
          defaultValue={v?.km_rate ?? String(profile.km_rate).replace(".", ",")}
          required
        />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}

export function RecalculateAllButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await recalculateAll();
          if (res.error) toast.error(res.error);
          else toast.success(res.ok);
        })
      }
    >
      <RefreshCw className={pending ? "animate-spin" : undefined} aria-hidden />
      {pending ? "Recalculando…" : "Recalcular km de todos los clientes"}
    </Button>
  );
}
