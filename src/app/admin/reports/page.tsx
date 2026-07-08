import { db } from "@/lib/db";
import { reports, links } from "@/lib/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { getSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import Link from "next/link";
import ReportList from "./report-list";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const session = await getSession();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const pendingReports = await db
    .select({
      id: reports.id,
      linkId: reports.linkId,
      category: reports.category,
      description: reports.description,
      createdAt: reports.createdAt,
      destination: links.destination,
      slug: links.slug,
      linkStatus: links.status,
      reportCount: sql<number>`(
        SELECT count(*) FROM reports r
        WHERE r.link_id = ${reports.linkId} AND r.status = 'pending'
      )`.as("report_count"),
    })
    .from(reports)
    .innerJoin(links, eq(reports.linkId, links.id))
    .where(and(eq(reports.status, "pending")))
    .orderBy(desc(sql`report_count`), desc(reports.createdAt));

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
        &larr; Back to admin
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">Pending reports</h1>
      <ReportList initialReports={pendingReports} />
    </div>
  );
}
