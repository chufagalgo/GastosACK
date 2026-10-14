import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServer, type SupabaseServer } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

export interface Session {
  userId: string;
  email: string;
  supabase: SupabaseServer;
}

/** Sesión verificada (o null). Se cachea por petición. */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  return { userId, email: (data.claims.email as string | undefined) ?? "", supabase };
});

/** Para páginas y acciones: exige sesión. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Perfil del usuario (ajustes). Si no existe todavía, se crea con los valores por defecto. */
export const getProfile = cache(async (): Promise<Profile> => {
  const { supabase, userId } = await requireSession();
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (data) return normalizeProfile(data);
  const inserted = await supabase.from("profiles").insert({ user_id: userId }).select("*").single();
  if (inserted.error) throw inserted.error;
  return normalizeProfile(inserted.data);
});

// PostgREST devuelve los numeric como número; nos aseguramos por si llegan como texto.
function normalizeProfile(p: Profile): Profile {
  return { ...p, km_rate: Number(p.km_rate) };
}
