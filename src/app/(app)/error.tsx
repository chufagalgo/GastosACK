"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

// Error inesperado dentro de la app: mensaje en castellano y opción de reintentar.
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-4xl" aria-hidden>
        😕
      </p>
      <h1 className="font-heading text-xl font-bold">Algo ha fallado</h1>
      <p className="text-sm text-muted-foreground">
        No se ha podido cargar esta pantalla. Comprueba la conexión y vuelve a intentarlo.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Reintentar</Button>
        <Button asChild variant="outline">
          <Link href="/">Ir a Inicio</Link>
        </Button>
      </div>
    </div>
  );
}
