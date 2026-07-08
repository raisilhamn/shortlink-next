import { NextRequest } from "next/server";
import { db, isUniqueViolation } from "@/lib/db";
import { links } from "@/lib/schema";
import { createAccountLinkSchema } from "@/lib/validations";
import { generateUniqueSlug } from "@/lib/slug";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIP } from "@/lib/ip-lookup";
import { auth } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20));
  const offset = (page - 1) * limit;

  const userLinks = await db
    .select()
    .from(links)
    .where(eq(links.userId, session.user.id))
    .orderBy(desc(links.createdAt))
    .limit(limit)
    .offset(offset);

  return Response.json({ links: userLinks, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIP(request.headers);
  const userId = session.user.id;

  if (!(await rateLimit(`create-link:${userId}`, 30, 3600_000))) {
    return Response.json({ error: "Too many links created. Please slow down." }, { status: 429 });
  }
  if (!(await rateLimit(`create-link-ip:${ip}`, 50, 3600_000))) {
    return Response.json({ error: "Too many links created from this IP." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createAccountLinkSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const slug = parsed.data.slug || (await generateUniqueSlug());
  const now = Math.floor(Date.now() / 1000);

  try {
    await db.insert(links).values({
      id: uuidv4(),
      slug,
      destination: parsed.data.destination,
      type: "account",
      userId,
      status: "active",
      createdAt: now,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return Response.json({ error: "Slug already taken" }, { status: 409 });
    }
    throw error;
  }

  return Response.json({ slug, shortUrl: `${request.nextUrl.origin}/s/${slug}` }, { status: 201 });
}
