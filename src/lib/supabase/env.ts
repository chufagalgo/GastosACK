export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Vale la clave "publishable" (sb_publishable_…) o la antigua "anon"; las dos son públicas.
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;
