import { z } from "zod";

function isPrivateHostname(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "::1") {
    return true;
  }
  if (hostname.startsWith("10.") || hostname.startsWith("192.168.")) {
    return true;
  }
  const octets = hostname.split(".");
  if (octets[0] === "172") {
    const second = parseInt(octets[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  if (hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    return true;
  }
  return false;
}

const destinationSchema = z
  .string()
  .url("Must be a valid URL")
  .refine((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "URL must use http or https protocol")
  .refine((url) => {
    try {
      const parsed = new URL(url);
      return !isPrivateHostname(parsed.hostname);
    } catch {
      return true;
    }
  }, "Local and private network URLs are not allowed");

export const createPublicLinkSchema = z.object({
  destination: destinationSchema,
});

export const createAccountLinkSchema = z.object({
  destination: destinationSchema,
  slug: z
    .string()
    .regex(/^[a-z0-9-_]+$/, "Slug can only contain lowercase letters, numbers, hyphens, and underscores")
    .min(3, "Slug must be at least 3 characters")
    .max(32, "Slug must be at most 32 characters")
    .optional(),
});

export const updateLinkSchema = z.object({
  destination: destinationSchema.optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-_]+$/, "Slug can only contain lowercase letters, numbers, hyphens, and underscores")
    .min(3)
    .max(32)
    .optional(),
});

export const createReportSchema = z.object({
  linkId: z.string().min(1),
  category: z.enum(["phishing", "malware", "spam", "adult", "other"]),
  description: z.string().max(500).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  inviteCode: z.string().refine(
    // If INVITE_CODE is not configured, registration is closed — an unset
    // env var must not make the empty string a valid invite code.
    (val) => Boolean(process.env.INVITE_CODE) && val === process.env.INVITE_CODE,
    "Invalid invite code"
  ),
});
