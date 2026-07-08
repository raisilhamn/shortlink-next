import { getSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login?from=/admin");
  if (session.user.role !== "admin") redirect("/forbidden");
  return <>{children}</>;
}
