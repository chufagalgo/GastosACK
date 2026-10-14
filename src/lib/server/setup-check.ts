import "server-only";
import { requireSession } from "./auth";

/**
 * ¿Están creadas las tablas en Supabase? Si no (proyecto recién creado sin pegar
 * supabase/setup.sql), la app muestra instrucciones en vez de un error genérico.
 */
export async function isDatabaseReady(): Promise<boolean> {
  const { supabase } = await requireSession();
  const { error } = await supabase.from("profiles").select("user_id").limit(1);
  // PGRST205: la tabla no existe en el esquema; 42P01: relación inexistente.
  return !(error && (error.code === "PGRST205" || error.code === "42P01"));
}
