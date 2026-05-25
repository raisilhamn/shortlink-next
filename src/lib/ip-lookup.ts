export function getClientIP(headers: { get(name: string): string | null }): string {
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

export async function lookupCountry(ip: string): Promise<GeoResult | null> {
  if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return null;
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode,country`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    if (data.status === "success") {
      return { countryCode: data.countryCode, countryName: data.country };
    }
  } catch {
    // silently fail
  }

  return null;
}
