import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { links, slugAliases } from "@/lib/schema";
import { updateLinkSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as any).id;

  const link = await db
    .select()
    .from(links)
    .where(eq(links.id, id))
    .limit(1)
    .then((r) => r[0]);

  if (!link) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (link.userId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json({ link });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as any).id;

  const link = await db
    .select()
    .from(links)
    .where(eq(links.id, id))
    .limit(1)
    .then((r) => r[0]);

  if (!link) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (link.userId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateLinkSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const updateData: Record<string, any> = {};
  const now = Math.floor(Date.now() / 1000);

  if (parsed.data.destination) {
    updateData.destination = parsed.data.destination;
  }

  if (parsed.data.slug && parsed.data.slug !== link.slug) {
    const existing = await db
      .select({ id: links.id })
      .from(links)
      .where(eq(links.slug, parsed.data.slug))
      .limit(1);

    if (existing.length > 0) {
      return Response.json({ error: "Slug already taken" }, { status: 409 });
    }

    await db.insert(slugAliases).values({
      oldSlug: link.slug,
      linkId: id,
      retiredAt: now,
    });

    updateData.slug = parsed.data.slug;
  }

  updateData.updatedAt = now;
  await db.update(links).set(updateData).where(eq(links.id, id));

  return Response.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as any).id;

  const link = await db
    .select()
    .from(links)
    .where(eq(links.id, id))
    .limit(1)
    .then((r) => r[0]);

  if (!link) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (link.userId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(links).where(eq(links.id, id));

  return Response.json({ success: true });
}
