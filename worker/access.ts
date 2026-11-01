import { createRemoteJWKSet, jwtVerify } from "jose";

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

const deny = (error = "Not authorised") => Response.json({ error }, { status: 401 });

/*
 * Cloudflare Access sits in front of /admin and /api/admin and signs every
 * request it lets through. Checking that signature here means the API stays
 * locked even if the Access application is ever misconfigured or removed.
 * Returns a 401 response to send back, or null when the request may continue.
 */
// a token in the Authorization header opens the inbox too: set ADMIN_TOKEN as a secret and enter it once on /admin
async function tokenMatches(given: string, expected: string) {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(given)), crypto.subtle.digest("SHA-256", enc.encode(expected))]);
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0; // compared in constant time
}

export async function requireAdmin(request: Request, env: Env): Promise<Response | null> {
  const host = new URL(request.url).hostname;
  const bearer = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (env.ADMIN_TOKEN && bearer) return (await tokenMatches(bearer, env.ADMIN_TOKEN)) ? null : deny();
  // `npm run dev` has no Access in front of it; .dev.vars turns this on locally only
  if (env.ADMIN_DEV_BYPASS === "true" && (host === "localhost" || host === "127.0.0.1")) {
    return null;
  }

  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    return deny(env.ADMIN_TOKEN ? "Enter the admin token" : "The inbox is not set up: set ADMIN_TOKEN, or configure Cloudflare Access");
  }

  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return deny();

  jwks ??= createRemoteJWKSet(new URL(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`));
  try {
    await jwtVerify(token, jwks, {
      issuer: `https://${env.ACCESS_TEAM_DOMAIN}`,
      audience: env.ACCESS_AUD,
    });
    return null;
  } catch {
    return deny();
  }
}
