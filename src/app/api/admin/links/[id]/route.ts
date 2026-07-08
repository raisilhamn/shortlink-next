import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { links, clicks, reports, slugAliases, auditLog } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const LINK_STATUSES = ["active", "disabled", "suspended"] as const;
type LinkStatus = (typeof LINK_STATUSES)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let body: { status?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { status, note } = body;

  if (!status || !LINK_STATUSES.includes(status as LinkStatus)) {
    return Response.json({ error: "Invalid status" }, { status: 422 });
  }

  const link = await db
    .select()
    .from(links)
    .where(eq(links.id, id))
    .limit(1)
    .then((r) => r[0]);

  if (!link) {
    return Response.json({ error: "Link not found" }, { status: 404 });
  }

  const now = Math.floor(Date.now() / 1000);
  await db.transaction(async (tx) => {
    await tx.update(links).set({ status: status as LinkStatus, updatedAt: now }).where(eq(links.id, id));
    await tx.insert(auditLog).values({
      id: uuidv4(),
      adminId: session.user.id,
      action: status === "active" ? "restore_link" : `set_${status}`,
      targetId: id,
      note: note || null,
      createdAt: now,
    });
  });

  return Response.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const link = await db
    .select({ id: links.id })
    .from(links)
    .where(eq(links.id, id))
    .limit(1)
    .then((r) => r[0]);

  if (!link) {
    return Response.json({ error: "Link not found" }, { status: 404 });
  }

  const now = Math.floor(Date.now() / 1000);
  await db.transaction(async (tx) => {
    await tx.delete(clicks).where(eq(clicks.linkId, id));
    await tx.delete(reports).where(eq(reports.linkId, id));
    await tx.delete(slugAliases).where(eq(slugAliases.linkId, id));
    await tx.delete(links).where(eq(links.id, id));
    await tx.insert(auditLog).values({
      id: uuidv4(),
      adminId: session.user.id,
      action: "delete_link",
      targetId: id,
      createdAt: now,
    });
  });

  return Response.json({ success: true });
}
