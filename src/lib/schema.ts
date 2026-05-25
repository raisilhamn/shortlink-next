import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull().default(""),
  role: text("role").default("user").notNull(),
  createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
});

export const links = sqliteTable("links", {
  id: text("id").primaryKey(),
  slug: text("slug").unique().notNull(),
  destination: text("destination").notNull(),
  type: text("type", { enum: ["public", "account"] }).notNull(),
  userId: text("user_id").references(() => users.id),
  status: text("status", { enum: ["active", "suspended", "disabled"] }).default("active").notNull(),
  expiresAt: integer("expires_at"),
  createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at"),
});

export const clicks = sqliteTable("clicks", {
  id: text("id").primaryKey(),
  linkId: text("link_id").notNull().references(() => links.id),
  clickedAt: integer("clicked_at").notNull().default(sql`(unixepoch())`),
  countryCode: text("country_code"),
  countryName: text("country_name"),
  refererDomain: text("referer_domain"),
  refererFull: text("referer_full"),
  uaFamily: text("ua_family"),
  ipHash: text("ip_hash"),
});

export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(),
  linkId: text("link_id").notNull().references(() => links.id),
  category: text("category", { enum: ["phishing", "malware", "spam", "adult", "other"] }).notNull(),
  description: text("description"),
  reporterIpHash: text("reporter_ip_hash"),
  status: text("status", { enum: ["pending", "dismissed", "actioned"] }).default("pending").notNull(),
  createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
});

export const slugAliases = sqliteTable("slug_aliases", {
  oldSlug: text("old_slug").primaryKey(),
  linkId: text("link_id").notNull().references(() => links.id),
  retiredAt: integer("retired_at").notNull().default(sql`(unixepoch())`),
});

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  adminId: text("admin_id").notNull(),
  action: text("action").notNull(),
  targetId: text("target_id"),
  note: text("note"),
  createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
});
