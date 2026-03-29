import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";

export const faqsTable = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export type Faq = typeof faqsTable.$inferSelect;
export type InsertFaq = typeof faqsTable.$inferInsert;
