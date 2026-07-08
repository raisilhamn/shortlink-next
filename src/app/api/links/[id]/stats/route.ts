import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { links, clicks } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { and, eq, gte, sql, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const link = await db
    .select()
    .from(links)
    .where(eq(links.id, id))
    .limit(1)
    .then((r) => r[0]);

  if (!link) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (link.userId !== session.user.id && session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get("days") || "90", 10) || 90));
  const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
  const inRange = and(eq(clicks.linkId, id), gte(clicks.clickedAt, cutoff));

  const totals = await db
    .select({
      total: sql<number>`count(*)`,
      unique: sql<number>`count(DISTINCT ${clicks.ipHash})`,
    })
    .from(clicks)
    .where(inRange)
    .then((r) => r[0]);

  const byCountry = await db
    .select({
      countryCode: clicks.countryCode,
      countryName: clicks.countryName,
      count: sql<number>`count(*)`,
    })
    .from(clicks)
    .where(inRange)
    .groupBy(clicks.countryCode, clicks.countryName)
    .orderBy(desc(sql`count(*)`));

  const byReferrer = await db
    .select({
      domain: clicks.refererDomain,
      count: sql<number>`count(*)`,
    })
    .from(clicks)
    .where(inRange)
    .groupBy(clicks.refererDomain)
    .orderBy(desc(sql`count(*)`))
    .limit(20);

  const day = sql<string>`date(${clicks.clickedAt}, 'unixepoch')`;
  const byDay = await db
    .select({
      date: day,
      count: sql<number>`count(*)`,
    })
    .from(clicks)
    .where(inRange)
    .groupBy(day)
    .orderBy(day);

  return Response.json({
    totalClicks: totals.total,
    uniqueVisitors: totals.unique,
    byCountry,
    byReferrer,
    byDay,
  });
}
