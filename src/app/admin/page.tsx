import { db } from "@/lib/db";
import { links, clicks, reports } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session?.user || (session.user as any).role !== "admin") redirect("/dashboard");

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-8">Admin dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <p className="text-2xl font-bold">{totalLinks}</p>
          <p className="text-sm text-zinc-500">Total links</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <p className="text-2xl font-bold">{linksToday}</p>
          <p className="text-sm text-zinc-500">Created today</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{openReports}</p>
          <p className="text-sm text-zinc-500">Open reports</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{suspendedLinks}</p>
          <p className="text-sm text-zinc-500">Suspended</p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-6">
        <p className="text-sm text-zinc-500">Clicks (last 7 days)</p>
        <p className="text-3xl font-bold mt-1">{clicks7d}</p>
      </div>

      <nav className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a
          href="/admin/reports"
          className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
        >
          <h3 className="font-semibold">Reports</h3>
          <p className="text-sm text-zinc-500 mt-1">Review flagged links</p>
        </a>
        <a
          href="/admin/links"
          className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
        >
          <h3 className="font-semibold">All links</h3>
          <p className="text-sm text-zinc-500 mt-1">Search and manage links</p>
        </a>
        <a
          href="/admin/audit"
          className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
        >
          <h3 className="font-semibold">Audit log</h3>
          <p className="text-sm text-zinc-500 mt-1">Admin action history</p>
        </a>
      </nav>
    </div>
  );
}
