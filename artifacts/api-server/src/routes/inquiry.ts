import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { inquiriesTable } from "@workspace/db/schema";
import { serializeArray, serializeDates } from "../lib/serialize";
import { sendInquiryEmail } from "../lib/email";

const router: IRouter = Router();

// Public: submit inquiry
router.post("/inquiry", async (req, res): Promise<void> => {
  const { name, email, phone, whatsapp, packageService, checkIn, checkOut, guests, kids, paxDetails, message } = req.body;
  if (!name || !email) {
    res.status(400).json({ error: "Name and email are required" });
    return;
  }
  req.log.info({ name, email, phone }, `New inquiry: ${(message || "").slice(0, 80)}`);
  try {
    const [inquiry] = await db.insert(inquiriesTable).values({
      name,
      email,
      phone: phone || "",
      whatsapp: whatsapp || "",
      packageService: packageService || "",
      checkIn: checkIn || "",
      checkOut: checkOut || "",
      guests: guests || 1,
      kids: kids || 0,
      paxDetails: paxDetails || "",
      message: message || "",
      status: "new",
    }).returning();

    // Fire email notification (non-blocking — don't fail if email fails)
    sendInquiryEmail({
      name, email, phone: phone || "", whatsapp: whatsapp || "",
      packageService: packageService || "", checkIn: checkIn || "",
      guests: guests || 1, kids: kids || 0,
      paxDetails: paxDetails || "", message: message || "",
    }).then(({ sent, error }) => {
      if (sent) req.log.info({ inquiryId: inquiry.id }, "Inquiry email sent");
      else req.log.warn({ error, inquiryId: inquiry.id }, "Inquiry email not sent");
    });

    res.json({ message: "Your inquiry has been received. We will contact you shortly on WhatsApp or Email!", id: inquiry.id });
  } catch (err) {
    req.log.error(err, "Failed to save inquiry to DB");
    res.status(500).json({ error: "Failed to submit inquiry" });
  }
});

// Admin: send a test email to verify SMTP settings
router.post("/email/test", async (req, res): Promise<void> => {
  const { sent, error } = await sendInquiryEmail({
    name: "Test User",
    email: "test@example.com",
    phone: "+91 98765 43210",
    whatsapp: "+91 98765 43210",
    packageService: "Luxury Overnight Package",
    checkIn: new Date().toISOString().split("T")[0],
    guests: 2,
    kids: 1,
    paxDetails: "This is a test inquiry email",
    message: "If you received this email, your SMTP settings are working correctly!",
  });
  if (sent) {
    res.json({ success: true, message: "Test email sent successfully!" });
  } else {
    res.status(400).json({ success: false, error: error || "Failed to send test email" });
  }
});

// Admin: list all inquiries (newest first)
router.get("/inquiries", async (req, res): Promise<void> => {
  try {
    const inquiries = await db
      .select()
      .from(inquiriesTable)
      .orderBy(inquiriesTable.createdAt);
    res.json(serializeArray(inquiries));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch inquiries" });
  }
});

// Admin: update inquiry status or notes
router.patch("/inquiries/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status } = req.body;
  const VALID = ["new", "details_shared", "converted", "lost"];
  if (status && !VALID.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  try {
    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    const [updated] = await db.update(inquiriesTable).set(updates).where(eq(inquiriesTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Inquiry not found" }); return; }
    res.json(serializeDates(updated));
  } catch (err) {
    res.status(500).json({ error: "Failed to update inquiry" });
  }
});

// Admin: delete inquiry
router.delete("/inquiries/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db.delete(inquiriesTable).where(eq(inquiriesTable.id, id));
    res.sendStatus(204);
  } catch {
    res.status(500).json({ error: "Failed to delete inquiry" });
  }
});

export default router;
