import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { PageHeader } from "@/components/page-header";
import { monthKey, monthLabel, parseMonth, todayInSpain } from "@/lib/domain/dates";
import { getProfile, requireSession } from "@/lib/server/auth";
import { listClients } from "@/lib/server/clients";
import { recentProjects } from "@/lib/server/expenses";
import { NewExpense } from "./new-expense";

export const metadata: Metadata = { title: "Nuevo gasto" };

export default async function NewExpensePage({ searchParams }: PageProps<"/gastos/nuevo">) {
  const { mes } = await searchParams;
  const today = todayInSpain();
  const { year, month } = parseMonth(typeof mes === "string" ? mes : undefined, new Date(`${today}T00:00:00Z`));
  const key = monthKey(year, month);
  // Mes actual → hoy; otro mes → día 1 de ese mes.
  const defaultDate = today.startsWith(key) ? today : `${key}-01`;

  const [{ userId }, profile, clients, projects] = await Promise.all([requireSession(), getProfile(), listClients(), recentProjects()]);

  return (
    <>
      <BackLink href={`/?mes=${key}`} label={monthLabel(year, month)} />
      <PageHeader title="Nuevo gasto" subtitle={monthLabel(year, month)} />
      <NewExpense
        userId={userId}
        month={key}
        defaultDate={defaultDate}
        clients={clients}
        projects={projects}
        rate={profile.km_rate}
      />
    </>
  );
}
