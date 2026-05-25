import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/auth-helpers";
import SignOutButton from "./signout-button";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "raisilham.com - URL Shortener",
  description: "Shorten links and track analytics",
  icons: {
    icon: { url: "/favicon.svg", type: "image/svg+xml" },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  const user = session?.user as { name?: string; email?: string; role?: string } | undefined;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
            <a href="/" className="font-semibold text-lg tracking-tight shrink-0 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rounded-md p-0.5 bg-white dark:bg-zinc-100 text-zinc-900 dark:text-zinc-900 border border-zinc-300 dark:border-zinc-600">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              shortlink
            </a>
            <nav className="flex items-center gap-2 sm:gap-4 text-sm overflow-x-auto">
              {user ? (
                <>
                  <a href="/dashboard" className="hover:text-zinc-600 dark:hover:text-zinc-400 whitespace-nowrap">Dashboard</a>
                  {user.role === "admin" && (
                    <a href="/admin" className="hover:text-zinc-600 dark:hover:text-zinc-400 whitespace-nowrap">Admin</a>
                  )}
                  <span className="text-zinc-400 dark:text-zinc-600 hidden sm:inline truncate max-w-[120px]">{user.email}</span>
                  <SignOutButton />
                </>
              ) : (
                <>
                  <a href="/login" className="hover:text-zinc-600 dark:hover:text-zinc-400 whitespace-nowrap">Sign in</a>
                  <a href="/register" className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 whitespace-nowrap">
                    Sign up
                  </a>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
