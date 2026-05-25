import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { links } from "@/lib/schema";
import { createPublicLinkSchema } from "@/lib/validations";
import { generateUniqueSlug } from "@/lib/slug";
import { rateLimit } from "@/lib/rate-limit";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  if (!(await rateLimit(`public-link:${ip}`, 10, 60_000))) {
    return Response.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const body = await request.json();
  const parsed = createPublicLinkSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const slug = await generateUniqueSlug();
  const now = Math.floor(Date.now() / 1000);

  await db.insert(links).values({
    id: uuidv4(),
    slug,
    destination: parsed.data.destination,
    type: "public",
    status: "active",
    expiresAt: now + 7 * 24 * 60 * 60,
    createdAt: now,
  });

  return Response.json(
    {
      slug,
      shortUrl: `${request.nextUrl.origin}/s/${slug}`,
      expiresAt: now + 7 * 24 * 60 * 60,
    },
    { status: 201 }
  );
}
