import { getSession } from "@/lib/server/auth";
import { downloadReceipt } from "@/lib/server/expenses";
import { attachment, loadMonthForExport } from "@/lib/server/export-data";
import { buildWord, wordFileName } from "@/lib/server/word";

// Las fotos se descargan de Storage en tandas para no saturar la conexión.
const PARALLEL = 6;

export async function GET(_req: Request, ctx: RouteContext<"/api/export/word/[mes]">) {
  if (!(await getSession())) return new Response("No autorizado", { status: 401 });
  const { mes } = await ctx.params;
  const m = mes.match(/^(\d{4})-(\d{2})$/);
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return new Response("Mes no válido", { status: 400 });
  const year = Number(m[1]);
  const month = Number(m[2]);

  const { profile, expenses } = await loadMonthForExport(year, month);
  const images: (Uint8Array | null)[] = [];
  for (let i = 0; i < expenses.length; i += PARALLEL) {
    const batch = expenses.slice(i, i + PARALLEL).map((e) => {
      // De los PDF se usa la imagen de la 1.ª página; de las fotos, la foto.
      const path = e.receipt_image_path ?? (e.receipt_path && /\.(jpe?g|png)$/i.test(e.receipt_path) ? e.receipt_path : null);
      return path ? downloadReceipt(path) : Promise.resolve(null);
    });
    images.push(...(await Promise.all(batch)));
  }

  const file = await buildWord({
    company: profile.company,
    fullName: profile.full_name,
    year,
    month,
    expenses: expenses.map((e, i) => ({
      date: e.date,
      category: e.category,
      client_name: e.client?.name ?? null,
      project: e.project,
      km: e.km,
      amount_cents: e.amount_cents,
      image: images[i] ? new Uint8Array(images[i]!) : null,
    })),
  });

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": attachment(wordFileName(year, month)),
      "Cache-Control": "no-store",
    },
  });
}
