import { afterEach, expect, test, vi } from "vitest";
import { fetchWeather } from "./weather";

afterEach(() => vi.unstubAllGlobals());
const answer = (body: unknown, ok = true) => vi.stubGlobal("fetch", vi.fn(async () => ({ ok, json: async () => body })));

test("today's wind comes back as km/h and a bearing", async () => {
  answer({ current: { temperature_2m: 9, wind_speed_10m: 18.4, wind_direction_10m: 241 } });
  expect(await fetchWeather()).toEqual({ wind: 18.4, from: 241 });
});
test("a bad answer, a failed request or no network is null, never a rejection", async () => {
  answer({ current: { wind_speed_10m: "x", wind_direction_10m: 241 } });
  expect(await fetchWeather()).toBeNull();
  answer({}, false);
  expect(await fetchWeather()).toBeNull();
  vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
  expect(await fetchWeather()).toBeNull();
});
test("a request that hangs is given up after the timeout", async () => {
  vi.stubGlobal("fetch", vi.fn((_u: string, o?: { signal?: AbortSignal }) => new Promise((_, no) => o?.signal?.addEventListener("abort", () => no(new Error("aborted"))))));
  expect(await fetchWeather(20)).toBeNull();
});
