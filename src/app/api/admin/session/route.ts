import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createSessionToken,
  getSessionTtlSeconds,
  verifySessionToken,
} from "@/server/auth/adminSession";
import { verifyFirebaseIdToken } from "@/server/auth/firebaseIdToken";
import { isPermittedEmail } from "@/shared/lib/permissions";

/**
 * Admin session endpoint.
 *
 * POST   — body `{ idToken: string, remember?: boolean }`
 *          Verifies the Firebase ID token, confirms the e-mail is on the
 *          operations allowlist, and issues the HttpOnly session cookie.
 *          Responds 403 when the account is not authorised.
 *
 *          `remember` is only sent by the sign-in form. A refresh that omits
 *          it keeps the lifetime the operator originally chose, so a
 *          "remember this terminal" session is never silently downgraded.
 *
 * DELETE — clears the session cookie.
 */

const PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || "webedge-96a41";

/**
 * Shared cookie attributes. HttpOnly keeps the session out of reach of
 * client-side script; SameSite=Lax blocks cross-site submission.
 */
function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function POST(request: Request) {
  let body: { idToken?: unknown; remember?: unknown };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "invalid_request", message: "Expected a JSON body." },
      { status: 400 }
    );
  }

  const idToken = typeof body.idToken === "string" ? body.idToken : "";
  if (!idToken) {
    return NextResponse.json(
      { error: "missing_id_token", message: "No ID token supplied." },
      { status: 400 }
    );
  }

  let identity;
  try {
    identity = await verifyFirebaseIdToken(idToken, PROJECT_ID);
  } catch (error) {
    return NextResponse.json(
      {
        error: "invalid_token",
        message: (error as Error).message,
      },
      { status: 401 }
    );
  }

  if (!isPermittedEmail(identity.email)) {
    return NextResponse.json(
      {
        error: "not_authorized",
        message:
          "This account is not on the operations allowlist and cannot access the console.",
      },
      { status: 403 }
    );
  }

  // Decide the session lifetime. An explicit choice from the sign-in form
  // wins; otherwise an existing session for the same operator is carried over.
  const cookieStore = await cookies();
  const existing = verifySessionToken(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  );

  let remembered: boolean;
  if (typeof body.remember === "boolean") {
    remembered = body.remember;
  } else if (existing && existing.email === identity.email) {
    remembered = existing.remembered;
  } else {
    remembered = false;
  }

  const token = createSessionToken(
    { email: identity.email, uid: identity.uid },
    { remembered }
  );

  const response = NextResponse.json({
    authenticated: true,
    email: identity.email,
  });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    ...cookieOptions(getSessionTtlSeconds(remembered)),
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    ...cookieOptions(0),
  });

  return response;
}
