import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { links, clicks } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as any).id;

  const link = await db
    .select()
    .from(links)
    .where(eq(links.id, id))
    .limit(1)
    .then((r) => r[0]);

  if (!link) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (link.userId !== userId && (session.user as any).role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "90");
  const cutoff = Math.floor(Date.now() / 1000) - days * 86400;

  const totalClicks = await db
    .select({ count: sql<number>`count(*)` })
    .from(clicks)
    .where(sql`${clicks.linkId} = ${id} AND ${clicks.clickedAt} >= ${cutoff}`)
    .then((r) => r[0].count);

  const uniqueVisitors = await db
    .select({ count: sql<number>`count(DISTINCT ${clicks.ipHash})` })
    .from(clicks)
    .where(sql`${clicks.linkId} = ${id} AND ${clicks.clickedAt} >= ${cutoff}`)
    .then((r) => r[0].count);

  const byCountry = await db
    .select({
      countryCode: clicks.countryCode,
      countryName: clicks.countryName,
      count: sql<number>`count(*)`,
    })
    .from(clicks)
    .where(sql`${clicks.linkId} = ${id} AND ${clicks.clickedAt} >= ${cutoff}`)
    .groupBy(clicks.countryCode)
    .orderBy(sql`count(*) desc`);

  const byReferrer = await db
    .select({
      domain: clicks.refererDomain,
      count: sql<number>`count(*)`,
    })
    .from(clicks)
    .where(sql`${clicks.linkId} = ${id} AND ${clicks.clickedAt} >= ${cutoff}`)
    .groupBy(clicks.refererDomain)
    .orderBy(sql`count(*) desc`)
    .limit(20);

  const byDay = await db
    .select({
      date: sql<string>`date(${clicks.clickedAt}, 'unixepoch')`,
      count: sql<number>`count(*)`,
    })
    .from(clicks)
    .where(sql`${clicks.linkId} = ${id} AND ${clicks.clickedAt} >= ${cutoff}`)
    .groupBy(sql`date(${clicks.clickedAt}, 'unixepoch')`)
    .orderBy(sql`date(${clicks.clickedAt}, 'unixepoch') desc`);

  return Response.json({
    totalClicks,
    uniqueVisitors,
    byCountry,
    byReferrer,
    byDay: byDay.reverse(),
  });
}
