import { NextRequest } from "next/server";
import { db, isUniqueViolation } from "@/lib/db";
import { users } from "@/lib/schema";
import { registerSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIP } from "@/lib/ip-lookup";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const ip = getClientIP(request.headers);
  if (!(await rateLimit(`register:${ip}`, 3, 3600_000))) {
    return Response.json({ error: "Too many registration attempts. Please try again later." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  try {
    await db.insert(users).values({
      id: uuidv4(),
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      role: "user",
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return Response.json({ error: "Email already registered" }, { status: 409 });
    }
    throw error;
  }

  return Response.json({ success: true }, { status: 201 });
}
