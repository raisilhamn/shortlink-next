import { db } from "@/lib/db";
import { links, clicks, slugAliases } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { after } from "next/server";
import Link from "next/link";
import { getClientIP, lookupCountry } from "@/lib/ip-lookup";
import { getAppOrigin } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import { createHash } from "crypto";
import QrModal from "@/components/qr-modal";

export default async function RedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let link = await db
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
      link = await db
        .select()
        .from(links)
        .where(eq(links.id, alias.linkId))
        .limit(1)
        .then((r) => r[0]);
    }
  }

  if (!link) notFound();

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

  recordClick(link.id, await headers());

  if (link.type === "account") {
    redirect(link.destination);
  }

  return <DisclaimerPage destination={link.destination} slug={link.slug} linkId={link.id} />;
}

function recordClick(linkId: string, headersList: Headers) {
  // Capture everything from the request now; the insert and geo lookup run
  // in after() so they never delay (or break) the redirect itself.
  const ip = getClientIP(headersList);
  const edgeCountry = headersList.get("x-vercel-ip-country") || headersList.get("cf-ipcountry");
  const referer = headersList.get("referer") || "";
  const ua = headersList.get("user-agent") || "";

  after(async () => {
    try {
      const geo = await lookupCountry(ip, {
        get: (name) => (name === "x-vercel-ip-country" ? edgeCountry : null),
      });

      let refererDomain = "direct";
      let refererFull: string | null = null;
      try {
        if (referer) {
          refererDomain = new URL(referer).hostname;
          refererFull = referer;
        }
      } catch {
        // unparseable referer -> keep "direct"
      }

      const uaFamily = ua.split("/")[0] || "Unknown";
      const dailySalt = new Date().toISOString().slice(0, 10);
      const ipHash = createHash("sha256").update(ip + dailySalt).digest("hex");

      await db.insert(clicks).values({
        id: uuidv4(),
        linkId,
        countryCode: geo?.countryCode || null,
        countryName: geo?.countryName || null,
        refererDomain,
        refererFull,
        uaFamily,
        ipHash,
      });
    } catch (error) {
      console.error("Failed to record click", error);
    }
  });
}

function ExpiredPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold mb-3">Link expired</h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-6">
        This public link has expired and is no longer available.
      </p>
      <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
        Create a new short link
      </Link>
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
      <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
        Back to homepage
      </Link>
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
      <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
        Back to homepage
      </Link>
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
  const origin = getAppOrigin();
  // Escape "<" so a destination containing "</script>" can't terminate the
  // inline script block and inject markup.
  const safeDestination = JSON.stringify(destination).replace(/</g, "\\u003c");
  return (
    <>
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
          <Link
            href={`/report?linkId=${linkId}`}
            className="inline-block text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            Report this link
          </Link>
          <div className="mt-4">
            <QrModal url={`${origin}/s/${slug}`} slug={slug} />
          </div>
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
                  window.location.href = ${safeDestination};
                }
              }, 1000);
            })();
          `,
        }}
      />
    </>
  );
}
