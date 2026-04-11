import { NextResponse } from "next/server";

/** Max attempts per IP per window for sensitive auth routes */
export const AUTH_RATE_LIMIT_MAX = 5;
/** Sliding window length (ms) */
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export const RATE_LIMIT_ERROR_CODE = "RATE_LIMITED" as const;

type Bucket = number[];

const buckets = new Map<string, Bucket>();

function pruneBucket(stamps: number[], now: number, windowMs: number): number[] {
  return stamps.filter((t) => now - t < windowMs);
}

/**
 * Sliding-window rate limit. Not distributed — each server instance has its own memory.
 * Suitable for single-node or low-traffic; use Redis/Upstash for strict multi-instance limits.
 */
export function rateLimitSlidingWindow(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  let stamps = buckets.get(key) ?? [];
  stamps = pruneBucket(stamps, now, windowMs);

  if (stamps.length >= max) {
    const oldest = stamps[0]!;
    const retryAfterMs = Math.max(0, windowMs - (now - oldest));
    buckets.set(key, stamps);
    return { allowed: false, retryAfterSec: Math.ceil(retryAfterMs / 1000) || 1 };
  }

  stamps.push(now);
  buckets.set(key, stamps);
  return { allowed: true, retryAfterSec: 0 };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

function formatRetryMessage(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.ceil(seconds / 3600);
    return `Too many attempts. Try again in about ${h} hour${h === 1 ? "" : "s"}.`;
  }
  if (seconds >= 60) {
    const m = Math.ceil(seconds / 60);
    return `Too many attempts. Try again in about ${m} minute${m === 1 ? "" : "s"}.`;
  }
  return `Too many attempts. Try again in ${seconds} second${seconds === 1 ? "" : "s"}.`;
}

export function rateLimitJsonResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    {
      error: formatRetryMessage(retryAfterSec),
      code: RATE_LIMIT_ERROR_CODE,
      retryAfterSec,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    }
  );
}

/** Returns a 429 NextResponse if limited; otherwise null (caller continues). */
export function enforceAuthRateLimit(request: Request, namespace: string): NextResponse | null {
  const ip = getClientIp(request);
  const key = `${namespace}:${ip}`;
  const { allowed, retryAfterSec } = rateLimitSlidingWindow(
    key,
    AUTH_RATE_LIMIT_MAX,
    AUTH_RATE_LIMIT_WINDOW_MS
  );
  if (!allowed) return rateLimitJsonResponse(retryAfterSec);
  return null;
}
