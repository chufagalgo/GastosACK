import { CATEGORY_INFO } from "@/lib/domain/categories";
import { toCsv } from "@/lib/domain/csv";
import { getSession } from "@/lib/server/auth";
import { attachment } from "@/lib/server/export-data";
import { todayInSpain } from "@/lib/domain/dates";

// Copia de seguridad de todos los gastos en CSV (se abre directamente con Excel).
export async function GET() {
  const session = await getSession();
  if (!session) return new Response("No autorizado", { status: 401 });

  const rows: (string | number | null)[][] = [
    ["Fecha", "Tipo", "Cliente", "N.º proyecto", "Lloc", "Km", "€/km", "Importe (€)", "Comercio", "CIF/NIF", "Notas", "Foto del ticket"],
  ];
  // PostgREST devuelve como mucho 1000 filas por petición: se pide por páginas.
  for (let from = 0; ; from += 1000) {
    const { data, error } = await session.supabase
      .from("expenses")
      .select("*, client:clients(name)")
      .order("date")
      .order("created_at")
      .range(from, from + 999);
    if (error) return new Response("No se han podido leer los gastos", { status: 500 });
    for (const e of data) {
      rows.push([
        e.date,
        CATEGORY_INFO[e.category].label,
        e.client?.name ?? "",
        e.project,
        e.place,
        e.km == null ? null : Number(e.km),
        e.km_rate == null ? null : Number(e.km_rate),
        e.amount_cents / 100,
        e.vendor_name,
        e.vendor_tax_id,
        e.notes,
        e.receipt_path ? "sí" : "no",
      ]);
    }
    if (data.length < 1000) break;
  }

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": attachment(`GASTOSACK_copia_${todayInSpain()}.csv`),
      "Cache-Control": "no-store",
    },
  });
}
