import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getProfile } from "@/lib/server/auth";

// Fase 1: solo accesos a Ajustes y Clientes. La lista de gastos del mes llega en la fase 2.
export default async function HomePage() {
  const profile = await getProfile();
  const missing = [!profile.full_name && "tu nombre", !profile.origin_address && "la dirección de ACK Logic"].filter(Boolean);

  return (
    <>
      <PageHeader title="GASTOSACK" subtitle={profile.full_name ? `Hola, ${profile.full_name}` : undefined} />
      {missing.length > 0 && (
        <Card className="mb-3 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="text-sm">
            Completa {missing.join(" y ")} en{" "}
            <Link href="/ajustes" className="font-medium underline">
              Ajustes
            </Link>{" "}
            para poder calcular los km.
          </CardContent>
        </Card>
      )}
      <div className="grid gap-2">
        <HomeLink href="/clientes" title="Clientes" text="Direcciones y km de ida y vuelta desde ACK Logic" />
        <HomeLink href="/ajustes" title="Ajustes" text="Nombre, empresa, dirección de origen y tarifa €/km" />
      </div>
    </>
  );
}

function HomeLink({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-accent">
        <CardContent className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{text}</p>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
        </CardContent>
      </Card>
    </Link>
  );
}
