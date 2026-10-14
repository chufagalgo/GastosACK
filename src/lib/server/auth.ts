import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { db } from "./db";

export interface CurrentMember {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

/** Usuario de Supabase (verificado) → miembro. null si no hay sesión o no está vinculado. */
export const getCurrentMember = cache(async (): Promise<CurrentMember | null> => {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const member = await db.member.findUnique({ where: { userId } });
  if (member) return member.active ? member : null;

  // Cuenta creada fuera de la app (p. ej. desde Supabase): vincular por email.
  const email = (data.claims.email as string | undefined)?.toLowerCase();
  if (!email) return null;
  const byEmail = await db.member.findFirst({ where: { email, userId: null, active: true } });
  if (!byEmail) return null;
  return db.member.update({ where: { id: byEmail.id }, data: { userId } });
});

/** Para páginas y acciones: exige sesión con miembro vinculado (y opcionalmente admin). */
export async function requireMember(opts?: { admin?: boolean }): Promise<CurrentMember> {
  const member = await getCurrentMember();
  if (!member) redirect("/login?error=sin-acceso");
  if (opts?.admin && !member.isAdmin) redirect("/?error=sin-permiso");
  return member;
}
