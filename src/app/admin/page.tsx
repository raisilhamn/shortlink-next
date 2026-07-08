import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const stats = await db
    .get<{
      totalLinks: number;
      linksToday: number;
      openReports: number;
      suspendedLinks: number;
      clicks7d: number;
    }>(sql`
      SELECT
        (SELECT count(*) FROM links) AS totalLinks,
        (SELECT count(*) FROM links WHERE created_at >= unixepoch() - 86400) AS linksToday,
        (SELECT count(*) FROM reports WHERE status = 'pending') AS openReports,
        (SELECT count(*) FROM links WHERE status = 'suspended') AS suspendedLinks,
        (SELECT count(*) FROM clicks WHERE clicked_at >= unixepoch() - 7 * 86400) AS clicks7d
    `);

  const { totalLinks, linksToday, openReports, suspendedLinks, clicks7d } = stats;

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
        <Link
          href="/admin/reports"
          className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
        >
          <h3 className="font-semibold">Reports</h3>
          <p className="text-sm text-zinc-500 mt-1">Review flagged links</p>
        </Link>
        <Link
          href="/admin/links"
          className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
        >
          <h3 className="font-semibold">All links</h3>
          <p className="text-sm text-zinc-500 mt-1">Search and manage links</p>
        </Link>
        <Link
          href="/admin/audit"
          className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
        >
          <h3 className="font-semibold">Audit log</h3>
          <p className="text-sm text-zinc-500 mt-1">Admin action history</p>
        </Link>
      </nav>
    </div>
  );
}
