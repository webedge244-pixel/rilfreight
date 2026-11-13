/**
 * Admin session cookie signing and verification.
 *
 * ⚠️ SERVER ONLY — this module reads `process.env.SESSION_SECRET` and uses
 * `node:crypto`. Never import it from a Client Component. The browser reaches
 * the server session exclusively through `/api/admin/session`.
 *
 * The cookie payload is a base64url JSON object signed with HMAC-SHA256:
 *
 *   <base64url(payload)>.<base64url(hmac)>
 *
 * Signing is constant-time (timingSafeEqual) so the cookie cannot be probed
 * byte by byte.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { isPermittedEmail } from "@/shared/lib/permissions";

/** Name of the HttpOnly cookie carrying the admin session. */
export const ADMIN_SESSION_COOKIE = "ril_admin_session";

/** Standard session lifetime — a single operating shift. */
const STANDARD_SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours

/** "Remember this terminal" lifetime. */
const REMEMBERED_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface AdminSessionPayload {
  /** Authenticated operator e-mail (normalised to lower case). */
  email: string;
  /** Firebase user id. */
  uid: string;
  /** Issued-at, seconds since epoch. */
  iat: number;
  /** Expiry, seconds since epoch. */
  exp: number;
  /** Whether the operator asked for this terminal to be remembered. */
  remembered: boolean;
}

/**
 * Returns the configured session secret, or null when it is missing.
 */
export function getSessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
}

/**
 * Returns the session lifetime in seconds for the given "remember me" choice.
 */
export function getSessionTtlSeconds(remember: boolean): number {
  return remember ? REMEMBERED_SESSION_TTL_SECONDS : STANDARD_SESSION_TTL_SECONDS;
}

/**
 * Issues a signed session token for an authenticated operator.
 *
 * Throws when SESSION_SECRET is not configured — that is a deployment error,
 * not a user error, and must not be swallowed.
 */
export function createSessionToken(
  identity: { email: string; uid: string },
  options: { remembered?: boolean } = {}
): string {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not configured. Add it to .env.local before issuing admin sessions."
    );
  }

  const remembered = options.remembered === true;
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    email: identity.email.trim().toLowerCase(),
    uid: identity.uid,
    iat: now,
    exp: now + getSessionTtlSeconds(remembered),
    remembered,
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");

  return `${encoded}.${signature}`;
}

/**
 * Verifies a session token and returns its payload.
 *
 * Returns null for any failure: malformed token, bad signature, expired
 * payload, or an e-mail that is no longer on the allowlist. Fails closed.
 */
export function verifySessionToken(
  token: string | null | undefined
): AdminSessionPayload | null {
  const secret = getSessionSecret();
  if (!secret || !token) return null;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const encoded = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expected = createHmac("sha256", secret).update(encoded).digest("base64url");

  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as AdminSessionPayload;

    if (typeof payload.email !== "string" || typeof payload.exp !== "number") {
      return null;
    }
    if (payload.exp * 1000 <= Date.now()) return null;
    if (!isPermittedEmail(payload.email)) return null;

    return payload;
  } catch {
    return null;
  }
}
