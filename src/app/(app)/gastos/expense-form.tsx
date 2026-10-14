"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Field, SwitchRow } from "@/components/form/field";
import { NativeSelect } from "@/components/form/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_INFO, TICKET_CATEGORIES } from "@/lib/domain/categories";
import { monthLabel } from "@/lib/domain/dates";
import { formatKm, kmAmountCents, parseKm } from "@/lib/domain/km";
import { formatEuros } from "@/lib/domain/money";
import type { FormState } from "@/lib/forms";
import type { Client } from "@/lib/supabase/types";
import { createClientInlineAction } from "./actions";

export interface ExpenseFormValues {
  date: string;
  category: string;
  client_id: string;
  project: string;
  place: string;
  km: string;
  amount: string;
  vendor_name: string;
  vendor_tax_id: string;
  notes: string;
}

export const EMPTY_VALUES: ExpenseFormValues = {
  date: "", category: "", client_id: "", project: "", place: "", km: "", amount: "", vendor_name: "", vendor_tax_id: "", notes: "",
};

interface Props {
  kind: "ticket" | "km";
  month: string; // "YYYY-MM"
  initial: ExpenseFormValues;
  clients: Client[];
  projects: { project: string; client_id: string | null }[];
  rate: number;
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  isNew: boolean;
  receipt?: { path: string; imagePath: string | null };
  submitLabel?: string;
}

const NEW_CLIENT = "__nuevo__";

