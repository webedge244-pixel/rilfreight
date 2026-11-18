import { NextResponse } from "next/server";
import { sendEmailViaResend } from "@/server/email/resend";

export async function POST(request: Request) {
  let body: {
    fullName?: unknown;
    email?: unknown;
    phone?: unknown;
    subject?: unknown;
    deliverCity?: unknown;
    departureCity?: unknown;
    freightType?: unknown;
    incoterms?: unknown;
    weight?: unknown;
    height?: unknown;
    fragile?: unknown;
    express?: unknown;
    insurance?: unknown;
    packaging?: unknown;
  };

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
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const deliverCity = typeof body.deliverCity === "string" ? body.deliverCity.trim() : "";
  const departureCity = typeof body.departureCity === "string" ? body.departureCity.trim() : "";
  const freightType = typeof body.freightType === "string" ? body.freightType.trim() : "Truck Freight";
  const incoterms = typeof body.incoterms === "string" ? body.incoterms.trim() : "EXW";
  const weight = typeof body.weight === "string" ? body.weight.trim() : "";
  const height = typeof body.height === "string" ? body.height.trim() : "";
  const fragile = Boolean(body.fragile);
  const express = Boolean(body.express);
  const insurance = Boolean(body.insurance);
  const packaging = Boolean(body.packaging);

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

  const emailSubject = `[Quote Request] ${subject || freightType} - ${fullName}`;

  const emailBody = [
    `You have received a new Freight Quote Request from the RILFREIGHT website:`,
    ``,
    `--- SENDER DETAILS ---`,
    `Full Name: ${fullName}`,
    `Email: ${email}`,
    `Phone: ${phone || "Not specified"}`,
    ``,
    `--- ROUTE & SERVICE ---`,
    `Subject: ${subject || "General Freight Quote"}`,
    `Freight Type: ${freightType}`,
    `Incoterms: ${incoterms}`,
    `City of Departure: ${departureCity || "Not specified"}`,
    `Destination / Delivery City: ${deliverCity || "Not specified"}`,
    ``,
    `--- CARGO SPECIFICATIONS ---`,
    `Weight: ${weight || "Not specified"}`,
    `Height / Dimensions: ${height || "Not specified"}`,
    ``,
    `--- SPECIAL REQUIREMENTS ---`,
    `Fragile: ${fragile ? "Yes" : "No"}`,
    `Express Delivery: ${express ? "Yes" : "No"}`,
    `Cargo Insurance: ${insurance ? "Yes" : "No"}`,
    `Special Packaging: ${packaging ? "Yes" : "No"}`,
  ].join("\n");

  const result = await sendEmailViaResend({
    to: "support@rilfreight.com",
    subject: emailSubject,
    body: emailBody,
  });

  if (!result.success) {
    if (result.error?.includes("RESEND_API_KEY")) {
      console.warn("Quote request received (simulated without RESEND_API_KEY):", {
        fullName,
        email,
        freightType,
      });
      return NextResponse.json({
        success: true,
        warning: "Simulation mode: Email not dispatched because RESEND_API_KEY is not configured.",
      });
    }

    return NextResponse.json(
      { error: "dispatch_failed", message: result.error || "Failed to deliver quote request." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, id: result.id });
}
