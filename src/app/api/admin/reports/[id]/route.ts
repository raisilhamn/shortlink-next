import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { reports, auditLog } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let body: { action?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { action, note } = body;

  if (action !== "dismissed" && action !== "actioned") {
    return Response.json({ error: "Invalid action. Use 'dismissed' or 'actioned'." }, { status: 422 });
  }

  const report = await db
    .select()
    .from(reports)
    .where(eq(reports.id, id))
    .limit(1)
    .then((r) => r[0]);

  if (!report) {
    return Response.json({ error: "Report not found" }, { status: 404 });
  }

  const now = Math.floor(Date.now() / 1000);
  await db.transaction(async (tx) => {
    await tx.update(reports).set({ status: action }).where(eq(reports.id, id));
    await tx.insert(auditLog).values({
      id: uuidv4(),
      adminId: session.user.id,
      action: action === "dismissed" ? "dismiss_report" : "action_report",
      targetId: id,
      note: note || null,
      createdAt: now,
    });
  });

  return Response.json({ success: true });
}
