import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { links, clicks, reports, slugAliases } from "@/lib/schema";
import { updateLinkSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { and, eq, ne } from "drizzle-orm";

async function findOwnedLink(id: string, userId: string) {
  const link = await db
    .select()
    .from(links)
    .where(eq(links.id, id))
    .limit(1)
    .then((r) => r[0]);

  if (!link) return { error: Response.json({ error: "Not found" }, { status: 404 }) };
  if (link.userId !== userId) return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  return { link };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { link, error } = await findOwnedLink(id, session.user.id);
  if (error) return error;

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
  const { link, error } = await findOwnedLink(id, session.user.id);
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = updateLinkSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const updateData: Partial<typeof links.$inferInsert> = {
    updatedAt: Math.floor(Date.now() / 1000),
  };

  if (parsed.data.destination) {
    updateData.destination = parsed.data.destination;
  }

  const newSlug = parsed.data.slug;
  if (newSlug && newSlug !== link.slug) {
    const taken = await db
      .select({ id: links.id })
      .from(links)
      .where(and(eq(links.slug, newSlug), ne(links.id, id)))
      .limit(1);

    if (taken.length > 0) {
      return Response.json({ error: "Slug already taken" }, { status: 409 });
    }

    await db.transaction(async (tx) => {
      // The new slug is live again, so it must stop being an alias;
      // the old slug becomes (or is refreshed as) an alias of this link.
      await tx.delete(slugAliases).where(eq(slugAliases.oldSlug, newSlug));
      await tx
        .insert(slugAliases)
        .values({ oldSlug: link.slug, linkId: id, retiredAt: Math.floor(Date.now() / 1000) })
        .onConflictDoUpdate({
          target: slugAliases.oldSlug,
          set: { linkId: id, retiredAt: Math.floor(Date.now() / 1000) },
        });
      await tx.update(links).set({ ...updateData, slug: newSlug }).where(eq(links.id, id));
    });

    return Response.json({ success: true });
  }

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
  const { error } = await findOwnedLink(id, session.user.id);
  if (error) return error;

  // clicks/reports/aliases reference the link without ON DELETE CASCADE,
  // so they must go first or the delete fails the FK constraint.
  await db.transaction(async (tx) => {
    await tx.delete(clicks).where(eq(clicks.linkId, id));
    await tx.delete(reports).where(eq(reports.linkId, id));
    await tx.delete(slugAliases).where(eq(slugAliases.linkId, id));
    await tx.delete(links).where(eq(links.id, id));
  });

  return Response.json({ success: true });
}
