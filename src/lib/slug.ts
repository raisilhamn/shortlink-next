import { db } from "./db";
import { links } from "./schema";
import { eq } from "drizzle-orm";
import { randomInt } from "crypto";

export function generateNumericSlug(): string {
  return String(randomInt(10000, 99999));
}

export async function generateUniqueSlug(maxAttempts = 10): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const slug = generateNumericSlug();
    const existing = await db.select({ id: links.id }).from(links).where(eq(links.slug, slug)).limit(1);
    if (existing.length === 0) return slug;
  }
  throw new Error("Failed to generate unique slug");
}
