"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteExpenseAction } from "../actions";

export function DeleteExpense({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      className="w-full text-destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm("¿Borrar este gasto? También se borrará la foto del ticket.")) return;
        startTransition(async () => {
          const res = await deleteExpenseAction(id);
          if (res?.error) toast.error(res.error);
        });
      }}
    >
      <Trash2 aria-hidden /> Borrar gasto
    </Button>
  );
}
