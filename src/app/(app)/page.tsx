import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDay, monthKey, monthLabel, monthRange, parseMonth, shiftMonth } from "@/lib/domain/dates";
import { formatEuros } from "@/lib/domain/money";
import { requireMember } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { DeleteExpenseButton } from "./delete-expense-button";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const me = await requireMember();
  const { mes } = await searchParams;
  const { year, month } = parseMonth(typeof mes === "string" ? mes : undefined, new Date());
  const { start, end } = monthRange(year, month);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  const expenses = await db.expense.findMany({
    where: { date: { gte: start, lt: end } },
    include: { category: true, member: { select: { name: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  const total = expenses.reduce((sum, e) => sum + e.amountCents, 0);

  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    const key = e.category ? `${e.category.emoji} ${e.category.name}` : "Sin categoría";
    byCategory.set(key, (byCategory.get(key) ?? 0) + e.amountCents);
  }
  const categoryTotals = [...byCategory].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PageHeader title="Gastos" subtitle={`Hola, ${me.name}`}>
        <Button asChild size="sm">
          <Link href="/gastos/nuevo">
            <Plus aria-hidden /> Añadir
          </Link>
        </Button>
      </PageHeader>

      <div className="mb-3 flex items-center justify-between">
        <Button asChild variant="ghost" size="icon" aria-label="Mes anterior">
          <Link href={`/?mes=${monthKey(prev.year, prev.month)}`}>
            <ChevronLeft aria-hidden />
          </Link>
        </Button>
        <span className="font-medium">{monthLabel(year, month)}</span>
        <Button asChild variant="ghost" size="icon" aria-label="Mes siguiente">
          <Link href={`/?mes=${monthKey(next.year, next.month)}`}>
            <ChevronRight aria-hidden />
          </Link>
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent>
          <p className="text-sm text-muted-foreground">Total del mes</p>
          <p className="text-3xl font-bold tabular-nums">{formatEuros(total)}</p>
          {categoryTotals.length > 0 && (
            <ul className="mt-3 grid gap-1 text-sm">
              {categoryTotals.map(([name, cents]) => (
                <li key={name} className="flex justify-between">
                  <span>{name}</span>
                  <span className="tabular-nums">{formatEuros(cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {expenses.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No hay gastos este mes.</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-background">
          {expenses.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="text-xl" aria-hidden>
                {e.category?.emoji ?? "💸"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDay(e.date)} · {e.member.name}
                </p>
              </div>
              <span className="font-semibold tabular-nums">{formatEuros(e.amountCents)}</span>
              {(e.memberId === me.id || me.isAdmin) && <DeleteExpenseButton id={e.id} />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
