import { db } from "@/lib/db";
import { auditLog } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const session = await getSession();
  if (!session?.user || (session.user as any).role !== "admin") redirect("/dashboard");

  const logs = await db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <a href="/admin" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
        &larr; Back to admin
      </a>
      <h1 className="text-2xl font-bold mt-2 mb-6">Audit log</h1>

      {logs.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          <p>No admin actions recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{log.action}</span>
                <span className="text-xs text-zinc-400">
                  {new Date(log.createdAt * 1000).toLocaleString()}
                </span>
              </div>
              {log.note && (
                <p className="text-xs text-zinc-500 mt-1">{log.note}</p>
              )}
              <p className="text-xs text-zinc-400 mt-1">
                Admin: {log.adminId.slice(0, 8)}... | Target: {log.targetId?.slice(0, 8) || "N/A"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
