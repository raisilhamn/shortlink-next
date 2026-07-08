import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
  url: process.env.DATABASE_URL || "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

export function isUniqueViolation(error: unknown): boolean {
  // Drizzle wraps the driver error, so walk the cause chain.
  let current: unknown = error;
  for (let depth = 0; current instanceof Error && depth < 5; depth++) {
    if (
      /UNIQUE constraint failed/i.test(current.message) ||
      ("code" in current && String(current.code).startsWith("SQLITE_CONSTRAINT"))
    ) {
      return true;
    }
    current = current.cause;
  }
  return false;
}
