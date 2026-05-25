import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { links, auditLog } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  if (!["active", "disabled", "suspended"].includes(status)) {
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

  await db.update(links).set({ status, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(links.id, id));

  const now = Math.floor(Date.now() / 1000);
  await db.insert(auditLog).values({
    id: uuidv4(),
    adminId: (session.user as any).id,
    action: status === "active" ? "restore_link" : `set_${status}`,
    targetId: id,
    note: body.note || null,
    createdAt: now,
  });

  return Response.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const now = Math.floor(Date.now() / 1000);
  await db.insert(auditLog).values({
    id: uuidv4(),
    adminId: (session.user as any).id,
    action: "delete_link",
    targetId: id,
    createdAt: now,
  });

  await db.delete(links).where(eq(links.id, id));

  return Response.json({ success: true });
}
