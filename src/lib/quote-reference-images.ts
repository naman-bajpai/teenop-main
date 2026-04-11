import type { QuoteRequest } from "@/types/quote";

/**
 * `image_url` may be a single URL (legacy) or a JSON array string of URLs.
 */
export function parseStoredQuoteImageUrls(raw: string | null | undefined): string[] {
  if (!raw || typeof raw !== "string") return [];
  const t = raw.trim();
  if (t.startsWith("[")) {
    try {
      const parsed = JSON.parse(t) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((u): u is string => typeof u === "string" && u.length > 0);
      }
    } catch {
      return [raw];
    }
  }
  return [raw];
}

export function serializeQuoteImageUrls(urls: string[]): string | null {
  if (urls.length === 0) return null;
  if (urls.length === 1) return urls[0];
  return JSON.stringify(urls);
}

export function getQuoteReferenceImageUrls(
  qr: Pick<QuoteRequest, "image_url" | "reference_image_urls">
): string[] {
  const fromColumn = qr.reference_image_urls;
  if (Array.isArray(fromColumn) && fromColumn.length > 0) {
    return fromColumn.filter((u): u is string => typeof u === "string" && u.length > 0);
  }
  return parseStoredQuoteImageUrls(qr.image_url);
}
