import "server-only";
import { monthRange } from "@/lib/domain/dates";
import type { Expense } from "@/lib/supabase/types";
import { requireSession } from "./auth";

export type ExpenseWithClient = Expense & { client: { name: string; town: string } | null };

const BUCKET = "receipts";

// PostgREST devuelve numeric como número, pero lo forzamos por si llega como texto.
function normalize<T extends Expense>(e: T): T {
  return { ...e, km: e.km == null ? null : Number(e.km), km_rate: e.km_rate == null ? null : Number(e.km_rate) };
}

function dateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function listMonthExpenses(year: number, month: number): Promise<ExpenseWithClient[]> {
  const { supabase } = await requireSession();
  const { start, end } = monthRange(year, month);
  const { data, error } = await supabase
    .from("expenses")
    .select("*, client:clients(name, town)")
    .gte("date", dateOnly(start))
    .lt("date", dateOnly(end))
    .order("date")
    .order("created_at");
  if (error) throw error;
  return data.map(normalize);
}

export async function getExpense(id: string): Promise<Expense | null> {
  const { supabase } = await requireSession();
  const { data, error } = await supabase.from("expenses").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data && normalize(data);
}

/** Proyectos usados antes, el más reciente primero, con el cliente al que se asociaron. */
export async function recentProjects(): Promise<{ project: string; client_id: string | null }[]> {
  const { supabase } = await requireSession();
  const { data, error } = await supabase
    .from("expenses")
    .select("project, client_id")
    .neq("project", "")
    .order("date", { ascending: false })
    .limit(300);
  if (error) throw error;
  const seen = new Set<string>();
  return data.filter((r) => {
    const key = `${r.client_id}|${r.project}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** El usuario solo puede referirse a ficheros de su propia carpeta. */
export function isOwnPath(userId: string, path: string | null | undefined): path is string {
  return !!path && path.startsWith(`${userId}/`) && !path.includes("..");
}

export async function signedReceiptUrl(path: string): Promise<string | null> {
  const { supabase } = await requireSession();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function downloadReceipt(path: string): Promise<Buffer | null> {
  const { supabase } = await requireSession();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function removeReceipts(paths: (string | null | undefined)[]): Promise<void> {
  const { supabase, userId } = await requireSession();
  const own = paths.filter((p): p is string => isOwnPath(userId, p));
  if (own.length) await supabase.storage.from(BUCKET).remove(own);
}