export function ExpenseForm({ kind, month: initialMonth, initial, clients: initialClients, projects, rate, action, isNew, receipt, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [v, setV] = useState(initial);
  const [month, setMonth] = useState(initialMonth);
  const [clients, setClients] = useState(initialClients);
  const [addKm, setAddKm] = useState(true);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  const set = (patch: Partial<ExpenseFormValues>) => setV((cur) => ({ ...cur, ...patch }));
  const client = clients.find((c) => c.id === v.client_id) ?? null;

  function chooseClient(id: string) {
    if (id === NEW_CLIENT) return set({ client_id: NEW_CLIENT });
    const c = clients.find((x) => x.id === id) ?? null;
    // Al cambiar de cliente: Lloc = su población, km = su ida y vuelta, proyecto = el último usado con él.
    const lastProject = projects.find((p) => p.client_id === id)?.project;
    set({
      client_id: id,
      place: c?.town ?? "",
      ...(kind === "km" && { km: c?.round_trip_km != null ? formatKm(c.round_trip_km) : "" }),
      ...(lastProject && !v.project && { project: lastProject }),
    });
  }

  const [y, m] = month.split("-").map(Number);
  const dateMonth = v.date.slice(0, 7);
  const dateOutsideMonth = /^\d{4}-\d{2}$/.test(dateMonth) && dateMonth !== month;
  const kmNumber = parseKm(v.km);
  const projectOptions = useMemo(() => [...new Set(projects.map((p) => p.project))], [projects]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="month" value={month} />
      {receipt && (
        <>
          <input type="hidden" name="receipt_path" value={receipt.path} />
          <input type="hidden" name="receipt_image_path" value={receipt.imagePath ?? ""} />
        </>
      )}

      <Field label="Día" htmlFor="date" error={errors.date}>
        <Input id="date" name="date" type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} required />
      </Field>
      {dateOutsideMonth && (
        <div className="-mt-2 flex flex-wrap items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
          Esta fecha no es de {monthLabel(y, m)}.
          <Button type="button" variant="outline" size="sm" onClick={() => setMonth(dateMonth)}>
            Guardarlo en {monthLabel(Number(dateMonth.slice(0, 4)), Number(dateMonth.slice(5)))}
          </Button>
        </div>
      )}

      {kind === "ticket" && (
        <Field label="Tipo de gasto" htmlFor="category" error={errors.category}>
          <NativeSelect id="category" name="category" value={v.category} onChange={(e) => set({ category: e.target.value })} required>
            <option value="" disabled>
              Elige…
            </option>
            {TICKET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_INFO[c].emoji} {CATEGORY_INFO[c].label} · {CATEGORY_INFO[c].hint}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}

      <Field label={kind === "km" ? "Cliente" : "Cliente (opcional)"} htmlFor="client_id" error={errors.client_id}>
        <NativeSelect
          id="client_id"
          name="client_id"
          value={v.client_id}
          onChange={(e) => chooseClient(e.target.value)}
          required={kind === "km"}
        >
          <option value="">{kind === "km" ? "Elige…" : "Sin cliente"}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.town}
            </option>
          ))}
          <option value={NEW_CLIENT}>➕ Nuevo cliente…</option>
        </NativeSelect>
      </Field>
      {v.client_id === NEW_CLIENT && (
        <NewClientInline
          onCreated={(c) => {
            setClients((cur) => [...cur, c].sort((a, b) => a.name.localeCompare(b.name)));
            set({ client_id: c.id, place: c.town, ...(kind === "km" && { km: c.round_trip_km != null ? formatKm(c.round_trip_km) : "" }) });
          }}
          onCancel={() => set({ client_id: "" })}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="N.º de proyecto" htmlFor="project" error={errors.project}>
          <Input id="project" name="project" list="projects" value={v.project} onChange={(e) => set({ project: e.target.value })} placeholder="125.9.720" />
          <datalist id="projects">
            {projectOptions.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>
        <Field label="Lloc" htmlFor="place" error={errors.place}>
          <Input id="place" name="place" value={v.place} onChange={(e) => set({ place: e.target.value })} />
        </Field>
      </div>

      {kind === "km" ? (
        <Field
          label="Km (ida y vuelta)"
          htmlFor="km"
          hint={kmNumber != null ? `${formatKm(kmNumber)} km × ${String(rate).replace(".", ",")} €/km = ${formatEuros(kmAmountCents(kmNumber, rate))}` : "Se rellena con los km del cliente; puedes cambiarlos."}
          error={errors.km}
        >
          <Input id="km" name="km" inputMode="decimal" value={v.km} onChange={(e) => set({ km: e.target.value })} required />
        </Field>
      ) : (
        <>
          <Field label="Importe (€, IVA incluido)" htmlFor="amount" error={errors.amount}>
            <Input id="amount" name="amount" inputMode="decimal" value={v.amount} onChange={(e) => set({ amount: e.target.value })} placeholder="12,82" required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Comercio" htmlFor="vendor_name">
              <Input id="vendor_name" name="vendor_name" value={v.vendor_name} onChange={(e) => set({ vendor_name: e.target.value })} />
            </Field>
            <Field label="CIF/NIF" htmlFor="vendor_tax_id">
              <Input id="vendor_tax_id" name="vendor_tax_id" value={v.vendor_tax_id} onChange={(e) => set({ vendor_tax_id: e.target.value })} />
            </Field>
          </div>
          {isNew && client?.round_trip_km != null && (
            <SwitchRow
              name="add_km"
              label={`Añadir también el desplazamiento (${formatKm(client.round_trip_km)} km)`}
              hint="Solo si ese día aún no tiene km a este cliente"
              checked={addKm}
              onCheckedChange={setAddKm}
            />
          )}
        </>
      )}

      <Field label="Notas (opcional)" htmlFor="notes">
        <Textarea id="notes" name="notes" rows={2} value={v.notes} onChange={(e) => set({ notes: e.target.value })} />
      </Field>

      <Button type="submit" size="lg" disabled={pending || v.client_id === NEW_CLIENT}>
        {pending ? "Guardando…" : (submitLabel ?? "Guardar gasto")}
      </Button>
      {month !== initialMonth && <p className="-mt-2 text-center text-xs text-muted-foreground">Se guardará en {monthLabel(y, m)}</p>}
    </form>
  );
}

function NewClientInline({ onCreated, onCancel }: { onCreated: (c: Client) => void; onCancel: () => void }) {
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState({ name: "", address: "", town: "" });

  function create() {
    startTransition(async () => {
      const res = await createClientInlineAction(f);
      if (!res.ok) return void toast.error(res.error);
      if (res.notice) toast.warning(`Cliente creado sin km: ${res.notice}`);
      else toast.success(`Cliente creado (${formatKm(res.client.round_trip_km ?? 0)} km ida y vuelta)`);
      onCreated(res.client);
    });
  }

  return (
    <div className="grid gap-3 rounded-xl border bg-background p-3">
      <p className="text-sm font-medium">Nuevo cliente</p>
      <Input aria-label="Nombre del cliente" placeholder="Nombre" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <Input aria-label="Dirección del cliente" placeholder="Dirección completa" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
      <Input aria-label="Población del cliente" placeholder="Población" value={f.town} onChange={(e) => setF({ ...f, town: e.target.value })} />
      <div className="flex gap-2">
        <Button type="button" onClick={create} disabled={pending}>
          {pending ? "Creando…" : "Crear cliente"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
