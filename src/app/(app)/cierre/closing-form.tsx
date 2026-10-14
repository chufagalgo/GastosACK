"use client";

import { useActionState, useEffect } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { SwitchRow } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { centsToInput } from "@/lib/domain/money";
import type { Closing } from "@/lib/server/closing";
import type { ClosingState } from "./actions";

interface Props {
  closing: Closing;
  action: (prev: ClosingState, fd: FormData) => Promise<ClosingState>;
}

export function ClosingForm({ closing, action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  const v = state.values;

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.download) {
      // Enlace con "download": el navegador guarda el fichero con su nombre (Gastos_Març_2026.xlsx).
      const a = document.createElement("a");
      a.href = state.download.url;
      a.download = state.download.fileName;
      document.body.append(a);
      a.click();
      a.remove();
      toast.success("Cierre guardado. Descargando el Excel…");
    }
    else if (state.ok) toast.success(state.ok);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <section>
        <h2 className="mb-2 font-medium">Bestretes a compte (anticipos)</h2>
        <div className="grid gap-2">
          {[1, 2, 3, 4].map((i) => {
            const a = closing.advances.find((x) => x.position === i);
            return (
              <div key={i}>
                <div className="grid grid-cols-[1fr_7rem] gap-2">
                  <Input
                    type="date"
                    name={`advance_date_${i}`}
                    aria-label={`Fecha del anticipo ${i}`}
                    defaultValue={v?.[`advance_date_${i}`] ?? a?.date ?? ""}
                  />
                  <Input
                    name={`advance_amount_${i}`}
                    inputMode="decimal"
                    placeholder="0,00 €"
                    aria-label={`Importe del anticipo ${i}`}
                    defaultValue={v?.[`advance_amount_${i}`] ?? (a ? centsToInput(a.amount_cents) : "")}
                  />
                </div>
                {errors[`advance_${i}`] && <p className="mt-1 text-xs text-destructive">{errors[`advance_${i}`]}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="divide-y rounded-xl border bg-background px-3">
        <SwitchRow name="itm_hours" label="Hores imputades ITM" defaultChecked={v ? v.itm_hours === "on" : closing.itmHours} />
        <SwitchRow name="time_control" label="Control horari" defaultChecked={v ? v.time_control === "on" : closing.timeControl} />
      </section>

      <div className="grid gap-2">
        <Button type="submit" name="then" value="excel" size="lg" disabled={pending}>
          <FileSpreadsheet aria-hidden /> {pending ? "Preparando…" : "Guardar y descargar Excel"}
        </Button>
        <Button type="button" size="lg" variant="outline" disabled title="Llega en la fase 4">
          <FileText aria-hidden /> Word con los tickets (próximamente)
        </Button>
        <Button type="submit" variant="ghost" disabled={pending}>
          Solo guardar
        </Button>
      </div>
    </form>
  );
}
