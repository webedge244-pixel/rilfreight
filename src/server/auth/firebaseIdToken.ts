/**
 * Firebase ID token verification.
 *
 * ⚠️ SERVER ONLY — uses `node:crypto` and performs a network fetch of Google's
 * public signing certificates.
 *
 * The browser hands us a Firebase ID token after a successful
 * `signInWithEmailAndPassword`. Before trusting it we check:
 *
 *   1. the RS256 signature against Google's published certificates,
 *   2. the `aud` claim (must be this project),
 *   3. the `iss` claim (must be this project's securetoken issuer),
 *   4. the `exp` claim.
 *
 * This is the standard verification the Firebase Admin SDK performs, done with
 * Node's built-in crypto so the project needs no service account and no extra
 * dependency.
 */

import { X509Certificate, createPublicKey, createVerify, type KeyObject } from "node:crypto";

/** Google's published certificates for Firebase ID tokens. */
const GOOGLE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

/** How long the certificate map is cached before being refetched. */
const CERTS_TTL_MS = 60 * 60 * 1000;

export interface VerifiedIdentity {
  /** Firebase user id (`sub` claim). */
  uid: string;
  /** Authenticated e-mail (`email` claim). */
  email: string;
  /** Whether the provider has verified the e-mail address. */
  emailVerified: boolean;
}

let cachedCerts: Record<string, string> = {};
let cachedAt = 0;

/**
 * Fetches (and caches) Google's public signing certificates.
 * Pass `force` to refetch when a key id is not found in the cache.
 */
async function getGoogleCerts(force = false): Promise<Record<string, string>> {
  const isFresh = Date.now() - cachedAt < CERTS_TTL_MS;
  if (!force && isFresh && Object.keys(cachedCerts).length > 0) {
    return cachedCerts;
  }

  const response = await fetch(GOOGLE_CERTS_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `Unable to retrieve Google signing certificates (HTTP ${response.status}).`
    );
  }

  const certs = (await response.json()) as Record<string, string>;
  cachedCerts = certs;
  cachedAt = Date.now();
  return certs;
}

/**
 * Extracts a public key from a PEM payload.
 *
 * Google publishes X.509 certificates, so that is tried first. A bare public
 * key PEM is accepted as a fallback.
 */
function publicKeyFromPem(pem: string): KeyObject {
  try {
    return new X509Certificate(pem).publicKey;
  } catch {
    return createPublicKey(pem);
  }
}

/**
 * Verifies a Firebase ID token against a supplied certificate map.
 *
 * Split out from {@link verifyFirebaseIdToken} so the signature and claim
 * checks can be exercised without reaching the network.
 */
export function verifyIdTokenWithCerts(
  idToken: string,
  projectId: string,
  certs: Record<string, string>
): VerifiedIdentity {
  if (!idToken) {
    throw new Error("No ID token supplied.");
  }

  const segments = idToken.split(".");
  if (segments.length !== 3) {
    throw new Error("Malformed ID token.");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = segments;

  let header: { alg?: string; kid?: string };
  try {
    header = JSON.parse(
      Buffer.from(encodedHeader, "base64url").toString("utf8")
    ) as { alg?: string; kid?: string };
  } catch {
    throw new Error("Malformed ID token header.");
  }

  if (header.alg !== "RS256") {
    throw new Error(`Unsupported ID token algorithm: ${header.alg ?? "unknown"}.`);
  }
  if (!header.kid) {
    throw new Error("ID token header is missing a key id.");
  }

  const pem = certs[header.kid];
  if (!pem) {
    throw new Error("No Google signing certificate matches this token.");
  }

  const signatureValid = createVerify("RSA-SHA256")
    .update(`${encodedHeader}.${encodedPayload}`)
    .verify(publicKeyFromPem(pem), Buffer.from(encodedSignature, "base64url"));

  if (!signatureValid) {
    throw new Error("ID token signature verification failed.");
  }

  let claims: {
    aud?: string;
    iss?: string;
    exp?: number;
    sub?: string;
    email?: string;
    email_verified?: boolean;
  };
  try {
    claims = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as typeof claims;
  } catch {
    throw new Error("Malformed ID token payload.");
  }

  const now = Math.floor(Date.now() / 1000);

  if (claims.aud !== projectId) {
    throw new Error("ID token was issued for a different project.");
  }
  if (claims.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("ID token issuer is not valid for this project.");
  }
  if (typeof claims.exp !== "number" || claims.exp <= now) {
    throw new Error("ID token has expired.");
  }
  if (typeof claims.sub !== "string" || claims.sub.length === 0) {
    throw new Error("ID token is missing a subject.");
  }
  if (typeof claims.email !== "string" || claims.email.length === 0) {
    throw new Error("ID token is missing an e-mail claim.");
  }

  return {
    uid: claims.sub,
    email: claims.email,
    emailVerified: claims.email_verified === true,
  };
}

/**
 * Verifies a Firebase ID token and returns the identity it carries.
 *
 * Throws with a descriptive message when the token is malformed, unsigned by
 * an unknown key, expired, or issued for a different project.
 */
export async function verifyFirebaseIdToken(
  idToken: string,
  projectId: string
): Promise<VerifiedIdentity> {
  if (!idToken) {
    throw new Error("No ID token supplied.");
  }

  const segments = idToken.split(".");
  if (segments.length !== 3) {
    throw new Error("Malformed ID token.");
  }

  let header: { kid?: string };
  try {
    header = JSON.parse(
      Buffer.from(segments[0], "base64url").toString("utf8")
    ) as { kid?: string };
  } catch {
    throw new Error("Malformed ID token header.");
  }

  if (!header.kid) {
    throw new Error("ID token header is missing a key id.");
  }

  let certs = await getGoogleCerts();
  if (!certs[header.kid]) {
    // The signing key may have rotated since the certificate map was cached.
    certs = await getGoogleCerts(true);
  }

  return verifyIdTokenWithCerts(idToken, projectId, certs);
}
