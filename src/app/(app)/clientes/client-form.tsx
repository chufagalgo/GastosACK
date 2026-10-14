"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatKm } from "@/lib/domain/km";
import type { FormState } from "@/lib/forms";
import type { Client } from "@/lib/supabase/types";
import { recalculateClientAction } from "./actions";

interface Props {
  client?: Client;
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
}

export function ClientForm({ client, action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [recalculating, startRecalc] = useTransition();
  const kmRef = useRef<HTMLInputElement>(null);
  const errors = state.fieldErrors ?? {};
  const v = state.values;

  useEffect(() => {
    if (state.ok) toast.success(state.ok);
    if (state.error) toast.error(state.error);
  }, [state]);

  function recalc() {
    if (!client) return;
    startRecalc(async () => {
      const res = await recalculateClientAction(client.id);
      if (res.error) return void toast.error(res.error);
      if (kmRef.current && res.km != null) kmRef.current.value = formatKm(res.km);
      toast.success(res.ok);
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Nombre" htmlFor="name" error={errors.name}>
        <Input id="name" name="name" defaultValue={v?.name ?? client?.name} placeholder="Reig Jofre" required />
      </Field>
      <Field label="Dirección completa" htmlFor="address" hint="Calle, número y código postal" error={errors.address}>
        <Input id="address" name="address" defaultValue={v?.address ?? client?.address} autoComplete="off" required />
      </Field>
      <Field label="Población (Lloc)" htmlFor="town" error={errors.town}>
        <Input id="town" name="town" defaultValue={v?.town ?? client?.town} placeholder="Sant Joan Despí" required />
      </Field>
      <Field
        label="Km ida y vuelta"
        htmlFor="round_trip_km"
        hint={client ? "Déjalo vacío para recalcularlo al guardar." : "Déjalo vacío y se calculará desde ACK Logic."}
        error={errors.round_trip_km}
      >
        <div className="flex gap-2">
          <Input
            ref={kmRef}
            id="round_trip_km"
            name="round_trip_km"
            inputMode="decimal"
            defaultValue={v?.round_trip_km ?? (client?.round_trip_km != null ? formatKm(client.round_trip_km) : "")}
            placeholder="57,8"
          />
          {client && (
            <Button type="button" variant="outline" onClick={recalc} disabled={recalculating}>
              <RefreshCw className={recalculating ? "animate-spin" : undefined} aria-hidden />
              Recalcular
            </Button>
          )}
        </div>
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Guardando…" : client ? "Guardar cambios" : "Crear cliente"}
      </Button>
    </form>
  );
}
