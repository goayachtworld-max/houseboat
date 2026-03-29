import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, activitiesTable } from "@workspace/db";
import {
  ListActivitiesResponse,
  UpdateActivityResponse,
  CreateActivityBody,
  UpdateActivityParams,
  UpdateActivityBody,
  DeleteActivityParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/activities", async (_req, res): Promise<void> => {
  const activities = await db
    .select()
    .from(activitiesTable)
    .orderBy(activitiesTable.sortOrder);
  res.json(ListActivitiesResponse.parse(activities));
});

router.post("/activities", async (req, res): Promise<void> => {
  const parsed = CreateActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [activity] = await db.insert(activitiesTable).values({
    ...parsed.data,
    sortOrder: parsed.data.sortOrder ?? 0,
  }).returning();
  res.status(201).json(UpdateActivityResponse.parse(activity));
});

router.patch("/activities/:id", async (req, res): Promise<void> => {
  const params = UpdateActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [activity] = await db
    .update(activitiesTable)
    .set(parsed.data)
    .where(eq(activitiesTable.id, params.data.id))
    .returning();
  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }
  res.json(UpdateActivityResponse.parse(activity));
});

router.delete("/activities/:id", async (req, res): Promise<void> => {
  const params = DeleteActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [activity] = await db.delete(activitiesTable).where(eq(activitiesTable.id, params.data.id)).returning();
  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
