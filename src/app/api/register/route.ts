import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { registerSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIP } from "@/lib/ip-lookup";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const ip = getClientIP(request.headers);
  if (!(await rateLimit(`register:${ip}`, 3, 3600_000))) {
    return Response.json({ error: "Too many registration attempts. Please try again later." }, { status: 429 });
  }

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1)
    .then((r) => r[0]);

  if (existing) {
    return Response.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await db.insert(users).values({
    id: uuidv4(),
    email: parsed.data.email,
    name: parsed.data.name,
    passwordHash,
    role: "user",
  });

  return Response.json({ success: true }, { status: 201 });
}
