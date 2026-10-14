import "server-only";
import type { Advance } from "@/lib/supabase/types";
import { requireSession } from "./auth";

export interface Closing {
  itmHours: boolean;
  timeControl: boolean;
  advances: Pick<Advance, "position" | "date" | "amount_cents">[];
}

export async function getClosing(year: number, month: number): Promise<Closing> {
  const { supabase } = await requireSession();
  const [closing, advances] = await Promise.all([
    supabase.from("month_closings").select("itm_hours, time_control").eq("year", year).eq("month", month).maybeSingle(),
    supabase.from("advances").select("position, date, amount_cents").eq("year", year).eq("month", month).order("position"),
  ]);
  if (closing.error) throw closing.error;
  if (advances.error) throw advances.error;
  return {
    itmHours: closing.data?.itm_hours ?? false,
    timeControl: closing.data?.time_control ?? false,
    advances: advances.data,
  };
}
