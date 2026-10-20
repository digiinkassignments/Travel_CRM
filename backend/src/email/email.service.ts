import nodemailer from "nodemailer";
import { env } from "../config/env";

// Thin abstraction over the SMTP transport so switching to Amazon SES or
// Postmark later is a one-file change, per SRS section 31.
const transporter = env.smtp.host
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
    })
  : null;

export async function sendMail(to: string, subject: string, text: string) {
  if (!transporter) {
    console.log(`[email:dev-mode] to=${to} subject="${subject}" body="${text}"`);
    return;
  }
  await transporter.sendMail({ from: env.smtp.from, to, subject, text });
}

export async function verifySmtpHealth(): Promise<{
  configured: boolean;
  connected: boolean;
  host?: string;
  port?: number;
  from?: string;
  error?: string;
  latencyMs?: number;
}> {
  if (!transporter) {
    return {
      configured: false,
      connected: false,
      host: env.smtp.host || undefined,
      port: env.smtp.port || undefined,
      from: env.smtp.from || undefined,
      error: "SMTP not configured (dev mode)",
    };
  }

  const start = Date.now();
  try {
    await transporter.verify();
    return {
      configured: true,
      connected: true,
      host: env.smtp.host,
      port: env.smtp.port,
      from: env.smtp.from,
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      host: env.smtp.host,
      port: env.smtp.port,
      from: env.smtp.from,
      error: err?.message || "Failed to connect to SMTP server",
      latencyMs: Date.now() - start,
    };
  }
}

export interface SendHtmlMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
}

export async function sendHtmlMail(options: SendHtmlMailOptions) {
  const { to, subject, html, text, companyName = "Digiink Travel CRM", logoUrl, primaryColor = "#0284c7" } = options;

  const plainTextFallback = text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  // If html is already a full HTML document, use as-is
  const formattedHtml = html.includes("<html")
    ? html
    : `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; }
    .email-container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .email-header { background-color: ${primaryColor}; padding: 24px; text-align: center; color: #ffffff; }
    .email-header img { max-height: 50px; max-width: 200px; object-fit: contain; margin-bottom: 8px; }
    .email-header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .email-body { padding: 32px 28px; line-height: 1.6; font-size: 15px; color: #334155; }
    .email-body p { margin: 0 0 16px; }
    .email-footer { background-color: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .btn { display: inline-block; padding: 12px 24px; background-color: ${primaryColor}; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" /><br/>` : ""}
      <h1>${companyName}</h1>
    </div>
    <div class="email-body">
      ${html}
    </div>
    <div class="email-footer">
      <p style="margin:0;">Sent via ${companyName} &bull; All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

  if (!transporter) {
    console.log(`[email:html:dev-mode] to=${to} subject="${subject}" bodyPreview="${plainTextFallback.slice(0, 100)}..."`);
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: env.smtp.from,
      to,
      subject,
      text: plainTextFallback,
      html: formattedHtml,
    });
    return { success: true, messageId: info.messageId, simulated: false };
  } catch (err: any) {
    console.error("[email:send-error]", err);
    return { success: false, error: err.message };
  }
}

export interface ClientWelcomeEmailParams {
  to: string;
  ownerName: string;
  businessName: string;
  clientCode: string;
  planName?: string;
  subscriptionExpiry?: Date | string;
  temporaryPassword?: string;
  resetOtpCode: string;
  resetUrl: string;
  loginUrl: string;
}

/**
 * Sends a rich welcome email to newly provisioned client owners with their
 * company CRM details, temporary credentials, 1-click password setup link,
 * and direct CRM portal login URL.
 */
