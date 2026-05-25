import { auth } from "./auth";
import { cache } from "react";

export const getSession = cache(async () => {
  return await auth();
});

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if ((session.user as any).role !== "admin") {
    throw new Error("Forbidden");
  }
  return session;
}

export function isAuthorized(error: unknown): error is Error {
  return error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden");
}

export function getUserId(): Promise<string> {
  return getSession().then((s) => {
    if (!s?.user) throw new Error("Unauthorized");
    return (s.user as any).id as string;
  });
}
