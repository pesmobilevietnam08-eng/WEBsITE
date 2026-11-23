/**
 * Single centralized allowlist for all external URLs rendered in the application.
 * Only standard HTTPS links (no credentials, no custom port) to explicitly approved hosts are permitted.
 */
export const ALLOWED_EXTERNAL_HOSTS: ReadonlySet<string> = new Set(['manabiman.io.vn']);

export function validateExternalUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password || url.port) return null;
    if (!ALLOWED_EXTERNAL_HOSTS.has(url.hostname.toLowerCase())) return null;
    return url.toString();
  } catch {
    return null;
  }
}
