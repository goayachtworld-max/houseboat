import { Router, type IRouter } from "express";
import { eq, desc, and, count } from "drizzle-orm";
import { db, blogPostsTable, otpCodesTable } from "@workspace/db";
import {
  ListBlogPostsResponse,
  ListBlogPostsQueryParams,
  CreateBlogPostBody,
  GetBlogPostResponse,
  GetBlogPostParams,
  UpdateBlogPostParams,
  UpdateBlogPostBody,
  UpdateBlogPostResponse,
  DeleteBlogPostParams,
  ApproveBlogPostParams,
  ApproveBlogPostResponse,
  GetBlogPostBySlugParams,
  GetBlogPostBySlugResponse,
  ListPendingBlogPostsResponse,
  SendBlogOtpBody,
  SendBlogOtpResponse,
  VerifyBlogOtpBody,
  VerifyBlogOtpResponse,
} from "@workspace/api-zod";
import crypto from "crypto";
import { serializeDates, serializeArray } from "../lib/serialize";

const router: IRouter = Router();

function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) +
    "-" +
    Date.now().toString(36)
  );
}

router.get("/blog", async (req, res): Promise<void> => {
  const query = ListBlogPostsQueryParams.safeParse(req.query);
  const page = (query.success && query.data.page) ? query.data.page : 1;
  const limit = (query.success && query.data.limit) ? query.data.limit : 10;
  const offset = (page - 1) * limit;

  const posts = await db
    .select()
    .from(blogPostsTable)
    .where(eq(blogPostsTable.status, "published"))
    .orderBy(desc(blogPostsTable.publishedAt))
    .limit(limit)
    .offset(offset);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(blogPostsTable)
    .where(eq(blogPostsTable.status, "published"));

  res.json(ListBlogPostsResponse.parse({
    posts: serializeArray(posts),
    total: Number(total),
    page,
    limit,
  }));
});

router.get("/blog/pending", async (_req, res): Promise<void> => {
  const posts = await db
    .select()
    .from(blogPostsTable)
    .where(eq(blogPostsTable.status, "pending"))
    .orderBy(desc(blogPostsTable.createdAt));
  res.json(ListPendingBlogPostsResponse.parse(serializeArray(posts)));
});

router.post("/blog/send-otp", async (req, res): Promise<void> => {
  const parsed = SendBlogOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email } = parsed.data;
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.insert(otpCodesTable).values({ email, code, expiresAt });

  req.log.info({ email }, `OTP for blog post submission: ${code}`);

  res.json(SendBlogOtpResponse.parse({ message: `OTP sent to ${email}. For demo purposes, your OTP is: ${code}` }));
});

router.post("/blog/verify-otp", async (req, res): Promise<void> => {
  const parsed = VerifyBlogOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, otp } = parsed.data;
  const now = new Date();

  const [record] = await db
    .select()
    .from(otpCodesTable)
    .where(
      and(
        eq(otpCodesTable.email, email),
        eq(otpCodesTable.code, otp),
        eq(otpCodesTable.verified, false)
      )
    )
    .orderBy(desc(otpCodesTable.createdAt))
    .limit(1);

  if (!record || record.expiresAt < now) {
    res.status(400).json({ error: "Invalid or expired OTP" });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  await db.update(otpCodesTable).set({ verified: true, token }).where(eq(otpCodesTable.id, record.id));

  res.json(VerifyBlogOtpResponse.parse({ token, message: "OTP verified successfully" }));
});

router.get("/blog/slug/:slug", async (req, res): Promise<void> => {
  const params = GetBlogPostBySlugParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [post] = await db
    .select()
    .from(blogPostsTable)
    .where(and(eq(blogPostsTable.slug, params.data.slug), eq(blogPostsTable.status, "published")));

  if (!post) {
    res.status(404).json({ error: "Blog post not found" });
    return;
  }
  res.json(GetBlogPostBySlugResponse.parse(serializeDates(post)));
});

router.post("/blog", async (req, res): Promise<void> => {
  const parsed = CreateBlogPostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { otpToken, ...rest } = parsed.data;

  let isAdminPost = false;
  const cookie = (req as any).cookies?.admin_session;
  if (cookie) {
    try {
      const sessionUser = JSON.parse(cookie);
      if (sessionUser?.role === "admin") isAdminPost = true;
    } catch { /* ignore */ }
  }

  if (!isAdminPost) {
    if (!otpToken) {
      res.status(400).json({ error: "OTP verification required for anonymous posts" });
      return;
    }
    const [otpRecord] = await db
      .select()
      .from(otpCodesTable)
      .where(and(eq(otpCodesTable.token, otpToken), eq(otpCodesTable.verified, true)));
    if (!otpRecord || otpRecord.email !== rest.authorEmail) {
      res.status(400).json({ error: "Invalid OTP token" });
      return;
    }
  }

  const slug = generateSlug(rest.title);
  const [post] = await db.insert(blogPostsTable).values({
    ...rest,
    slug,
    images: rest.images ?? [],
    status: "pending",
    isAdminPost,
  }).returning();

  res.status(201).json(GetBlogPostResponse.parse(serializeDates(post)));
});

router.get("/blog/:id", async (req, res): Promise<void> => {
  const params = GetBlogPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [post] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.id, params.data.id));
  if (!post) {
    res.status(404).json({ error: "Blog post not found" });
    return;
  }
  res.json(GetBlogPostResponse.parse(serializeDates(post)));
});

router.patch("/blog/:id", async (req, res): Promise<void> => {
  const params = UpdateBlogPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBlogPostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [post] = await db
    .update(blogPostsTable)
    .set(parsed.data)
    .where(eq(blogPostsTable.id, params.data.id))
    .returning();
  if (!post) {
    res.status(404).json({ error: "Blog post not found" });
    return;
  }
  res.json(UpdateBlogPostResponse.parse(serializeDates(post)));
});

router.post("/blog/:id/approve", async (req, res): Promise<void> => {
  const params = ApproveBlogPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [post] = await db
    .update(blogPostsTable)
    .set({ status: "published", publishedAt: new Date() })
    .where(eq(blogPostsTable.id, params.data.id))
    .returning();
  if (!post) {
    res.status(404).json({ error: "Blog post not found" });
    return;
  }
  res.json(ApproveBlogPostResponse.parse(serializeDates(post)));
});

// Admin: create and immediately publish a blog post (no OTP needed)
router.post("/admin/blog", async (req, res): Promise<void> => {
  const cookie = (req as any).cookies?.admin_session;
  if (!cookie) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    JSON.parse(cookie);
  } catch { res.status(401).json({ error: "Invalid session" }); return; }

  const { title, summary, content, authorName, images, hashtags, links } = req.body;
  if (!title || !content || !authorName) {
    res.status(400).json({ error: "title, content and authorName are required" });
    return;
  }

  try {
    const slug = generateSlug(title);
    const [post] = await db.insert(blogPostsTable).values({
      title,
      slug,
      content,
      summary: summary || "",
      authorName,
      images: Array.isArray(images) ? images : [],
      hashtags: Array.isArray(hashtags) ? hashtags : [],
      links: Array.isArray(links) ? links : [],
      status: "published",
      isAdminPost: true,
      publishedAt: new Date(),
    }).returning();
    res.status(201).json(serializeDates(post));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create blog post" });
  }
});

router.delete("/blog/:id", async (req, res): Promise<void> => {
  const params = DeleteBlogPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [post] = await db.delete(blogPostsTable).where(eq(blogPostsTable.id, params.data.id)).returning();
  if (!post) {
    res.status(404).json({ error: "Blog post not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
