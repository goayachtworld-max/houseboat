import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, adminUsersTable } from "@workspace/db";
import {
  AdminLoginBody,
  AdminLoginResponse,
  AdminLogoutResponse,
} from "@workspace/api-zod";
import crypto from "crypto";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "houseboat_salt_goa").digest("hex");
}

// ---------------------------------------------------------------------------
// Token-based auth (localStorage) — no cookies, works cross-domain
// Token format: base64(JSON { id, username, role, exp })
// ---------------------------------------------------------------------------

function makeToken(user: { id: number; username: string; role: string }): string {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function parseToken(token: string): { id: number; username: string; role: string } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return { id: payload.id, username: payload.username, role: payload.role };
  } catch {
    return null;
  }
}

// Middleware helper — reads Bearer token from Authorization header OR cookie (backward compat)
export function getSession(req: any): { id: number; username: string; role: string } | null {
  // 1. Try Authorization: Bearer <token>
  const authHeader = req.headers?.authorization as string | undefined;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    return parseToken(token);
  }
  // 2. Fallback: cookie (for local dev)
  const cookie = req.cookies?.admin_session;
  if (cookie) {
    try { return JSON.parse(cookie); } catch { return null; }
  }
  return null;
}

async function ensureAdminUser() {
  const admins = await db.select().from(adminUsersTable).limit(1);
  if (admins.length === 0) {
    await db.insert(adminUsersTable).values({
      username: "admin",
      passwordHash: hashPassword("admin123"),
      role: "admin",
    });
  }
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await ensureAdminUser();
  const [user] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.username, parsed.data.username));

  if (!user || user.passwordHash !== hashPassword(parsed.data.password)) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const token = makeToken(user);

  res.json({
    user: { id: user.id, username: user.username, role: user.role },
    message: "Login successful",
    token,  // stored in localStorage by the client
  });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  // Token-based logout is handled client-side (clear localStorage)
  res.json(AdminLogoutResponse.parse({ message: "Logged out successfully" }));
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const [user] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, session.id));
    if (!user) { res.status(401).json({ error: "User not found" }); return; }
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdAt,
    });
  } catch {
    res.status(401).json({ error: "Invalid session" });
  }
});

// Update admin profile
router.put("/auth/profile", async (req, res): Promise<void> => {
  const session = getSession(req);
  if (!session) { res.status(401).json({ error: "Not authenticated" }); return; }

  try {
    const { displayName, email, phone, currentPassword, newPassword, username } = req.body;

    const [user] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, session.id));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const updates: Partial<typeof user> = {};

    if (displayName !== undefined) updates.displayName = displayName;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;

    if (username && username !== user.username) {
      const existing = await db.select().from(adminUsersTable).where(eq(adminUsersTable.username, username));
      if (existing.length > 0) { res.status(400).json({ error: "Username already taken" }); return; }
      updates.username = username;
    }

    if (newPassword) {
      if (!currentPassword || user.passwordHash !== hashPassword(currentPassword)) {
        res.status(400).json({ error: "Current password is incorrect" });
        return;
      }
      updates.passwordHash = hashPassword(newPassword);
    }

    const [updated] = await db.update(adminUsersTable).set(updates).where(eq(adminUsersTable.id, session.id)).returning();

    const newToken = makeToken(updated);

    res.json({
      success: true,
      token: newToken,
      user: {
        id: updated.id,
        username: updated.username,
        role: updated.role,
        displayName: updated.displayName,
        email: updated.email,
        phone: updated.phone,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;