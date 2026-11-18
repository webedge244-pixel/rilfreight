import { NextResponse } from "next/server";
import { sendEmailViaResend } from "@/server/email/resend";

export async function POST(request: Request) {
  let body: { fullName?: unknown; email?: unknown; subject?: unknown; message?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Malformed JSON payload." },
      { status: 400 }
    );
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  // Basic validation
  if (!fullName) {
    return NextResponse.json(
      { error: "missing_name", message: "Full name is required." },
      { status: 400 }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return NextResponse.json(
      { error: "invalid_email", message: "A valid email address is required." },
      { status: 400 }
    );
  }

  if (!subject) {
    return NextResponse.json(
      { error: "missing_subject", message: "Subject is required." },
      { status: 400 }
    );
  }

  if (!message) {
    return NextResponse.json(
      { error: "missing_message", message: "Message cannot be empty." },
      { status: 400 }
    );
  }

  const emailBody = [
    `You have received a new contact inquiry from the RILFREIGHT website:`,
    ``,
    `Full Name: ${fullName}`,
    `Sender Email: ${email}`,
    `Subject: ${subject}`,
    ``,
    `Message:`,
    `${message}`,
  ].join("\n");

  const result = await sendEmailViaResend({
    to: "support@rilfreight.com",
    subject: `[Contact Inquiry] ${subject}`,
    body: emailBody,
  });

  if (!result.success) {
    // If Resend API key is missing in local dev, allow graceful completion and log
    if (result.error?.includes("RESEND_API_KEY")) {
      console.warn("Contact form received message (simulated without RESEND_API_KEY):", {
        fullName,
        email,
        subject,
      });
      return NextResponse.json({
        success: true,
        warning: "Simulation mode: Email not dispatched because RESEND_API_KEY is not configured.",
      });
    }

    return NextResponse.json(
      { error: "dispatch_failed", message: result.error || "Failed to deliver message." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, id: result.id });
}
