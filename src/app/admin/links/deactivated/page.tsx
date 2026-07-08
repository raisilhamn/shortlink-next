import { db } from "@/lib/db";
import { links, clicks } from "@/lib/schema";
import { desc, eq, sql, inArray, getTableColumns } from "drizzle-orm";
import { getSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import Link from "next/link";
import LinkActions from "../link-actions";

export const dynamic = "force-dynamic";

export default async function DeactivatedLinksPage() {
  const session = await getSession();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const inactiveLinks = await db
    .select({
      ...getTableColumns(links),
      clickCount: sql<number>`count(${clicks.id})`,
    })
    .from(links)
    .leftJoin(clicks, eq(clicks.linkId, links.id))
    .where(inArray(links.status, ["disabled", "suspended"]))
    .groupBy(links.id)
    .orderBy(desc(links.createdAt));

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href="/admin/links" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
        &larr; Back to all links
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">Deactivated links</h1>

      {inactiveLinks.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          <p>No deactivated or suspended links.</p>
        </div>
      ) : (
        <div className="-mx-4 sm:mx-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left">
                <th className="pb-3 font-medium text-zinc-500">Slug</th>
                <th className="pb-3 font-medium text-zinc-500">Destination</th>
                <th className="pb-3 font-medium text-zinc-500">Type</th>
                <th className="pb-3 font-medium text-zinc-500">Status</th>
                <th className="pb-3 font-medium text-zinc-500">Clicks</th>
                <th className="pb-3 font-medium text-zinc-500">Created</th>
                <th className="pb-3 font-medium text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inactiveLinks.map((link) => (
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
                        link.status === "suspended"
                          ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"
                          : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                      }`}
                    >
                      {link.status}
                    </span>
                  </td>
                  <td className="py-3 font-mono text-zinc-500">{link.clickCount}</td>
                  <td className="py-3 text-zinc-400 text-xs">
                    {new Date(link.createdAt * 1000).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    <LinkActions linkId={link.id} currentStatus={link.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
