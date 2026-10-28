import { createRemoteJWKSet, jwtVerify } from "jose";

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

const deny = (error = "Not authorised") => Response.json({ error }, { status: 401 });

/*
 * Cloudflare Access sits in front of /admin and /api/admin and signs every
 * request it lets through. Checking that signature here means the API stays
 * locked even if the Access application is ever misconfigured or removed.
 * Returns a 401 response to send back, or null when the request may continue.
 */
export async function requireAdmin(request: Request, env: Env): Promise<Response | null> {
  const host = new URL(request.url).hostname;
  // `npm run dev` has no Access in front of it; .dev.vars turns this on locally only
  if (env.ADMIN_DEV_BYPASS === "true" && (host === "localhost" || host === "127.0.0.1")) {
    return null;
  }

  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    return deny("Cloudflare Access is not configured");
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
