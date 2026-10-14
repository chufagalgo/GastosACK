import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

// Vercel lo llama una vez al día (vercel.json → crons). El plan gratuito de Supabase
// pausa el proyecto tras 7 días sin peticiones; con esta consulta diaria no llega a pausarse.
// Sin sesión, RLS devuelve una lista vacía: no expone ningún dato.
export async function GET() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=user_id&limit=1`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    cache: "no-store",
  });
  return Response.json({ ok: res.ok, status: res.status, at: new Date().toISOString() }, { status: res.ok ? 200 : 502 });
}
