import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatKm } from "@/lib/domain/km";
import { listClients } from "@/lib/server/clients";
import type { Client } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientsPage({ searchParams }: PageProps<"/clientes">) {
  const { archivados } = await searchParams;
  const showArchived = archivados === "1";
  const clients = await listClients({ includeArchived: true });
  const active = clients.filter((c) => !c.archived);
  const archived = clients.filter((c) => c.archived);

  return (
    <>
      <PageHeader title="Clientes" subtitle="Km de ida y vuelta desde ACK Logic">
        <Button asChild size="sm">
          <Link href="/clientes/nuevo">
            <Plus aria-hidden /> Nuevo
          </Link>
        </Button>
      </PageHeader>

      {active.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Todavía no tienes clientes.</p>
      ) : (
        <ClientList clients={active} />
      )}

      {archived.length > 0 && (
        <div className="mt-6">
          <Link href={showArchived ? "/clientes" : "/clientes?archivados=1"} className="text-sm text-muted-foreground underline">
            {showArchived ? "Ocultar archivados" : `Ver archivados (${archived.length})`}
          </Link>
          {showArchived && (
            <div className="mt-2 opacity-70">
              <ClientList clients={archived} />
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ClientList({ clients }: { clients: Client[] }) {
  return (
    <ul className="divide-y rounded-xl border bg-background">
      {clients.map((c) => (
        <li key={c.id}>
          <Link href={`/clientes/${c.id}`} className="flex items-center gap-3 px-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{c.name}</p>
              <p className="truncate text-xs text-muted-foreground">{c.town}</p>
            </div>
            <span className="text-sm tabular-nums">
              {c.round_trip_km != null ? `${formatKm(c.round_trip_km)} km` : <span className="text-amber-600">sin km</span>}
            </span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
