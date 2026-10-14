import { excelFileName } from "@/lib/domain/excel-rows";
import { buildExcel } from "@/lib/server/excel";
import { attachment, loadMonthForExport } from "@/lib/server/export-data";
import { getSession } from "@/lib/server/auth";

export async function GET(_req: Request, ctx: RouteContext<"/api/export/excel/[mes]">) {
  if (!(await getSession())) return new Response("No autorizado", { status: 401 });
  const { mes } = await ctx.params;
  const m = mes.match(/^(\d{4})-(\d{2})$/);
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return new Response("Mes no válido", { status: 400 });
  const year = Number(m[1]);
  const month = Number(m[2]);

  const { profile, forExcel, closing } = await loadMonthForExport(year, month);
  const file = await buildExcel({
    company: profile.company,
    fullName: profile.full_name,
    year,
    month,
    defaultRate: profile.km_rate,
    expenses: forExcel,
    advances: closing.advances,
    itmHours: closing.itmHours,
    timeControl: closing.timeControl,
  });

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": attachment(excelFileName(year, month)),
      "Cache-Control": "no-store",
    },
  });
}