export async function sendClientWelcomeEmail(params: ClientWelcomeEmailParams) {
  const {
    to,
    ownerName,
    businessName,
    clientCode,
    planName = "Standard Plan",
    subscriptionExpiry,
    temporaryPassword,
    resetOtpCode,
    resetUrl,
    loginUrl,
  } = params;

  const expiryFormatted = subscriptionExpiry
    ? new Date(subscriptionExpiry).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "Active";

  const subject = `Welcome to Digiink Travel CRM - Your ${businessName} Portal is Ready!`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #1e293b; }
    .wrapper { background-color: #f1f5f9; padding: 40px 16px; }
    .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
    .header-badge { display: inline-block; padding: 4px 14px; background: rgba(255, 255, 255, 0.2); border-radius: 9999px; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 12px; }
    .header h1 { margin: 0 0 8px; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
    .header p { margin: 0; font-size: 14px; color: #dbeafe; }
    .content { padding: 36px 32px; }
    .greeting { font-size: 17px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
    .intro { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .card-title { font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 14px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #edf2f7; font-size: 14px; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #64748b; font-weight: 500; }
    .detail-value { color: #0f172a; font-weight: 600; text-align: right; }
    .badge-code { background: #dbeafe; color: #1d4ed8; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-size: 13px; }
    .badge-temp { background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-size: 13px; }
    .cta-container { text-align: center; margin: 32px 0; }
    .btn-primary { display: inline-block; padding: 14px 32px; background: #2563eb; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
    .btn-secondary { display: inline-block; padding: 12px 24px; background: #f1f5f9; color: #334155 !important; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; margin-top: 10px; }
    .otp-box { background: #eff6ff; border: 1px dashed #93c5fd; border-radius: 8px; padding: 14px; text-align: center; margin-top: 16px; font-size: 13px; color: #1e40af; }
    .otp-code { font-size: 20px; font-weight: 800; letter-spacing: 4px; color: #1d4ed8; margin-top: 4px; font-family: monospace; }
    .steps-section { margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 24px; }
    .steps-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .step-item { font-size: 13.5px; color: #475569; margin-bottom: 8px; line-height: 1.5; }
    .footer { background: #f8fafc; padding: 24px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .footer a { color: #2563eb; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="email-container">
      <div class="header">
        <div class="header-badge">Digiink Solutions</div>
        <h1>Welcome to Your Travel CRM</h1>
        <p>Your business platform has been provisioned and is ready</p>
      </div>

      <div class="content">
        <div class="greeting">Hello ${ownerName},</div>
        <div class="intro">
          We're excited to partner with you! A dedicated Company CRM portal for <strong>${businessName}</strong> is now live. Everything you need to manage bookings, itineraries, customers, invoices, and your team is ready for you.
        </div>

        <div class="card">
          <div class="card-title">Account & Workspace Summary</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Company Name</td>
              <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0f172a;">${businessName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Client ID Code</td>
              <td style="padding: 6px 0; text-align: right;"><span class="badge-code">${clientCode}</span></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Login Email</td>
              <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0f172a;">${to}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Subscription Plan</td>
              <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #2563eb;">${planName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Renewal Date</td>
              <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0f172a;">${expiryFormatted}</td>
            </tr>
            ${temporaryPassword ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Temporary Password</td>
              <td style="padding: 6px 0; text-align: right;"><span class="badge-temp">${temporaryPassword}</span></td>
            </tr>
            ` : ""}
          </table>
        </div>

        <div class="cta-container">
          <a href="${resetUrl}" class="btn-primary" target="_blank">
            Set Your Password & Activate
          </a>
          <br />
          <a href="${loginUrl}" class="btn-secondary" target="_blank">
            Access CRM Login Portal &rarr;
          </a>

          <div class="otp-box">
            <div>Your one-time setup code (valid for 24 hours):</div>
            <div class="otp-code">${resetOtpCode}</div>
          </div>
        </div>

        <div class="steps-section">
          <div class="steps-title">Quick Next Steps:</div>
          <div class="step-item">&bull; <strong>Set Your Password:</strong> Click the button above to choose your permanent, secure password.</div>
          <div class="step-item">&bull; <strong>Configure Profile:</strong> Add your company address, contact numbers, logo, and currency settings.</div>
          <div class="step-item">&bull; <strong>Invite Team:</strong> Add staff members, assign roles, and start creating quotations and trips.</div>
        </div>
      </div>

      <div class="footer">
        <p style="margin: 0 0 8px;">Need assistance? Reach out anytime at <a href="mailto:support@digiinksolutions.com">support@digiinksolutions.com</a></p>
        <p style="margin: 0; color: #94a3b8;">&copy; ${new Date().getFullYear()} Digiink Solutions. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return sendHtmlMail({
    to,
    subject,
    html,
    companyName: "Digiink Travel CRM",
    primaryColor: "#2563eb",
  });
}
