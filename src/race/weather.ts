// The one network call the game makes: Brighton's wind now, from the same open-meteo request the home page's lighthouse
// makes. It never rejects and never holds up a race: it gives up after timeoutMs, and anything odd comes back as null.
const URL = "https://api.open-meteo.com/v1/forecast?latitude=50.82&longitude=-0.14&current=temperature_2m,wind_speed_10m,wind_direction_10m";

export type Weather = { wind: number; from: number };

/** wind in km/h, from as a compass bearing in degrees; null if it could not be had in time */
export async function fetchWeather(timeoutMs = 4000): Promise<Weather | null> {
  const ctl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = setTimeout(() => ctl?.abort(), timeoutMs);
  try {
    const r = await fetch(URL, ctl ? { signal: ctl.signal } : undefined);
    if (!r.ok) return null;
    const c = ((await r.json()) as { current?: { wind_speed_10m?: unknown; wind_direction_10m?: unknown } } | null)?.current;
    const wind = c?.wind_speed_10m, from = c?.wind_direction_10m;
    if (typeof wind !== "number" || typeof from !== "number" || !Number.isFinite(wind) || !Number.isFinite(from) || wind < 0) return null;
    return { wind, from: ((from % 360) + 360) % 360 };
  } catch {
    return null; // offline, blocked, slow or garbled: the course's own wind is used instead
  } finally {
    clearTimeout(timer);
  }
}
