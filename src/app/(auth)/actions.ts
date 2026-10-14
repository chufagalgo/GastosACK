"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { createSupabaseAdmin, createSupabaseServer } from "@/lib/supabase/server";

export interface AuthState {
  error?: string;
}

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Email no válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Email o contraseña incorrectos" };
  redirect("/");
}

/**
 * Alta de cuenta: solo para emails que el admin haya dado de alta en un miembro.
 * Se crea con la clave secreta y ya confirmada, así no depende del envío de emails.
 */
export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password } = parsed.data;

  const member = await db.member.findFirst({ where: { email, active: true } });
  if (!member) return { error: "Ese email no está dado de alta. Pídeselo a un administrador." };
  if (member.userId) return { error: "Ya existe una cuenta con ese email. Inicia sesión." };

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) {
    return { error: error?.code === "email_exists" ? "Ya existe una cuenta con ese email. Inicia sesión." : "No se ha podido crear la cuenta." };
  }
  await db.member.update({ where: { id: member.id }, data: { userId: data.user.id } });

  const supabase = await createSupabaseServer();
  await supabase.auth.signInWithPassword({ email, password });
  redirect("/");
}

export async function logout() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
