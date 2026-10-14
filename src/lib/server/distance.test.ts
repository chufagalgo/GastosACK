import { afterEach, describe, expect, it, vi } from "vitest";
import { roundTripDistance } from "./distance";

const ORIGIN = "Carrer de Prova 1, 08191 Rubí";
const DEST = "Carrer de la Riera 2, 08970 Sant Joan Despí";

function mockFetch(...responses: unknown[]) {
  const fn = vi.fn();
  for (const r of responses) fn.mockResolvedValueOnce(new Response(JSON.stringify(r), { status: 200 }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("roundTripDistance", () => {
  it("geocodifica con OpenRouteService y multiplica por 2", async () => {
    vi.stubEnv("OPENROUTESERVICE_API_KEY", "ors-key");
    const point = (lon: number, lat: number) => ({ features: [{ geometry: { coordinates: [lon, lat] } }] });
    const fetch = mockFetch(point(2.03, 41.49), point(2.07, 41.36), { routes: [{ summary: { distance: 10_600 } }] });
    expect(await roundTripDistance(ORIGIN, DEST)).toEqual({ ok: true, roundTripKm: 21.2 });
    expect(String(fetch.mock.calls[0][0])).toMatch(/^https:\/\/api\.heigit\.org\/pelias\/v1\/search\?/);
    expect(fetch.mock.calls[2][0]).toBe("https://api.heigit.org/openrouteservice/v2/directions/driving-car");
    expect(fetch.mock.calls[2][1].headers.Authorization).toBe("ors-key");
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ coordinates: [[2.03, 41.49], [2.07, 41.36]] });
  });

  it("sin clave o sin origen no llama a nadie", async () => {
    vi.stubEnv("OPENROUTESERVICE_API_KEY", "");
    const fetch = mockFetch();
    expect((await roundTripDistance(ORIGIN, DEST)).ok).toBe(false);
    expect((await roundTripDistance("", DEST)).ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sin ruta devuelve un error legible", async () => {
    vi.stubEnv("OPENROUTESERVICE_API_KEY", "ors-key");
    const point = { features: [{ geometry: { coordinates: [2, 41] } }] };
    mockFetch(point, point, { routes: [] });
    expect((await roundTripDistance(ORIGIN, DEST)).ok).toBe(false);
  });

  it("un error HTTP no rompe la app", async () => {
    vi.stubEnv("OPENROUTESERVICE_API_KEY", "ors-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("denied", { status: 403 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await roundTripDistance(ORIGIN, DEST)).toMatchObject({ ok: false, error: expect.stringContaining("rechaza la clave") });
  });
});
