"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteClientAction, setArchivedAction } from "../actions";

export function ClientAdmin({ id, archived }: { id: string; archived: boolean }) {
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok?: string; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (res?.error) toast.error(res.error);
      else if (res?.ok) toast.success(res.ok);
    });

  return (
    <div className="grid gap-2">
      <Button variant="outline" disabled={pending} onClick={() => run(() => setArchivedAction(id, !archived))}>
        {archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
        {archived ? "Recuperar cliente" : "Archivar cliente"}
      </Button>
      <Button
        variant="ghost"
        className="text-destructive"
        disabled={pending}
        onClick={() => confirm("¿Borrar este cliente?") && run(() => deleteClientAction(id))}
      >
        <Trash2 aria-hidden /> Borrar cliente
      </Button>
    </div>
  );
}
