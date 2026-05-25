import { db } from "@/lib/db";
import { links, clicks } from "@/lib/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import Link from "next/link";
import CopyButton from "@/components/copy-button";
import QrModal from "@/components/qr-modal";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;

  const userLinks = await db
    .select()
    .from(links)
    .where(eq(links.userId, userId))
    .orderBy(desc(links.createdAt));

  const clickCounts = await Promise.all(
    userLinks.map(async (link) => {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(clicks)
        .where(eq(clicks.linkId, link.id))
        .then((r) => r[0].count);
      return { linkId: link.id, count };
    })
  );

  const countMap = Object.fromEntries(clickCounts.map((c) => [c.linkId, c.count]));
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://shortlink-next-sigma.vercel.app";

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <h1 className="text-2xl font-bold">My Links</h1>
        <Link
          href="/dashboard/new"
          className="w-full sm:w-auto text-center px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200"
        >
          New link
        </Link>
      </div>

      {userLinks.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          <p className="text-lg mb-2">No links yet</p>
          <p className="text-sm">Create your first short link to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {userLinks.map((link) => (
            <div
              key={link.id}
              className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        link.status === "active"
                          ? "bg-green-500"
                          : link.status === "suspended"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                    />
                    <a
                      href={`/s/${link.slug}`}
                      target="_blank"
                      className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      /s/{link.slug}
                    </a>
                    <span className="text-xs text-zinc-400 px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800">
                      {link.type}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                    {link.destination}
                  </p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <p className="text-lg font-semibold">{countMap[link.id] || 0}</p>
                  <p className="text-xs text-zinc-400">clicks</p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <CopyButton text={`${origin}/s/${link.slug}`} />
                <QrModal url={`${origin}/s/${link.slug}`} slug={link.slug} />
                <Link
                  href={`/dashboard/${link.id}/stats`}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-xs font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700"
                >
                  Stats
                </Link>
                <Link
                  href={`/dashboard/${link.id}/edit`}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-xs font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
