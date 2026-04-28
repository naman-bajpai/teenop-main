const DEFAULT_SCHOOL_EMAIL_PATTERNS: RegExp[] = [
  /\.edu$/i,
  /\.k12\.[a-z]{2}\.us$/i,
];

function parseConfiguredDomains(): string[] {
  const raw =
    process.env.NEXT_PUBLIC_SCHOOL_EMAIL_DOMAINS ||
    process.env.SCHOOL_EMAIL_DOMAINS ||
    "";

  return raw
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean)
    .map((domain) => domain.replace(/^@/, ""));
}

export function isSchoolEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === normalized.length - 1) return false;

  const domain = normalized.slice(atIndex + 1);
  const configuredDomains = parseConfiguredDomains();

  if (configuredDomains.length > 0) {
    return configuredDomains.some(
      (allowed) => domain === allowed || domain.endsWith(`.${allowed}`)
    );
  }

  return DEFAULT_SCHOOL_EMAIL_PATTERNS.some((pattern) => pattern.test(domain));
}
