import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, galleryTable } from "@workspace/db";
import {
  ListGalleryResponse,
  ListGalleryQueryParams,
  AddGalleryImageBody,
  DeleteGalleryImageParams,
} from "@workspace/api-zod";
import { serializeArray, serializeDates } from "../lib/serialize";

const router: IRouter = Router();

router.get("/gallery", async (req, res): Promise<void> => {
  const query = ListGalleryQueryParams.safeParse(req.query);
  const images = await db
    .select()
    .from(galleryTable)
    .orderBy(galleryTable.sortOrder);

  let filtered = images;
  if (query.success && query.data.category) {
    filtered = images.filter((img) => img.category === query.data.category);
  }
  res.json(ListGalleryResponse.parse(serializeArray(filtered)));
});

router.post("/gallery", async (req, res): Promise<void> => {
  const parsed = AddGalleryImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [image] = await db.insert(galleryTable).values({
    ...parsed.data,
    sortOrder: parsed.data.sortOrder ?? 0,
  }).returning();
  res.status(201).json(serializeDates(image));
});

router.patch("/gallery/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { caption, category, sortOrder, url } = req.body;
  const updates: Record<string, unknown> = {};
  if (caption !== undefined) updates.caption = caption;
  if (category !== undefined) updates.category = category;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  if (url !== undefined) updates.url = url;
  try {
    const [image] = await db.update(galleryTable).set(updates).where(eq(galleryTable.id, id)).returning();
    if (!image) { res.status(404).json({ error: "Image not found" }); return; }
    res.json(serializeDates(image));
  } catch (err) {
    res.status(500).json({ error: "Failed to update gallery item" });
  }
});

router.delete("/gallery/:id", async (req, res): Promise<void> => {
  const params = DeleteGalleryImageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [image] = await db.delete(galleryTable).where(eq(galleryTable.id, params.data.id)).returning();
  if (!image) {
    res.status(404).json({ error: "Image not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
