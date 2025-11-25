/**
 * Shared utility functions for Stripe Connect
 * Ensures redirect URI is constructed consistently across setup and callback routes
 */

/**
 * Normalize and get base URL for Stripe Connect
 * This must be used consistently in both setup and callback routes
 */
export function getStripeConnectBaseUrl(): string {
  let baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim();
  
  // Normalize the URL - handle various formats
  // Remove any duplicate https:// prefixes
  baseUrl = baseUrl.replace(/^https?:\/\/https?:\/\//, 'https://');
  // Remove trailing slashes
  baseUrl = baseUrl.replace(/\/+$/, '');
  // Ensure it starts with a protocol
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }
  
  return baseUrl;
}

/**
 * Get the Stripe Connect callback redirect URI
 * This MUST match exactly in both:
 * 1. The OAuth authorization URL (setup route)
 * 2. The token exchange request (callback route)
 * 3. The redirect URI in Stripe Dashboard
 */
export function getStripeConnectRedirectUri(): string {
  const baseUrl = getStripeConnectBaseUrl();
  // Construct redirect URI - ensure no double slashes (except after protocol)
  const redirectUri = `${baseUrl}/api/stripe/connect/callback`.replace(/([^:]\/)\/+/g, '$1');
  return redirectUri;
}

