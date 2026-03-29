import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, packagesTable } from "@workspace/db";
import {
  ListPackagesResponse,
  GetPackageResponse,
  GetPackageParams,
  CreatePackageBody,
  UpdatePackageParams,
  UpdatePackageBody,
  UpdatePackageResponse,
  DeletePackageParams,
} from "@workspace/api-zod";
import { serializeArray, serializeDates } from "../lib/serialize";

const router: IRouter = Router();

router.get("/packages", async (_req, res): Promise<void> => {
  const packages = await db
    .select()
    .from(packagesTable)
    .orderBy(packagesTable.sortOrder);
  res.json(ListPackagesResponse.parse(serializeArray(packages)));
});

router.post("/packages", async (req, res): Promise<void> => {
  const parsed = CreatePackageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [pkg] = await db.insert(packagesTable).values({
    ...parsed.data,
    inclusions: parsed.data.inclusions ?? [],
    images: parsed.data.images ?? [],
    sortOrder: parsed.data.sortOrder ?? 0,
  }).returning();
  res.status(201).json(GetPackageResponse.parse(serializeDates(pkg)));
});

router.get("/packages/:id", async (req, res): Promise<void> => {
  const params = GetPackageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, params.data.id));
  if (!pkg) {
    res.status(404).json({ error: "Package not found" });
    return;
  }
  res.json(GetPackageResponse.parse(serializeDates(pkg)));
});

router.patch("/packages/:id", async (req, res): Promise<void> => {
  const params = UpdatePackageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePackageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [pkg] = await db
    .update(packagesTable)
    .set(parsed.data)
    .where(eq(packagesTable.id, params.data.id))
    .returning();
  if (!pkg) {
    res.status(404).json({ error: "Package not found" });
    return;
  }
  res.json(UpdatePackageResponse.parse(serializeDates(pkg)));
});

router.delete("/packages/:id", async (req, res): Promise<void> => {
  const params = DeletePackageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [pkg] = await db.delete(packagesTable).where(eq(packagesTable.id, params.data.id)).returning();
  if (!pkg) {
    res.status(404).json({ error: "Package not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
