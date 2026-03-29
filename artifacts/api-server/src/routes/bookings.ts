import { Router } from "express";
import { db } from "@workspace/db";
import { bookingsTable, insertBookingSchema } from "@workspace/db/schema";
import { eq, and, gte, lte, gt, or } from "drizzle-orm";
import { serializeDates, serializeArray } from "../lib/serialize";

const router = Router();

// List bookings (admin) — optional ?month=YYYY-MM filter
router.get("/bookings", async (req, res) => {
  try {
    const { month } = req.query;
    let bookings;
    if (month && typeof month === "string") {
      const [year, m] = month.split("-").map(Number);
      const start = `${year}-${String(m).padStart(2, "0")}-01`;
      const endDate = new Date(year, m, 0);
      const end = `${year}-${String(m).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
      bookings = await db
        .select()
        .from(bookingsTable)
        .where(
          and(
            lte(bookingsTable.checkIn, end),
            gte(bookingsTable.checkOut, start)
          )
        )
        .orderBy(bookingsTable.checkIn);
    } else {
      bookings = await db.select().from(bookingsTable).orderBy(bookingsTable.checkIn);
    }
    res.json(serializeArray(bookings));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// Create booking (admin)
router.post("/bookings", async (req, res) => {
  try {
    const parsed = insertBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    }
    const [booking] = await db.insert(bookingsTable).values(parsed.data).returning();
    res.status(201).json(serializeDates(booking));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// Update booking (admin)
router.put("/bookings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const parsed = insertBookingSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    }
    const [booking] = await db
      .update(bookingsTable)
      .set(parsed.data)
      .where(eq(bookingsTable.id, id))
      .returning();
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    res.json(serializeDates(booking));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update booking" });
  }
});

// Delete booking (admin)
router.delete("/bookings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(bookingsTable).where(eq(bookingsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete booking" });
  }
});

// Availability check — returns status for a single date
router.get("/bookings/availability", async (req, res) => {
  try {
    const { date } = req.query as { date?: string };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: "Provide a valid date (YYYY-MM-DD)" });
      return;
    }
    const MAX_GUESTS = 12; // max adults the houseboat can hold
    const bookings = await db
      .select()
      .from(bookingsTable)
      .where(
        and(
          lte(bookingsTable.checkIn, date),
          gt(bookingsTable.checkOut, date),
          or(
            eq(bookingsTable.status, "confirmed"),
            eq(bookingsTable.status, "pending")
          )
        )
      );
    const totalGuests = bookings.reduce((sum, b) => sum + b.guests, 0);
    const bookingCount = bookings.length;
    let status: "available" | "limited" | "full" = "available";
    if (totalGuests >= MAX_GUESTS) status = "full";
    else if (bookingCount > 0) status = "limited";
    res.json({ date, available: status !== "full", bookingCount, totalGuests, maxGuests: MAX_GUESTS, status });
  } catch (err) {
    res.status(500).json({ error: "Failed to check availability" });
  }
});

// Calendar summary — returns per-day status for a month
router.get("/bookings/calendar/:month", async (req, res) => {
  try {
    const { month } = req.params; // YYYY-MM
    const [year, m] = month.split("-").map(Number);
    const daysInMonth = new Date(year, m, 0).getDate();
    const start = `${year}-${String(m).padStart(2, "0")}-01`;
    const end = `${year}-${String(m).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    const bookings = await db
      .select()
      .from(bookingsTable)
      .where(
        and(
          lte(bookingsTable.checkIn, end),
          gte(bookingsTable.checkOut, start),
          or(
            eq(bookingsTable.status, "confirmed"),
            eq(bookingsTable.status, "pending")
          )
        )
      );

    // Build per-day summary
    const days: Record<string, { count: number; guests: number; bookings: typeof bookings }> = {};

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayBookings = bookings.filter(
        (b) => b.checkIn <= dateStr && b.checkOut > dateStr
      );
      days[dateStr] = {
        count: dayBookings.length,
        guests: dayBookings.reduce((sum, b) => sum + b.guests, 0),
        bookings: dayBookings,
      };
    }

    res.json(days);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch calendar" });
  }
});

export default router;
