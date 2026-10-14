import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/server/auth";
import { isDatabaseReady } from "@/lib/server/setup-check";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireSession();
  if (!(await isDatabaseReady())) return <SetupNeeded />;
  return (
    <>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-28">{children}</main>
      <BottomNav />
    </>
  );
}

function SetupNeeded() {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
      <Card>
        <CardContent className="grid gap-3 text-sm">
          <h1 className="font-heading text-xl font-bold">Falta crear la base de datos</h1>
          <p>Has entrado bien, pero tu proyecto de Supabase todavía no tiene las tablas de la app.</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Copia el contenido de{" "}
              <a className="underline" href="https://github.com/chufagalgo/gastosack/blob/main/supabase/setup.sql" target="_blank" rel="noreferrer">
                supabase/setup.sql
              </a>
              .
            </li>
            <li>En Supabase: SQL Editor → New query → pégalo → Run.</li>
            <li>Vuelve aquí y recarga la página.</li>
          </ol>
        </CardContent>
      </Card>
    </main>
  );
}
