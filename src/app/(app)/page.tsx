import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { MonthPicker } from "@/components/month-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_INFO } from "@/lib/domain/categories";
import { monthKey, parseMonth, todayInSpain, weekdayDay } from "@/lib/domain/dates";
import { formatKm } from "@/lib/domain/km";
import { formatEuros } from "@/lib/domain/money";
import { getProfile } from "@/lib/server/auth";
import { listMonthExpenses, type ExpenseWithClient } from "@/lib/server/expenses";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { mes } = await searchParams;
  const { year, month } = parseMonth(typeof mes === "string" ? mes : undefined, new Date(`${todayInSpain()}T00:00:00Z`));
  const key = monthKey(year, month);
  const [profile, expenses] = await Promise.all([getProfile(), listMonthExpenses(year, month)]);

  const byDay = new Map<string, ExpenseWithClient[]>();
  for (const e of expenses) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  const total = expenses.reduce((s, e) => s + e.amount_cents, 0);
  const missing = [!profile.full_name && "tu nombre", !profile.origin_address && "la dirección de ACK Logic"].filter(Boolean);

  return (
    <>
      {missing.length > 0 && (
        <Card className="mb-3 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="text-sm">
            Completa {missing.join(" y ")} en{" "}
            <Link href="/ajustes" className="font-medium underline">
              Ajustes
            </Link>
            .
          </CardContent>
        </Card>
      )}

      <MonthPicker year={year} month={month} />

      <Card className="my-3">
        <CardContent className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Total del mes</p>
            <p className="text-3xl font-bold tabular-nums">{formatEuros(total)}</p>
          </div>
          <p className="text-right text-xs text-muted-foreground">
            {byDay.size} {byDay.size === 1 ? "día" : "días"}
            <br />
            {expenses.length} {expenses.length === 1 ? "gasto" : "gastos"}
          </p>
        </CardContent>
      </Card>

      <Button asChild size="lg" className="mb-5 h-14 w-full text-base">
        <Link href={`/gastos/nuevo?mes=${key}`}>
          <Plus className="size-5" aria-hidden /> Nuevo gasto
        </Link>
      </Button>

      {byDay.size === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No hay gastos este mes.</p>
      ) : (
        <div className="grid gap-4">
          {[...byDay].map(([date, items]) => (
            <section key={date} id={`dia-${date}`} className="scroll-mt-4">
              <h2 className="mb-1.5 flex items-baseline justify-between px-1 text-sm font-medium capitalize text-muted-foreground">
                <span>{weekdayDay(date)}</span>
                <span className="tabular-nums">{formatEuros(items.reduce((s, e) => s + e.amount_cents, 0))}</span>
              </h2>
              <ul className="divide-y rounded-xl border bg-background">
                {items.map((e) => (
                  <li key={e.id}>
                    <Link href={`/gastos/${e.id}`} className="flex items-center gap-3 px-3 py-2.5">
                      <span className="text-xl" aria-hidden>
                        {CATEGORY_INFO[e.category].emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {e.category === "km" ? `${formatKm(e.km ?? 0)} km` : (e.vendor_name ?? CATEGORY_INFO[e.category].label)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[CATEGORY_INFO[e.category].label, e.client?.name, e.project].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums">{formatEuros(e.amount_cents)}</span>
                      <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
