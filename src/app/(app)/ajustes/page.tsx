import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getProfile, requireSession } from "@/lib/server/auth";
import { RecalculateAllButton, SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const [{ email }, profile] = await Promise.all([requireSession(), getProfile()]);
  return (
    <>
      <PageHeader title="Ajustes" subtitle={email} />
      <SettingsForm profile={profile} />
      <Separator className="my-6" />
      <div className="grid gap-2">
        <p className="text-sm text-muted-foreground">
          Si cambias la dirección de origen, recalcula los km de los clientes (no afecta a los gastos ya guardados).
        </p>
        <RecalculateAllButton />
        <form action={logout}>
          <Button type="submit" variant="ghost" className="w-full text-destructive">
            <LogOut aria-hidden /> Cerrar sesión
          </Button>
        </form>
      </div>
    </>
  );
}
