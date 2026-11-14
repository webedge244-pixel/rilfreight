/**
 * Server-only Resend email dispatcher.
 * Uses native fetch to call https://api.resend.com/emails with RESEND_API_KEY.
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendEmailViaResend(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      success: false,
      error: "RESEND_API_KEY is not configured in .env.local",
    };
  }

  const fromAddress = params.from || "Rilfreight Operations <support@rilfreight.com>";
  const htmlContent = buildBrandedEmailHtml(params.subject, params.body);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [params.to.trim().toLowerCase()],
        subject: params.subject.trim(),
        text: params.body,
        html: htmlContent,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.message || `Resend error (${res.status})`,
      };
    }

    return { success: true, id: data.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network failure communicating with Resend";
    return {
      success: false,
      error: message,
    };
  }
}

function buildBrandedEmailHtml(subject: string, bodyText: string): string {
  const formattedParagraphs = bodyText
    .split("\n\n")
    .map((p) => `<p style="margin: 0 0 16px 0; line-height: 1.6;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  return `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /></head>
  <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #0f172a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
      <tr>
        <td style="background-color: #0F313A; padding: 24px 32px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">RILFREIGHT</h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Express Global Freight & Logistics</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 32px; font-size: 14px; color: #334155;">
          <h2 style="margin: 0 0 20px 0; font-size: 18px; color: #0F313A;">${subject}</h2>
          ${formattedParagraphs}
          <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            <p style="margin: 0 0 4px 0; font-weight: bold; color: #0F313A;">RILFREIGHT Operations</p>
            <p style="margin: 0;">Support: <a href="mailto:support@rilfreight.com" style="color: #BA1C20; text-decoration: none;">support@rilfreight.com</a></p>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}
