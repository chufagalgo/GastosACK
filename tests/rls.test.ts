// Prueba de aislamiento entre usuarios contra un Supabase local (npx supabase start).
// Necesita los usuarios hector@test.local y otro@test.local (contraseña test12345).
// Se salta si no está definida SUPABASE_TEST_URL.
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/types";

const url = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY ?? "";

async function signIn(email: string) {
  const client = createClient<Database>(url!, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: "test12345" });
  if (error) throw error;
  return { client, userId: data.user.id };
}

describe.skipIf(!url)("RLS", () => {
  it("cada usuario solo ve y modifica sus datos", async () => {
    const a = await signIn("hector@test.local");
    const b = await signIn("otro@test.local");

    const name = `RLS ${Date.now()}`;
    const created = await a.client.from("clients").insert({ name, town: "Rubí" }).select().single();
    expect(created.error).toBeNull();
    expect(created.data!.user_id).toBe(a.userId);
    const clientId = created.data!.id;

    // B no lo ve, no lo puede modificar ni borrar.
    const seen = await b.client.from("clients").select().eq("id", clientId);
    expect(seen.data).toEqual([]);
    const upd = await b.client.from("clients").update({ name: "hack" }).eq("id", clientId).select();
    expect(upd.data).toEqual([]);
    await b.client.from("clients").delete().eq("id", clientId);

    // B no puede crear filas a nombre de A ni usar el cliente de A en sus gastos.
    const forged = await b.client.from("clients").insert({ name: "forged", user_id: a.userId });
    expect(forged.error).not.toBeNull();
    const foreignExpense = await b.client.from("expenses").insert({
      date: "2026-03-02", category: "km", client_id: clientId, km: 57.8, km_rate: 0.11, amount_cents: 636,
    });
    expect(foreignExpense.error).not.toBeNull();

    // Perfiles: cada uno ve solo el suyo.
    const profiles = await b.client.from("profiles").select("user_id");
    expect(profiles.data).toEqual([{ user_id: b.userId }]);

    // Un desplazamiento propio sí se puede guardar; uno sin cliente, no.
    const ok = await a.client.from("expenses").insert({
      date: "2026-03-02", category: "km", client_id: clientId, km: 57.8, km_rate: 0.11, amount_cents: 636,
    }).select().single();
    expect(ok.error).toBeNull();
    const noClient = await a.client.from("expenses").insert({ date: "2026-03-02", category: "km", km: 10, km_rate: 0.11, amount_cents: 110 });
    expect(noClient.error).not.toBeNull();
    const noReceipt = await a.client.from("expenses").insert({ date: "2026-03-02", category: "dietes", amount_cents: 1282 });
    expect(noReceipt.error).not.toBeNull();

    // Storage: A sube a su carpeta; B no la puede leer ni subir a ella.
    const path = `${a.userId}/2026/03/${crypto.randomUUID()}.jpg`;
    const up = await a.client.storage.from("receipts").upload(path, new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }));
    expect(up.error).toBeNull();
    const dl = await b.client.storage.from("receipts").download(path);
    expect(dl.error).not.toBeNull();
    const upB = await b.client.storage.from("receipts").upload(`${a.userId}/x.jpg`, new Blob([new Uint8Array([1])], { type: "image/jpeg" }));
    expect(upB.error).not.toBeNull();

    // Limpieza (el cliente está en uso: primero el gasto).
    await a.client.from("expenses").delete().eq("id", ok.data!.id);
    await a.client.storage.from("receipts").remove([path]);
    const del = await a.client.from("clients").delete().eq("id", clientId).select();
    expect(del.data).toHaveLength(1);
  });
});
