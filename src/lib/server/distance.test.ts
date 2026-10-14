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
  it("usa Google Routes y multiplica por 2", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "g-key");
    const fetch = mockFetch({ routes: [{ distanceMeters: 28_900 }] });
    expect(await roundTripDistance(ORIGIN, DEST)).toEqual({ ok: true, roundTripKm: 57.8 });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://routes.googleapis.com/directions/v2:computeRoutes");
    expect(init.headers["X-Goog-Api-Key"]).toBe("g-key");
    expect(JSON.parse(init.body)).toMatchObject({ origin: { address: ORIGIN }, destination: { address: DEST }, travelMode: "DRIVE" });
  });

  it("sin ruta devuelve un error legible", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "g-key");
    mockFetch({});
    const r = await roundTripDistance(ORIGIN, DEST);
    expect(r.ok).toBe(false);
  });

  it("usa OpenRouteService si no hay clave de Google", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    vi.stubEnv("OPENROUTESERVICE_API_KEY", "ors-key");
    const point = (lon: number, lat: number) => ({ features: [{ geometry: { coordinates: [lon, lat] } }] });
    const fetch = mockFetch(point(2.03, 41.49), point(2.07, 41.36), { routes: [{ summary: { distance: 10_600 } }] });
    expect(await roundTripDistance(ORIGIN, DEST)).toEqual({ ok: true, roundTripKm: 21.2 });
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ coordinates: [[2.03, 41.49], [2.07, 41.36]] });
  });

  it("sin claves o sin origen no llama a nadie", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    vi.stubEnv("OPENROUTESERVICE_API_KEY", "");
    const fetch = mockFetch();
    expect((await roundTripDistance(ORIGIN, DEST)).ok).toBe(false);
    expect((await roundTripDistance("", DEST)).ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("un error HTTP no rompe la app", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "g-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("denied", { status: 403 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await roundTripDistance(ORIGIN, DEST)).ok).toBe(false);
  });
});
