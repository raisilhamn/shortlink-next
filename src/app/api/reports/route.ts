import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { reports, links } from "@/lib/schema";
import { createReportSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIP } from "@/lib/ip-lookup";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createHash } from "crypto";

export async function POST(request: NextRequest) {
  const ip = getClientIP(request.headers);
  const ipHash = createHash("sha256").update(ip).digest("hex");

  if (!(await rateLimit(`report:${ipHash}`, 3, 86400_000))) {
    return Response.json({ error: "Too many reports. Limit: 3 per 24 hours." }, { status: 429 });
  }

  const body = await request.json();
  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const link = await db
    .select()
    .from(links)
    .where(eq(links.id, parsed.data.linkId))
    .limit(1)
    .then((r) => r[0]);

  if (!link) {
    return Response.json({ error: "Link not found" }, { status: 404 });
  }

  const now = Math.floor(Date.now() / 1000);
  await db.insert(reports).values({
    id: uuidv4(),
    linkId: parsed.data.linkId,
    category: parsed.data.category,
    description: parsed.data.description || null,
    reporterIpHash: ipHash,
    status: "pending",
    createdAt: now,
  });

  const reportCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(reports)
    .where(eq(reports.linkId, parsed.data.linkId))
    .then((r) => r[0].count);

  if (reportCount >= 5) {
    await db
      .update(links)
      .set({ status: "suspended" })
      .where(eq(links.id, parsed.data.linkId));
  }

  return Response.json({ success: true }, { status: 201 });
}
