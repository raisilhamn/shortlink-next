import { db } from "@/lib/db";
import { links, clicks } from "@/lib/schema";
import { desc, eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLinksPage() {
  const session = await getSession();
  if (!session?.user || (session.user as any).role !== "admin") redirect("/dashboard");

  const allLinks = await db
    .select()
    .from(links)
    .orderBy(desc(links.createdAt))
    .limit(100);

  const clickCounts = await Promise.all(
    allLinks.map(async (link) => {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(clicks)
        .where(eq(clicks.linkId, link.id))
        .then((r) => r[0].count);
      return { linkId: link.id, count };
    })
  );

  const countMap = Object.fromEntries(clickCounts.map((c) => [c.linkId, c.count]));

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <a href="/admin" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
        &larr; Back to admin
      </a>
      <h1 className="text-2xl font-bold mt-2 mb-6">All links</h1>

      <div className="-mx-4 sm:mx-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left">
              <th className="pb-3 font-medium text-zinc-500">Slug</th>
              <th className="pb-3 font-medium text-zinc-500">Destination</th>
              <th className="pb-3 font-medium text-zinc-500">Type</th>
              <th className="pb-3 font-medium text-zinc-500">Status</th>
              <th className="pb-3 font-medium text-zinc-500">Clicks</th>
              <th className="pb-3 font-medium text-zinc-500">Created</th>
            </tr>
          </thead>
          <tbody>
            {allLinks.map((link) => (
              <tr key={link.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-3 font-mono text-blue-600 dark:text-blue-400">
                  /s/{link.slug}
                </td>
                <td className="py-3 max-w-xs truncate text-zinc-500">{link.destination}</td>
                <td className="py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800">
                    {link.type}
                  </span>
                </td>
                <td className="py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      link.status === "active"
                        ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                        : link.status === "suspended"
                        ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"
                        : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                    }`}
                  >
                    {link.status}
                  </span>
                </td>
                <td className="py-3 font-mono text-zinc-500">{countMap[link.id] || 0}</td>
                <td className="py-3 text-zinc-400 text-xs">
                  {new Date(link.createdAt * 1000).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
