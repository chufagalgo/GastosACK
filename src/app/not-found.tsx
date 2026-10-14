import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="font-heading text-xl font-bold">No existe esta página</h1>
      <p className="text-sm text-muted-foreground">Puede que el gasto o el cliente se haya borrado.</p>
      <Button asChild>
        <Link href="/">Ir a Inicio</Link>
      </Button>
    </main>
  );
}
