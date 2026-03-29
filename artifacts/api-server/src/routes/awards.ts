import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, awardsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/awards", async (_req, res): Promise<void> => {
  const awards = await db
    .select()
    .from(awardsTable)
    .orderBy(awardsTable.sortOrder);
  res.json(awards);
});

router.post("/awards", async (req, res): Promise<void> => {
  const { title, subtitle, image, link, sortOrder, isActive } = req.body;
  if (!title) {
    res.status(400).json({ error: "Title is required" });
    return;
  }
  const [award] = await db.insert(awardsTable).values({
    title,
    subtitle: subtitle || "",
    image: image || null,
    link: link || null,
    sortOrder: sortOrder ?? 0,
    isActive: isActive ?? true,
  }).returning();
  res.status(201).json(award);
});

router.patch("/awards/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { title, subtitle, image, link, sortOrder, isActive } = req.body;
  const [award] = await db
    .update(awardsTable)
    .set({
      ...(title !== undefined && { title }),
      ...(subtitle !== undefined && { subtitle }),
      ...(image !== undefined && { image }),
      ...(link !== undefined && { link }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(isActive !== undefined && { isActive }),
    })
    .where(eq(awardsTable.id, id))
    .returning();
  if (!award) {
    res.status(404).json({ error: "Award not found" });
    return;
  }
  res.json(award);
});

router.delete("/awards/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [award] = await db.delete(awardsTable).where(eq(awardsTable.id, id)).returning();
  if (!award) {
    res.status(404).json({ error: "Award not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
