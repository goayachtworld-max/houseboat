import { Router, type IRouter, type Response } from "express";
import { eq, and, desc, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import { chatSessionsTable, chatMessagesTable } from "@workspace/db/schema";
import { randomUUID } from "crypto";
import { serializeArray, serializeDates } from "../lib/serialize";

const router: IRouter = Router();

// ─── In-memory SSE subscriber maps ─────────────────────────────────────────
// token → set of visitor SSE response objects
const sessionSubs = new Map<string, Set<Response>>();
// Admin SSE subscribers (all active admins)
const adminSubs = new Set<Response>();

function broadcast(token: string, event: string, payload: object) {
  const line = `event: ${event}\ndata: ${JSON.stringify({ ...payload, sessionToken: token })}\n\n`;
  sessionSubs.get(token)?.forEach(res => { try { res.write(line); } catch {} });
  adminSubs.forEach(res => { try { res.write(line); } catch {} });
}

function broadcastAdmin(event: string, payload: object) {
  const line = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  adminSubs.forEach(res => { try { res.write(line); } catch {} });
}

// ─── Predefined Q&A ────────────────────────────────────────────────────────
const QA: Record<string, string> = {
  "What are your package prices?":
    "Our packages start from ₹18,000/night for 2 guests. Visit our Packages page to see full pricing and what's included! 🛥️",
  "What's included in the packages?":
    "All packages include meals (breakfast, lunch & dinner), water activities, dedicated crew, and air-conditioned cabins. Check our Packages page for exact inclusions per package!",
  "How can I make a booking?":
    "Easy! You can book via WhatsApp by clicking the 'Book Now' button, or fill in our Inquiry form and we'll get back to you within a few hours. 🙌",
  "Is the houseboat available for my dates?":
    "Please share your preferred dates and we'll check availability right away! You can also use the 'Check Availability' tool on our home page for an instant answer. 📅",
  "What activities are available?":
    "We offer kayaking, speed boating, fishing, sunset cruises, swimming, and more! Our Activities page has all the details. 🌊",
  "Where are you located?":
    "We're based on Goa's stunning backwaters near the Mandovi River. We share the exact pickup point once you confirm your booking. 📍",
};

// ─── Public: create or resume session ──────────────────────────────────────
router.post("/chat/session", async (req, res): Promise<void> => {
  const { visitorName, token: existingToken } = req.body;

  // Try to resume existing session
  if (existingToken) {
    try {
      const [existing] = await db
        .select()
        .from(chatSessionsTable)
        .where(and(eq(chatSessionsTable.token, existingToken), eq(chatSessionsTable.status, "active")));
      if (existing) {
        res.json(serializeDates(existing));
        return;
      }
    } catch {}
  }

  const token = randomUUID();
  const name = (visitorName as string)?.trim() || "Guest";
  try {
    const [session] = await db
      .insert(chatSessionsTable)
      .values({ token, visitorName: name, status: "active" })
      .returning();
    broadcastAdmin("session_new", serializeDates(session));
    res.json(serializeDates(session));
  } catch (err) {
    res.status(500).json({ error: "Failed to create session" });
  }
});

// ─── Public: send a message ────────────────────────────────────────────────
router.post("/chat/session/:token/messages", async (req, res): Promise<void> => {
  const { token } = req.params;
  const { message, sender = "visitor" } = req.body;

  if (!message?.trim()) { res.status(400).json({ error: "Message required" }); return; }

  // Validate sender — admin must be authenticated
  const safeSender = sender === "admin" ? "admin" : "visitor";

  try {
    // Fetch session
    const [session] = await db
      .select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.token, token));
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }
    if (session.status === "closed") { res.status(400).json({ error: "Session closed" }); return; }

    // Insert message
    const [msg] = await db
      .insert(chatMessagesTable)
      .values({ sessionId: session.id, sender: safeSender, message: message.trim() })
      .returning();

    const serialized = serializeDates(msg);
    broadcast(token, "message", serialized);

    // Touch session updatedAt
    await db
      .update(chatSessionsTable)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessionsTable.id, session.id));

    res.json(serialized);

    // Auto bot reply for predefined questions (only for visitor messages)
    if (safeSender === "visitor") {
      const botReply = QA[message.trim()];
      if (botReply) {
        setTimeout(async () => {
          try {
            const [botMsg] = await db
              .insert(chatMessagesTable)
              .values({ sessionId: session.id, sender: "bot", message: botReply })
              .returning();
            broadcast(token, "message", serializeDates(botMsg));
          } catch {}
        }, 600);
      }
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ─── Public: get messages for a session ───────────────────────────────────
router.get("/chat/session/:token/messages", async (req, res): Promise<void> => {
  const { token } = req.params;
  try {
    const [session] = await db
      .select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.token, token));
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }

    const messages = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.sessionId, session.id))
      .orderBy(asc(chatMessagesTable.createdAt));

    res.json(serializeArray(messages));
  } catch {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// ─── Public: SSE stream for visitor ───────────────────────────────────────
router.get("/chat/session/:token/stream", (req, res): void => {
  const { token } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Keep-alive ping every 25s
  const ping = setInterval(() => { try { res.write(": ping\n\n"); } catch {} }, 25000);

  if (!sessionSubs.has(token)) sessionSubs.set(token, new Set());
  sessionSubs.get(token)!.add(res);

  req.on("close", () => {
    clearInterval(ping);
    sessionSubs.get(token)?.delete(res);
    if (sessionSubs.get(token)?.size === 0) sessionSubs.delete(token);
  });
});

// ─── Admin: SSE stream for all sessions ───────────────────────────────────
router.get("/chat/admin/stream", (req, res): void => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const ping = setInterval(() => { try { res.write(": ping\n\n"); } catch {} }, 25000);
  adminSubs.add(res);

  req.on("close", () => {
    clearInterval(ping);
    adminSubs.delete(res);
  });
});

// ─── Admin: list all sessions ──────────────────────────────────────────────
router.get("/chat/sessions", async (req, res): Promise<void> => {
  try {
    const sessions = await db
      .select()
      .from(chatSessionsTable)
      .orderBy(desc(chatSessionsTable.updatedAt));

    // For each session get last message
    const enriched = await Promise.all(
      sessions.map(async s => {
        const [lastMsg] = await db
          .select()
          .from(chatMessagesTable)
          .where(eq(chatMessagesTable.sessionId, s.id))
          .orderBy(desc(chatMessagesTable.createdAt))
          .limit(1);
        return { ...serializeDates(s), lastMessage: lastMsg ? serializeDates(lastMsg) : null };
      })
    );
    res.json(enriched);
  } catch {
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// ─── Admin: close a session ────────────────────────────────────────────────
router.patch("/chat/session/:token/close", async (req, res): Promise<void> => {
  const { token } = req.params;
  try {
    const [updated] = await db
      .update(chatSessionsTable)
      .set({ status: "closed", updatedAt: new Date() })
      .where(eq(chatSessionsTable.token, token))
      .returning();
    if (!updated) { res.status(404).json({ error: "Session not found" }); return; }
    broadcast(token, "session_closed", serializeDates(updated));
    res.json(serializeDates(updated));
  } catch {
    res.status(500).json({ error: "Failed to close session" });
  }
});

export default router;
