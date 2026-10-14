import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { PageHeader } from "@/components/page-header";
import { createClientAction } from "../actions";
import { ClientForm } from "../client-form";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default function NewClientPage() {
  return (
    <>
      <BackLink href="/clientes" label="Clientes" />
      <PageHeader title="Nuevo cliente" />
      <ClientForm action={createClientAction} />
    </>
  );
}
