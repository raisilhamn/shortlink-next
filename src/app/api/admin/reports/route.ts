import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { reports, links } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const pendingReports = await db
    .select({
      id: reports.id,
      linkId: reports.linkId,
      category: reports.category,
      description: reports.description,
      status: reports.status,
      createdAt: reports.createdAt,
      destination: links.destination,
      slug: links.slug,
      linkStatus: links.status,
      reportCount: sql<number>`(SELECT count(*) FROM reports r WHERE r.link_id = ${reports.linkId})`,
    })
    .from(reports)
    .innerJoin(links, eq(reports.linkId, links.id))
    .where(eq(reports.status, "pending"))
    .orderBy(desc(sql`report_count`));

  return Response.json({ reports: pendingReports });
}
