import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { links, clicks, reports } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { sql, eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const totalLinks = await db
    .select({ count: sql<number>`count(*)` })
    .from(links)
    .then((r) => r[0].count);

  const todayStart = Math.floor(Date.now() / 1000) - 86400;
  const linksToday = await db
    .select({ count: sql<number>`count(*)` })
    .from(links)
    .where(sql`created_at >= ${todayStart}`)
    .then((r) => r[0].count);

  const openReports = await db
    .select({ count: sql<number>`count(*)` })
    .from(reports)
    .where(eq(reports.status, "pending"))
    .then((r) => r[0].count);

  const suspendedLinks = await db
    .select({ count: sql<number>`count(*)` })
    .from(links)
    .where(eq(links.status, "suspended"))
    .then((r) => r[0].count);

  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
  const clicks7d = await db
    .select({ count: sql<number>`count(*)` })
    .from(clicks)
    .where(sql`clicked_at >= ${sevenDaysAgo}`)
    .then((r) => r[0].count);

  return Response.json({
    totalLinks,
    linksToday,
    openReports,
    suspendedLinks,
    clicks7d,
  });
}
