import "server-only";
import type { ExpenseForExcel } from "@/lib/domain/excel-rows";
import { getProfile } from "./auth";
import { getClosing } from "./closing";
import { listMonthExpenses } from "./expenses";

/** Todo lo que necesitan el Excel y el Word de un mes. */
export async function loadMonthForExport(year: number, month: number) {
  const [profile, expenses, closing] = await Promise.all([getProfile(), listMonthExpenses(year, month), getClosing(year, month)]);
  const forExcel: ExpenseForExcel[] = expenses.map((e) => ({
    date: e.date,
    category: e.category,
    client_name: e.client?.name ?? null,
    project: e.project,
    place: e.place,
    km: e.km,
    km_rate: e.km_rate,
    amount_cents: e.amount_cents,
  }));
  return { profile, expenses, forExcel, closing };
}

/** Cabecera Content-Disposition con nombre en UTF-8 (Març) y alternativa ASCII. */
export function attachment(fileName: string): string {
  const ascii = fileName.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
