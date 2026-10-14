"use client";

import { useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { repeatKmAction } from "../actions";

export function RepeatKm({ id, defaultDate }: { id: string; defaultDate: string }) {
  const [date, setDate] = useState(defaultDate);
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">Repetir este desplazamiento</p>
      <p className="text-xs text-muted-foreground">Mismo cliente, proyecto y km en otro día.</p>
      <div className="flex gap-2">
        <Input type="date" aria-label="Día al que copiar" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button
          type="button"
          variant="outline"
          disabled={pending || !date}
          onClick={() =>
            startTransition(async () => {
              const res = await repeatKmAction(id, date);
              if (res.error) toast.error(res.error);
              else toast.success(res.ok);
            })
          }
        >
          <Copy aria-hidden /> Copiar
        </Button>
      </div>
    </div>
  );
}
