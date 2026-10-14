import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getClient } from "@/lib/server/clients";
import { updateClientAction } from "../actions";
import { ClientForm } from "../client-form";
import { ClientAdmin } from "./client-admin";

export const metadata: Metadata = { title: "Cliente" };

export default async function ClientPage({ params, searchParams }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const { aviso } = await searchParams;
  const client = /^[0-9a-f-]{36}$/i.test(id) ? await getClient(id) : null;
  if (!client) notFound();

  return (
    <>
      <BackLink href="/clientes" label="Clientes" />
      <PageHeader title={client.name} subtitle={client.town}>
        {client.archived && <Badge variant="secondary">Archivado</Badge>}
      </PageHeader>
      {typeof aviso === "string" && (
        <p role="status" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
          Cliente guardado sin km: {aviso}
        </p>
      )}
      <ClientForm key={client.id} client={client} action={updateClientAction.bind(null, client.id)} />
      {client.km_calculated_at && (
        <p className="mt-2 text-xs text-muted-foreground">
          Km calculados el {new Date(client.km_calculated_at).toLocaleDateString("es-ES")}
        </p>
      )}
      <Separator className="my-6" />
      <ClientAdmin id={client.id} archived={client.archived} />
    </>
  );
}
