import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  siteName: text("site_name").notNull().default("Goa Houseboat"),
  tagline: text("tagline").notNull().default("Luxury Floating Experience in Goa"),
  heroTitle: text("hero_title").notNull().default("Experience Goa From The Water"),
  heroSubtitle: text("hero_subtitle").notNull().default("Luxury houseboat stay with 3 private bedrooms, rooftop dining, and thrilling water activities"),
  heroImage: text("hero_image").notNull().default(""),
  whatsappNumber: text("whatsapp_number").notNull().default("919876543210"),
  inquiryEmail: text("inquiry_email").notNull().default("booking@goahouseboat.com"),
  socialInstagram: text("social_instagram"),
  socialFacebook: text("social_facebook"),
  socialYoutube: text("social_youtube"),
  trailVideoUrl: text("trail_video_url"),
  trailTitle: text("trail_title").notNull().default("Our Trail"),
  trailDescription: text("trail_description").notNull().default("Take a virtual tour of our regular cruise route. Watch as we navigate through mangroves, local fishing villages, and open waters."),
  aboutText: text("about_text").notNull().default("Welcome to our luxury houseboat experience in Goa. Nestled on the serene backwaters, our houseboat offers an unparalleled blend of comfort and adventure. With 3 beautifully appointed bedrooms, a rooftop restaurant with live cooking, and a range of exciting water activities, we promise memories that will last a lifetime."),
  aboutImages: text("about_images").array().notNull().default([]),
  siteLogo: text("site_logo").notNull().default(""),
  navHiddenItems: text("nav_hidden_items").array().notNull().default([]),
  smtpHost: text("smtp_host").notNull().default(""),
  smtpPort: text("smtp_port").notNull().default("587"),
  smtpUser: text("smtp_user").notNull().default(""),
  smtpPass: text("smtp_pass").notNull().default(""),
  smtpFrom: text("smtp_from").notNull().default(""),
  smtpSecure: text("smtp_secure").notNull().default("false"),
  notifyEmail: text("notify_email").notNull().default(""),
  showChatWidget: text("show_chat_widget").notNull().default("true"),
  chatWidgetColor: text("chat_widget_color").notNull().default("#10b981"),
  chatWidgetAlignment: text("chat_widget_alignment").notNull().default("right"),
  showWhatsappButton: text("show_whatsapp_button").notNull().default("true"),
  locationMapUrl: text("location_map_url"),
  dbType: text("db_type").notNull().default("postgresql"),
  dbHost: text("db_host").notNull().default(""),
  dbPort: text("db_port").notNull().default("3306"),
  dbName: text("db_name").notNull().default(""),
  dbUser: text("db_user").notNull().default(""),
  dbPass: text("db_pass").notNull().default(""),
  deployDomain: text("deploy_domain").notNull().default(""),
  uploadRootPath: text("upload_root_path").notNull().default("/home/youruser/public_html/uploads"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true, updatedAt: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;

export const adminUsersTable = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"),
  displayName: text("display_name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdminUser = typeof adminUsersTable.$inferSelect;
