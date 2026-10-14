"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteExpense } from "./gastos/actions";

export function DeleteExpenseButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Borrar gasto"
      disabled={pending}
      onClick={() => {
        if (!confirm("¿Borrar este gasto?")) return;
        startTransition(async () => {
          const res = await deleteExpense(id);
          if (res.error) toast.error(res.error);
          else toast.success(res.ok);
        });
      }}
    >
      <Trash2 className="size-4" aria-hidden />
    </Button>
  );
}
