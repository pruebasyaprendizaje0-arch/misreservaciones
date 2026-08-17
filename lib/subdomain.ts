const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'admin', 'api', 'static', 'mail', 'cdn']);

/**
 * Extracts the tenant slug from a host header.
 * Examples:
 *   acme.tusreservas.com  -> "acme"
 *   tusreservas.com       -> null
 *   www.tusreservas.com   -> null
 *   localhost:3000        -> null
 */
export function extractSlugFromHost(host: string | null, rootDomain: string): string | null {
  if (!host) return null;
  const hostname = host.split(':')[0].toLowerCase();
  if (!hostname) return null;
  if (hostname === rootDomain.toLowerCase()) return null;
  if (hostname === `www.${rootDomain.toLowerCase()}`) return null;
  if (RESERVED_SUBDOMAINS.has(hostname)) return null;

  if (hostname.endsWith(`.${rootDomain.toLowerCase()}`)) {
    const sub = hostname.slice(0, -1 * (rootDomain.length + 1));
    if (sub && !sub.includes('.')) return sub;
  }

  // Local development: support <slug>.localhost
  if (hostname.endsWith('.localhost')) {
    const sub = hostname.slice(0, -'.localhost'.length);
    if (sub && !sub.includes('.') && !RESERVED_SUBDOMAINS.has(sub)) return sub;
  }

  return null;
}
