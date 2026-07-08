interface HeaderReader {
  get(name: string): string | null;
}

export function getClientIP(headers: HeaderReader): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const cfIP = headers.get("cf-connecting-ip");
  if (cfIP) return cfIP;
  const realIP = headers.get("x-real-ip");
  if (realIP) return realIP;
  return "127.0.0.1";
}

export interface GeoResult {
  countryCode: string;
  countryName: string;
}

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

function toGeoResult(code: string): GeoResult | null {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized) || normalized === "XX" || normalized === "T1") {
    return null;
  }
  let countryName = normalized;
  try {
    countryName = countryNames.of(normalized) ?? normalized;
  } catch {
    // keep the raw code if it isn't a valid region
  }
  return { countryCode: normalized, countryName };
}

function isPrivateIP(ip: string): boolean {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("fc") ||
    ip.startsWith("fe80")
  );
}

export async function lookupCountry(ip: string, headers?: HeaderReader): Promise<GeoResult | null> {
  // Vercel and Cloudflare already resolve the country at the edge; trust
  // their headers before falling back to an external lookup.
  const edgeCountry = headers?.get("x-vercel-ip-country") || headers?.get("cf-ipcountry");
  if (edgeCountry) {
    const result = toGeoResult(edgeCountry);
    if (result) return result;
  }

  if (isPrivateIP(ip)) return null;

  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === "success" && typeof data.countryCode === "string") {
      return toGeoResult(data.countryCode);
    }
  } catch {
    // geo lookup is best-effort
  }

  return null;
}
