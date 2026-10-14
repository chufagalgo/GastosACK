// Resumen anual: totales por mes, por tipo de gasto y por cliente. Lógica pura.

import type { ExpenseCategory } from "@/lib/supabase/types";

export const SUMMARY_CATEGORIES: ExpenseCategory[] = ["km", "autopistes", "dietes", "allotjaments", "bitllets", "altres"];

export interface SummaryExpense {
  date: string;
  category: ExpenseCategory;
  client_name: string | null;
  km: number | null;
  amount_cents: number;
}

export interface MonthSummary {
  month: number; // 1–12
  total: number; // céntimos
  advances: number; // céntimos
  byCategory: Record<ExpenseCategory, number>;
  km: number;
  count: number;
}

export interface YearSummary {
  months: MonthSummary[]; // siempre 12
  total: number;
  advances: number;
  km: number;
  count: number;
  byCategory: Record<ExpenseCategory, number>;
  byClient: { name: string; total: number; km: number; days: number }[]; // de mayor a menor
}

const zero = () => Object.fromEntries(SUMMARY_CATEGORIES.map((c) => [c, 0])) as Record<ExpenseCategory, number>;

export function buildYearSummary(expenses: SummaryExpense[], advances: { month: number; amount_cents: number }[]): YearSummary {
  const months: MonthSummary[] = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: 0, advances: 0, byCategory: zero(), km: 0, count: 0 }));
  const clients = new Map<string, { total: number; km: number; days: Set<string> }>();

  for (const e of expenses) {
    const m = months[Number(e.date.slice(5, 7)) - 1];
    m.total += e.amount_cents;
    m.byCategory[e.category] += e.amount_cents;
    m.km += e.km ?? 0;
    m.count++;
    if (e.client_name) {
      const c = clients.get(e.client_name) ?? { total: 0, km: 0, days: new Set<string>() };
      c.total += e.amount_cents;
      c.km += e.km ?? 0;
      c.days.add(e.date);
      clients.set(e.client_name, c);
    }
  }
  for (const a of advances) months[a.month - 1].advances += a.amount_cents;

  const byCategory = zero();
  for (const m of months) for (const c of SUMMARY_CATEGORIES) byCategory[c] += m.byCategory[c];

  return {
    months,
    total: months.reduce((s, m) => s + m.total, 0),
    advances: months.reduce((s, m) => s + m.advances, 0),
    km: Math.round(months.reduce((s, m) => s + m.km, 0) * 10) / 10,
    count: expenses.length,
    byCategory,
    byClient: [...clients]
      .map(([name, c]) => ({ name, total: c.total, km: Math.round(c.km * 10) / 10, days: c.days.size }))
      .sort((a, b) => b.total - a.total),
  };
}
