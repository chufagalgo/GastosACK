import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_INFO } from "@/lib/domain/categories";
import { todayInSpain } from "@/lib/domain/dates";
import { formatKm } from "@/lib/domain/km";
import { formatEuros } from "@/lib/domain/money";
import { buildYearSummary, SUMMARY_CATEGORIES } from "@/lib/domain/summary";
import { listYearAdvances } from "@/lib/server/closing";
import { listYearExpenses } from "@/lib/server/expenses";
import { MonthChart } from "./month-chart";

export const metadata: Metadata = { title: "Resumen del año" };

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default async function SummaryPage({ searchParams }: PageProps<"/resumen">) {
  const { any } = await searchParams;
  const today = todayInSpain();
  const year = typeof any === "string" && /^\d{4}$/.test(any) ? Number(any) : Number(today.slice(0, 4));
  const [expenses, advances] = await Promise.all([listYearExpenses(year), listYearAdvances(year)]);
  const s = buildYearSummary(
    expenses.map((e) => ({ date: e.date, category: e.category, client_name: e.client?.name ?? null, km: e.km, amount_cents: e.amount_cents })),
    advances,
  );
  const currentMonth = today.startsWith(String(year)) ? Number(today.slice(5, 7)) : 12;
  const activeMonths = s.months.filter((m) => m.total > 0).length;

  return (
    <>
      <PageHeader title="Resumen del año" />
      <div className="mb-3 flex items-center justify-between">
        <Button asChild variant="ghost" size="icon" aria-label="Año anterior">
          <Link href={`/resumen?any=${year - 1}`}>
            <ChevronLeft aria-hidden />
          </Link>
        </Button>
        <span className="text-lg font-semibold">{year}</span>
        <Button asChild variant="ghost" size="icon" aria-label="Año siguiente">
          <Link href={`/resumen?any=${year + 1}`}>
            <ChevronRight aria-hidden />
          </Link>
        </Button>
      </div>

      {s.count === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No hay gastos en {year}.</p>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
          <Card>
            <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Stat label="Total del año" value={formatEuros(s.total)} big />
              <Stat label="Media por mes con gastos" value={formatEuros(activeMonths ? Math.round(s.total / activeMonths) : 0)} />
              <Stat label="Kilómetros" value={`${formatKm(s.km)} km`} />
              <Stat label="Gastos registrados" value={String(s.count)} />
              <Stat label="Anticipos" value={formatEuros(s.advances)} />
              <Stat label="Pendiente de cobro" value={formatEuros(s.total - s.advances)} />
            </CardContent>
          </Card>

          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Total por mes</h2>
            <MonthChart year={year} totals={s.months.map((m) => m.total)} initialMonth={currentMonth} />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Por tipo de gasto</h2>
            <ul className="grid gap-2 rounded-xl border bg-background p-3">
              {SUMMARY_CATEGORIES.filter((c) => s.byCategory[c] > 0).map((c) => {
                const pct = Math.round((s.byCategory[c] / s.total) * 100);
                return (
                  <li key={c} className="grid gap-1">
                    <div className="flex justify-between text-sm">
                      <span>
                        {CATEGORY_INFO[c].emoji} {CATEGORY_INFO[c].label}
                      </span>
                      <span className="tabular-nums">
                        {formatEuros(s.byCategory[c])} <span className="text-muted-foreground">· {pct}%</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(pct, 1)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {s.byClient.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">Por cliente</h2>
              <ul className="divide-y rounded-xl border bg-background">
                {s.byClient.map((c) => (
                  <li key={c.name} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.days} {c.days === 1 ? "día" : "días"}
                        {c.km > 0 && ` · ${formatKm(c.km)} km`}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums">{formatEuros(c.total)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Mes a mes</h2>
            <div className="overflow-x-auto rounded-xl border bg-background">
              <table className="w-full min-w-[640px] text-right text-xs tabular-nums">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium">Mes</th>
                    {SUMMARY_CATEGORIES.map((c) => (
                      <th key={c} className="px-2 py-2 font-medium">
                        {CATEGORY_INFO[c].label}
                      </th>
                    ))}
                    <th className="px-2 py-2 font-medium text-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {s.months.map((m) => (
                    <tr key={m.month} className={m.total ? "" : "text-muted-foreground"}>
                      <td className="px-2 py-1.5 text-left">
                        {m.total ? (
                          <Link className="underline" href={`/?mes=${year}-${String(m.month).padStart(2, "0")}`}>
                            {MONTHS[m.month - 1]}
                          </Link>
                        ) : (
                          MONTHS[m.month - 1]
                        )}
                      </td>
                      {SUMMARY_CATEGORIES.map((c) => (
                        <td key={c} className="px-2 py-1.5">
                          {m.byCategory[c] ? formatEuros(m.byCategory[c]) : "–"}
                        </td>
                      ))}
                      <td className="px-2 py-1.5 font-semibold">{m.total ? formatEuros(m.total) : "–"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/60 font-semibold">
                  <tr>
                    <td className="px-2 py-2 text-left">Total</td>
                    {SUMMARY_CATEGORIES.map((c) => (
                      <td key={c} className="px-2 py-2">
                        {s.byCategory[c] ? formatEuros(s.byCategory[c]) : "–"}
                      </td>
                    ))}
                    <td className="px-2 py-2">{formatEuros(s.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className={big ? "col-span-2" : undefined}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`tabular-nums ${big ? "text-3xl font-bold" : "font-semibold"}`}>{value}</p>
    </div>
  );
}
