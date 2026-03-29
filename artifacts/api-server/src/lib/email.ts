import nodemailer from "nodemailer";
import { db, settingsTable } from "@workspace/db";

export interface InquiryEmailData {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  packageService: string;
  checkIn: string;
  guests: number;
  kids: number;
  paxDetails: string;
  message: string;
}

export async function sendInquiryEmail(data: InquiryEmailData): Promise<{ sent: boolean; error?: string }> {
  try {
    const [settings] = await db.select().from(settingsTable).limit(1);
    if (!settings) return { sent: false, error: "No settings found" };

    const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, smtpSecure, notifyEmail, siteName } = settings;

    if (!smtpHost || !smtpUser || !smtpPass || !notifyEmail) {
      return { sent: false, error: "SMTP not configured" };
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort || "587"),
      secure: smtpSecure === "true",
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    });

    const guestLine = `${data.guests} adult${data.guests !== 1 ? "s" : ""}${data.kids > 0 ? `, ${data.kids} kid${data.kids !== 1 ? "s" : ""}` : ""}`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
  .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  .header { background: #1a2e4a; color: #fff; padding: 32px 40px; }
  .header h1 { margin: 0; font-size: 22px; }
  .header p { margin: 6px 0 0; color: rgba(255,255,255,0.7); font-size: 13px; }
  .badge { display: inline-block; background: #e8a020; color: #fff; font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 20px; margin-top: 10px; letter-spacing: 0.5px; }
  .body { padding: 32px 40px; }
  .section-title { font-size: 12px; font-weight: bold; color: #888; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 12px; }
  .row { display: flex; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
  .row:last-child { border-bottom: none; }
  .label { width: 140px; color: #888; font-size: 13px; flex-shrink: 0; }
  .value { color: #111; font-size: 13px; font-weight: 500; }
  .message-box { background: #f8f9fa; border-left: 3px solid #e8a020; padding: 14px 16px; border-radius: 4px; font-size: 13px; color: #444; margin-top: 8px; white-space: pre-wrap; }
  .footer { background: #f8f9fa; padding: 20px 40px; text-align: center; font-size: 12px; color: #aaa; }
  .cta { margin-top: 24px; text-align: center; }
  .cta a { display: inline-block; background: #e8a020; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; }
</style></head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>New Inquiry Received</h1>
    <p>${siteName || "Shubhangi The Boat House"}</p>
    <span class="badge">NEW INQUIRY</span>
  </div>
  <div class="body">
    <div class="section-title">Contact Details</div>
    <div class="row"><span class="label">Name</span><span class="value">${data.name}</span></div>
    <div class="row"><span class="label">Email</span><span class="value">${data.email}</span></div>
    ${data.phone ? `<div class="row"><span class="label">Phone</span><span class="value">${data.phone}</span></div>` : ""}
    ${data.whatsapp ? `<div class="row"><span class="label">WhatsApp</span><span class="value">${data.whatsapp}</span></div>` : ""}

    <div class="section-title">Booking Details</div>
    ${data.packageService ? `<div class="row"><span class="label">Package</span><span class="value">${data.packageService}</span></div>` : ""}
    ${data.checkIn ? `<div class="row"><span class="label">Preferred Date</span><span class="value">${data.checkIn}</span></div>` : ""}
    <div class="row"><span class="label">Guests</span><span class="value">${guestLine}</span></div>
    ${data.paxDetails ? `<div class="row"><span class="label">Group Notes</span><span class="value">${data.paxDetails}</span></div>` : ""}

    ${data.message ? `
    <div class="section-title">Message</div>
    <div class="message-box">${data.message}</div>
    ` : ""}

    ${data.whatsapp || data.phone ? `
    <div class="cta">
      <a href="https://wa.me/${(data.whatsapp || data.phone).replace(/\D/g, "")}?text=Hi+${encodeURIComponent(data.name)}%2C+thank+you+for+your+inquiry+about+our+houseboat!">
        Reply on WhatsApp
      </a>
    </div>
    ` : ""}
  </div>
  <div class="footer">This email was sent automatically when ${data.name} submitted an inquiry on your website.</div>
</div>
</body>
</html>`;

    await transporter.sendMail({
      from: smtpFrom || smtpUser,
      to: notifyEmail,
      replyTo: data.email,
      subject: `New Inquiry from ${data.name} — ${siteName || "Shubhangi The Boat House"}`,
      html,
    });

    return { sent: true };
  } catch (err: any) {
    return { sent: false, error: err?.message || "Unknown error" };
  }
}
