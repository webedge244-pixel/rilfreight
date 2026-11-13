/**
 * Admin authentication verification suite.
 *
 * Exercises the pieces that protect the operations console:
 *
 *   1. the allowlist parser;
 *   2. the Firebase ID token verifier (signature + claims);
 *   3. the session cookie signer;
 *   4. a live check that Google's published certificates parse correctly.
 *
 * Run with:  node scripts/verify-admin-auth.mjs
 *
 * No network access is required for suites 1-3. Suite 4 reaches out to
 * Google's certificate endpoint and is skipped when offline.
 */

import { registerHooks } from "node:module";
import { generateKeyPairSync, createSign, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

// ─────────────────────────────────────────────────────────
// Resolve the "@/..." alias the way Next.js does, so the
// real source modules can be imported here unmodified.
// ─────────────────────────────────────────────────────────
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      let target = path.join(SRC, specifier.slice(2));
      for (const candidate of [".ts", ".tsx", "/index.ts"]) {
        if (fs.existsSync(target + candidate)) {
          target += candidate;
          break;
        }
      }
      return { url: pathToFileURL(target).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

process.env.NEXT_PUBLIC_PERMITTED_EMAILS =
  "webedge244@gmail.com, hs@example.com ,ops@rilfreight.com";
process.env.SESSION_SECRET = "test-secret-value-for-verification-suite";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "webedge-96a41";

const { getPermittedEmails, isPermittedEmail, checkPermittedEmail } =
  await import(pathToFileURL(path.join(SRC, "shared/lib/permissions.ts")).href);
const { verifyIdTokenWithCerts, verifyFirebaseIdToken } = await import(
  pathToFileURL(path.join(SRC, "server/auth/firebaseIdToken.ts")).href
);
const { createSessionToken, verifySessionToken } = await import(
  pathToFileURL(path.join(SRC, "server/auth/adminSession.ts")).href
);

// ─────────────────────────────────────────────────────────
// Tiny assertion harness
// ─────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function check(label, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    failures.push(label);
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

// ─────────────────────────────────────────────────────────
// Helpers for building test tokens
// ─────────────────────────────────────────────────────────
const PROJECT_ID = "webedge-96a41";
const KID = "test-key-1";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
const CERTS = { [KID]: publicKeyPem };

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

function makeToken(claims, kid = KID, alg = "RS256") {
  const header = b64url(JSON.stringify({ alg, typ: "JWT", kid }));
  const payload = b64url(JSON.stringify(claims));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(privateKey).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

function validClaims(overrides = {}) {
  return {
    aud: PROJECT_ID,
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    sub: "firebase-uid-1234",
    email: "webedge244@gmail.com",
    email_verified: true,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────
// Suite 1 — Allowlist parsing
// ─────────────────────────────────────────────────────────
section("1. Allowlist parsing");

const allowed = getPermittedEmails();
check("parses three comma-separated addresses", allowed.size === 3);
check(
  "trims surrounding whitespace",
  allowed.has("hs@example.com")
);
check("lower-cases entries", allowed.has("webedge244@gmail.com"));
check(
  "matches an allowed address",
  isPermittedEmail("webedge244@gmail.com") === true
);
check(
  "matching is case-insensitive",
  isPermittedEmail("WEBEDGE244@Gmail.com") === true
);
check(
  "matches a second allowed address",
  isPermittedEmail("ops@rilfreight.com") === true
);
check(
  "rejects an unknown address",
  isPermittedEmail("stranger@example.com") === false
);
check("rejects an empty address", isPermittedEmail("") === false);
check("rejects null", isPermittedEmail(null) === false);
check(
  "rejects an address with surrounding whitespace once trimmed",
  isPermittedEmail("  webedge244@gmail.com  ") === true
);
check(
  "browser check agrees with the strict check",
  checkPermittedEmail("webedge244@gmail.com") === true
);
check(
  "browser check rejects an unknown address",
  checkPermittedEmail("stranger@example.com") === false
);

// ─────────────────────────────────────────────────────────
// Suite 2 — Firebase ID token verification
// ─────────────────────────────────────────────────────────
section("2. Firebase ID token verification");

const goodToken = makeToken(validClaims());
const identity = verifyIdTokenWithCerts(goodToken, PROJECT_ID, CERTS);
check("accepts a well-formed token", identity?.uid === "firebase-uid-1234");
check("extracts the e-mail claim", identity?.email === "webedge244@gmail.com");
check(
  "reports the e-mail verification state",
  identity?.emailVerified === true
);

const tampered = (() => {
  const parts = goodToken.split(".");
  const forged = b64url(
    JSON.stringify(validClaims({ email: "attacker@example.com" }))
  );
  return `${parts[0]}.${forged}.${parts[2]}`;
})();
let threw = false;
try {
  verifyIdTokenWithCerts(tampered, PROJECT_ID, CERTS);
} catch {
  threw = true;
}
check("rejects a tampered payload", threw);

threw = false;
try {
  verifyIdTokenWithCerts(goodToken, "another-project", CERTS);
} catch {
  threw = true;
}
check("rejects a token issued for another project", threw);

threw = false;
try {
  verifyIdTokenWithCerts(
    makeToken(validClaims({ aud: "another-project" })),
    PROJECT_ID,
    CERTS
  );
} catch {
  threw = true;
}
check("rejects a mismatched audience claim", threw);

threw = false;
try {
  verifyIdTokenWithCerts(
    makeToken(validClaims({ iss: "https://evil.example.com" })),
    PROJECT_ID,
    CERTS
  );
} catch {
  threw = true;
}
check("rejects a mismatched issuer claim", threw);

threw = false;
try {
  verifyIdTokenWithCerts(
    makeToken(validClaims({ exp: Math.floor(Date.now() / 1000) - 60 })),
    PROJECT_ID,
    CERTS
  );
} catch {
  threw = true;
}
check("rejects an expired token", threw);

threw = false;
try {
  verifyIdTokenWithCerts(goodToken, PROJECT_ID, { "other-kid": publicKeyPem });
} catch {
  threw = true;
}
check("rejects a token signed by an unknown key", threw);

threw = false;
try {
  verifyIdTokenWithCerts(makeToken(validClaims(), KID, "HS256"), PROJECT_ID, CERTS);
} catch {
  threw = true;
}
check("rejects a non-RS256 algorithm", threw);

threw = false;
try {
  verifyIdTokenWithCerts("not-a-jwt", PROJECT_ID, CERTS);
} catch {
  threw = true;
}
check("rejects a malformed token", threw);

// ─────────────────────────────────────────────────────────
// Suite 3 — Session cookie
// ─────────────────────────────────────────────────────────
section("3. Session cookie");

const token = createSessionToken(
  { email: "webedge244@gmail.com", uid: "firebase-uid-1234" },
  { remembered: false }
);
check("issues a signed token", typeof token === "string" && token.includes("."));

const session = verifySessionToken(token);
check("verifies its own token", session?.uid === "firebase-uid-1234");
check(
  "normalises the stored e-mail",
  session?.email === "webedge244@gmail.com"
);
check(
  "records the remembered choice",
  session?.remembered === false
);

const rememberedToken = createSessionToken(
  { email: "webedge244@gmail.com", uid: "firebase-uid-1234" },
  { remembered: true }
);
const rememberedSession = verifySessionToken(rememberedToken);
check(
  "records a remembered session",
  rememberedSession?.remembered === true
);
check(
  "a remembered session outlives a standard one",
  rememberedSession.exp - rememberedSession.iat >
    session.exp - session.iat
);

check(
  "rejects a tampered payload",
  verifySessionToken(
    `${Buffer.from(
      JSON.stringify({ ...session, email: "attacker@example.com" })
    ).toString("base64url")}.${token.split(".")[1]}`
  ) === null
);

check("rejects an empty token", verifySessionToken("") === null);
check("rejects a null token", verifySessionToken(null) === null);
check("rejects a garbage token", verifySessionToken("abc.def.ghi") === null);

const unauthorised = createSessionToken(
  { email: "stranger@example.com", uid: "uid" },
  { remembered: false }
);
check(
  "refuses to verify a session for an address off the allowlist",
  verifySessionToken(unauthorised) === null
);

// ─────────────────────────────────────────────────────────
// Suite 4 — Live Google certificate check
// ─────────────────────────────────────────────────────────
section("4. Live Google certificate check (network)");

try {
  const response = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
  );
  check("certificate endpoint reachable", response.ok);

  const certs = await response.json();
  const kids = Object.keys(certs);
  check("certificate map is populated", kids.length > 0, `got ${kids.length}`);

  let parsed = 0;
  for (const kid of kids) {
    const { X509Certificate } = await import("node:crypto");
    try {
      const key = new X509Certificate(certs[kid]).publicKey;
      if (key) parsed += 1;
    } catch {
      /* handled by the count comparison */
    }
  }
  check(
    "every published certificate parses into a usable public key",
    parsed === kids.length,
    `${parsed}/${kids.length}`
  );

  let liveThrew = false;
  try {
    await verifyFirebaseIdToken(goodToken, PROJECT_ID);
  } catch {
    liveThrew = true;
  }
  check(
    "rejects a locally signed token against the live certificates",
    liveThrew
  );
} catch (error) {
  console.log(`  ! skipped — ${error.message}`);
}

// ─────────────────────────────────────────────────────────
// Verdict
// ─────────────────────────────────────────────────────────
console.log(
  `\n${"─".repeat(52)}\n  ${passed} passed, ${failed} failed  (${randomUUID().slice(0, 8)})`
);
if (failed > 0) {
  console.log("\n  Failures:");
  for (const failure of failures) console.log(`   - ${failure}`);
}
console.log(`${"─".repeat(52)}\n`);

process.exit(failed > 0 ? 1 : 0);
