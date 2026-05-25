import { db } from "@/lib/db";
import { links, clicks, slugAliases } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { getClientIP, lookupCountry } from "@/lib/ip-lookup";
import { v4 as uuidv4 } from "uuid";
import { createHash } from "crypto";

export default async function RedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const link = await db
    .select()
    .from(links)
    .where(eq(links.slug, slug))
    .limit(1)
    .then((r) => r[0]);

  if (!link) {
    const alias = await db
      .select()
      .from(slugAliases)
      .where(eq(slugAliases.oldSlug, slug))
      .limit(1)
      .then((r) => r[0]);

    if (alias) {
      const resolvedLink = await db
        .select()
        .from(links)
        .where(eq(links.id, alias.linkId))
        .limit(1)
        .then((r) => r[0]);

      if (resolvedLink) {
        return redirectOrShowDisclaimer(resolvedLink);
      }
    }

    notFound();
  }

  return redirectOrShowDisclaimer(link);
}

function isValidDestination(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function redirectOrShowDisclaimer(link: {
  id: string;
  slug: string;
  destination: string;
  type: string;
  status: string;
  expiresAt: number | null;
}) {
  if (!isValidDestination(link.destination)) {
    return <InvalidLinkPage />;
  }

  const now = Math.floor(Date.now() / 1000);

  if (link.expiresAt && now > link.expiresAt) {
    return <ExpiredPage />;
  }

  if (link.status === "suspended") {
    return <SuspendedPage />;
  }

  if (link.status === "disabled") {
    return <DisabledPage />;
  }

  const headersList = await headers();
  const ip = getClientIP(headersList);
  const geo = await lookupCountry(ip);

  const referer = headersList.get("referer") || "";
  let refererDomain = "direct";
  let refererFull: string | null = null;
  try {
    if (referer) {
      const parsed = new URL(referer);
      refererDomain = parsed.hostname;
      refererFull = referer;
    }
  } catch {
    // ignore
  }

  const ua = headersList.get("user-agent") || "";
  const uaFamily = ua.split("/")[0] || "Unknown";
  const dailySalt = new Date().toISOString().slice(0, 10);
  const ipHash = createHash("sha256").update(ip + dailySalt).digest("hex");

  await db.insert(clicks).values({
    id: uuidv4(),
    linkId: link.id,
    countryCode: geo?.countryCode || null,
    countryName: geo?.countryName || null,
    refererDomain,
    refererFull,
    uaFamily,
    ipHash,
  });

  if (link.type === "account") {
    if (!isValidDestination(link.destination)) {
      return <InvalidLinkPage />;
    }
    redirect(link.destination);
  }

  return <DisclaimerPage destination={link.destination} slug={link.slug} linkId={link.id} />;
}

function ExpiredPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold mb-3">Link expired</h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-6">
        This public link has expired and is no longer available.
      </p>
      <a href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
        Create a new short link
      </a>
    </div>
  );
}

function SuspendedPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold mb-3">Link under review</h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-6">
        This link has been reported and is currently under review by our team.
      </p>
      <a href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
        Back to homepage
      </a>
    </div>
  );
}

function InvalidLinkPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold mb-3">Invalid link</h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-6">
        This link contains an invalid destination and cannot be opened.
      </p>
      <a href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
        Back to homepage
      </a>
    </div>
  );
}

function DisabledPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold mb-3">Link disabled</h1>
      <p className="text-zinc-500 dark:text-zinc-400">
        This link has been disabled by an administrator.
      </p>
    </div>
  );
}

function DisclaimerPage({ destination, slug, linkId }: { destination: string; slug: string; linkId: string }) {
  return (
    <html lang="en">
      <body>
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">You are leaving raisilham.com</h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              This is a public short link. raisilham.com is not responsible for the content of the destination page.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-6 text-left">
            <p className="text-sm break-all mb-2">
              <span className="text-zinc-400">Destination:</span>{" "}
              <span className="font-mono text-sm">{destination}</span>
            </p>
            <p className="text-sm text-zinc-400">
              <span>Slug:</span> <span className="font-mono">/s/{slug}</span>
            </p>
          </div>

          <div className="space-y-3">
            <a
              href={destination}
              id="proceed-btn"
              className="inline-block w-full py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200"
            >
              Continue anyway
            </a>
            <a
              href={`/report?linkId=${linkId}`}
              className="inline-block text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Report this link
            </a>
          </div>

          <p className="mt-6 text-sm text-zinc-400">
            You will be redirected automatically in <span id="countdown">5</span> seconds.
          </p>
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var seconds = 5;
                var countdownEl = document.getElementById('countdown');
                var interval = setInterval(function() {
                  seconds--;
                  if (countdownEl) countdownEl.textContent = seconds;
                  if (seconds <= 0) {
                    clearInterval(interval);
                    window.location.href = ${JSON.stringify(destination)};
                  }
                }, 1000);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
