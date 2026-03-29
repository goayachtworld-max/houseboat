import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, faqsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/faqs", async (_req, res): Promise<void> => {
  const faqs = await db.select().from(faqsTable).orderBy(faqsTable.sortOrder);
  res.json(faqs);
});

router.post("/faqs", async (req, res): Promise<void> => {
  const { question, answer, isActive, sortOrder } = req.body;
  if (!question || !answer) {
    res.status(400).json({ error: "Question and answer are required" });
    return;
  }
  const [faq] = await db.insert(faqsTable).values({
    question,
    answer,
    isActive: isActive ?? true,
    sortOrder: sortOrder ?? 0,
  }).returning();
  res.status(201).json(faq);
});

router.patch("/faqs/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { question, answer, isActive, sortOrder } = req.body;
  const [faq] = await db.update(faqsTable).set({
    ...(question !== undefined && { question }),
    ...(answer !== undefined && { answer }),
    ...(isActive !== undefined && { isActive }),
    ...(sortOrder !== undefined && { sortOrder }),
  }).where(eq(faqsTable.id, id)).returning();
  if (!faq) { res.status(404).json({ error: "FAQ not found" }); return; }
  res.json(faq);
});

router.delete("/faqs/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [faq] = await db.delete(faqsTable).where(eq(faqsTable.id, id)).returning();
  if (!faq) { res.status(404).json({ error: "FAQ not found" }); return; }
  res.sendStatus(204);
});

export default router;
