import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/server/auth/adminSession";
import { verifyFirebaseIdToken } from "@/server/auth/firebaseIdToken";
import { isPermittedEmail } from "@/shared/lib/permissions";
import { sendEmailViaResend } from "@/server/email/resend";

const PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || "webedge-96a41";

export async function POST(request: Request) {
  // 1. Authenticate Admin session via Cookie or Bearer Token
  let isAuthorized = false;
  let operatorEmail = "";

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const cookieSession = verifySessionToken(sessionToken);

  if (cookieSession) {
    isAuthorized = true;
    operatorEmail = cookieSession.email;
  } else {
    // Check Authorization Bearer header fallback
    const authHeader = request.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.slice(7).trim();
      try {
        const identity = await verifyFirebaseIdToken(idToken, PROJECT_ID);
        if (identity && isPermittedEmail(identity.email)) {
          isAuthorized = true;
          operatorEmail = identity.email;
        }
      } catch (err) {
        console.warn("Failed to verify Bearer ID token in email route:", err);
      }
    }
  }

  // If in local development and no session is found, check if allowlist has permitted emails
  if (!isAuthorized && process.env.NODE_ENV !== "production") {
    // Check if development relaxed mode or require auth
    // To ensure admin security, reject if unauthorized
  }

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "unauthorized", message: "Admin authorization required to send emails." },
      { status: 401 }
    );
  }

  // 2. Parse & Validate Payload
  let body: { to?: unknown; subject?: unknown; body?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Malformed JSON payload." },
      { status: 400 }
    );
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const messageBody = typeof body.body === "string" ? body.body.trim() : "";

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!to || !emailRegex.test(to)) {
    return NextResponse.json(
      { error: "invalid_recipient", message: "A valid recipient email address is required." },
      { status: 400 }
    );
  }

  if (!subject) {
    return NextResponse.json(
      { error: "missing_subject", message: "Subject line cannot be empty." },
      { status: 400 }
    );
  }

  if (!messageBody) {
    return NextResponse.json(
      { error: "missing_body", message: "Message body cannot be empty." },
      { status: 400 }
    );
  }

  // 3. Dispatch via Resend under support@rilfreight.com
  const result = await sendEmailViaResend({
    to,
    subject,
    body: messageBody,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: "send_failed", message: result.error || "Failed to dispatch email." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    id: result.id,
    to,
    dispatchedBy: operatorEmail,
  });
}
