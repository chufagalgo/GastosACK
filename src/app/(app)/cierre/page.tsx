import type { Metadata } from "next";
import { MonthPicker } from "@/components/month-picker";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { monthKey, parseMonth, todayInSpain } from "@/lib/domain/dates";
import { excelFileName } from "@/lib/domain/excel-rows";
import { wordFileName } from "@/lib/server/word";
import { formatEuros } from "@/lib/domain/money";
import { getClosing } from "@/lib/server/closing";
import { listMonthExpenses } from "@/lib/server/expenses";
import { saveClosingAction } from "./actions";
import { ClosingForm } from "./closing-form";

export const metadata: Metadata = { title: "Cierre de mes" };

export default async function ClosingPage({ searchParams }: PageProps<"/cierre">) {
  const { mes } = await searchParams;
  const { year, month } = parseMonth(typeof mes === "string" ? mes : undefined, new Date(`${todayInSpain()}T00:00:00Z`));
  const [expenses, closing] = await Promise.all([listMonthExpenses(year, month), getClosing(year, month)]);
  const total = expenses.reduce((s, e) => s + e.amount_cents, 0);
  const advances = closing.advances.reduce((s, a) => s + a.amount_cents, 0);

  return (
    <>
      <PageHeader title="Cierre de mes" subtitle={excelFileName(year, month)} />
      <MonthPicker year={year} month={month} basePath="/cierre" />
      <Card className="my-3">
        <CardContent className="grid gap-1 text-sm">
          <Row label="Total mensual" value={formatEuros(total)} />
          <Row label="Bestretes a compte" value={formatEuros(advances)} />
          <Row label="Total a pagar" value={formatEuros(total - advances)} strong />
        </CardContent>
      </Card>
      <ClosingForm
        key={`${year}-${month}`}
        closing={closing}
        word={{ url: `/api/export/word/${monthKey(year, month)}`, fileName: wordFileName(year, month) }}
        action={saveClosingAction.bind(null, year, month)}
      />
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <p className={`flex justify-between ${strong ? "border-t pt-1 text-base font-semibold" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </p>
  );
}
