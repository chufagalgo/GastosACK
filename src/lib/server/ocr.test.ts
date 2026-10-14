import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { readReceipt } from "./ocr";

function fakeClient(body: object, status = 200) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
  );
  return { client: new Anthropic({ apiKey: "test", fetch, maxRetries: 0 }), fetch };
}

function message(output: object, stop_reason = "end_turn") {
  return {
    id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5",
    content: [{ type: "text", text: JSON.stringify(output) }],
    stop_reason, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 },
  };
}

const jpeg = { data: Buffer.from([0xff, 0xd8, 0xff]), mediaType: "image/jpeg" as const };

describe("readReceipt", () => {
  it("envía la imagen a Claude y devuelve los datos normalizados", async () => {
    const { client, fetch } = fakeClient(
      message({ date: "2026-03-02", vendor_name: " Bar Pepe ", total_amount: 12.824, tax_id: "b-12.345.678", category: "dietes" }),
    );
    const r = await readReceipt(jpeg, client);
    expect(r).toMatchObject({ ok: true, data: { date: "2026-03-02", vendor_name: "Bar Pepe", total_amount: 12.82, tax_id: "B12345678", category: "dietes" } });

    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toContain("/v1/messages");
    const body = JSON.parse(String(init!.body));
    expect(body.model).toBe("claude-opus-5-5");
    expect(body.fallbacks).toBe("default");
    expect(body.output_config.format.type).toBe("json_schema");
    expect(body.messages[0].content[0]).toMatchObject({ type: "image", source: { type: "base64", media_type: "image/jpeg" } });
    expect(new Headers(init!.headers).get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
  });

  it("manda los PDF como documento", async () => {
    const { client, fetch } = fakeClient(message({ date: null, vendor_name: null, total_amount: null, tax_id: null, category: "altres" }));
    const r = await readReceipt({ data: Buffer.from("%PDF"), mediaType: "application/pdf" }, client);
    expect(r).toMatchObject({ ok: true, data: { date: null, total_amount: null } });
    expect(JSON.parse(String(fetch.mock.calls[0][1]!.body)).messages[0].content[0].type).toBe("document");
  });

  it("descarta fechas e importes imposibles", async () => {
    const { client } = fakeClient(message({ date: "02/03/2026", vendor_name: "", total_amount: -5, tax_id: "", category: "altres" }));
    const r = await readReceipt(jpeg, client);
    expect(r).toMatchObject({ ok: true, data: { date: null, vendor_name: null, total_amount: null, tax_id: null } });
  });

  it("un rechazo o un error de la API no rompe el alta", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const refused = await readReceipt(jpeg, fakeClient({ ...message({}), content: [], stop_reason: "refusal" }).client);
    expect(refused.ok).toBe(false);
    const unauthorized = await readReceipt(jpeg, fakeClient({ type: "error", error: { type: "authentication_error", message: "x" } }, 401).client);
    expect(unauthorized).toMatchObject({ ok: false, error: expect.stringContaining("clave") });
  });

  it("sin clave configurada no llama a la API", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect((await readReceipt(jpeg)).ok).toBe(false);
    vi.unstubAllEnvs();
  });
});
