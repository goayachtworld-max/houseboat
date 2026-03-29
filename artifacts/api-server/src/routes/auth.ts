import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, adminUsersTable } from "@workspace/db";
import {
  AdminLoginBody,
  AdminLoginResponse,
  AdminLogoutResponse,
} from "@workspace/api-zod";
import crypto from "crypto";
import type { CookieOptions } from "express";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "houseboat_salt_goa").digest("hex");
}

// ---------------------------------------------------------------------------
// Cookie options — cross-origin safe
// ---------------------------------------------------------------------------
// When frontend (cPanel) and backend (VPS) are on different domains, browsers
// require sameSite:"none" + secure:true for cookies to be sent cross-origin.
// In local dev (NODE_ENV !== "production") we use sameSite:"lax" so
// http://localhost still works without HTTPS.
// ---------------------------------------------------------------------------
const IS_PROD = process.env.NODE_ENV === "production";

function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    sameSite: IS_PROD ? "none" : "lax",
    secure: IS_PROD,
    // If COOKIE_DOMAIN is set (e.g. .shubhangihouseboatgoa.com), the cookie
    // is shared across all subdomains of that root domain.
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  };
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

  (req as any).session = { user: { id: user.id, username: user.username, role: user.role } };
  res.cookie(
    "admin_session",
    JSON.stringify({ id: user.id, username: user.username, role: user.role }),
    sessionCookieOptions(),
  );

  res.json(AdminLoginResponse.parse({
    user: { id: user.id, username: user.username, role: user.role },
    message: "Login successful",
  }));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  // Clear with the same options so the browser actually removes the cookie
  res.clearCookie("admin_session", sessionCookieOptions());
  (req as any).session = null;
  res.json(AdminLogoutResponse.parse({ message: "Logged out successfully" }));
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const cookie = req.cookies?.admin_session;
  if (!cookie) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const session = JSON.parse(cookie);
    const [user] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, session.id));
    if (!user) { res.status(401).json({ error: "User not found" }); return; }
    res.json({ id: user.id, username: user.username, role: user.role, displayName: user.displayName, email: user.email, phone: user.phone, createdAt: user.createdAt });
  } catch {
    res.status(401).json({ error: "Invalid session" });
  }
});

// Update admin profile
router.put("/auth/profile", async (req, res): Promise<void> => {
  const cookie = req.cookies?.admin_session;
  if (!cookie) { res.status(401).json({ error: "Not authenticated" }); return; }

  try {
    const session = JSON.parse(cookie);
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

    // Refresh cookie with new username if changed
    const newSession = { id: updated.id, username: updated.username, role: updated.role };
    res.cookie("admin_session", JSON.stringify(newSession), sessionCookieOptions());

    res.json({ success: true, user: { id: updated.id, username: updated.username, role: updated.role, displayName: updated.displayName, email: updated.email, phone: updated.phone } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;