import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { extractSlugFromHost } from './lib/subdomain';
import { locales, defaultLocale } from './lib/i18n';

const intlMiddleware = createIntlMiddleware({
  locales: locales as unknown as string[],
  defaultLocale,
  localePrefix: 'always',
  localeDetection: true,
});

export default function middleware(req: NextRequest) {
  const rootDomain = process.env.ROOT_DOMAIN || 'tusreservas.com';
  const slug = extractSlugFromHost(req.headers.get('host'), rootDomain);

  // In dev, allow ?tenant=<slug> override
  const enableOverride = process.env.ENABLE_TENANT_QUERY_PARAM === '1';
  const overrideSlug = enableOverride ? req.nextUrl.searchParams.get('tenant') : null;
  const effectiveSlug = overrideSlug || slug;

  // Inject the tenant slug into request headers for RSC/layout consumption
  const requestHeaders = new Headers(req.headers);
  if (effectiveSlug) {
    requestHeaders.set('x-tenant-slug', effectiveSlug);
  } else {
    requestHeaders.set('x-tenant-slug', '');
  }

  const intlResponse = intlMiddleware(req);
  // Propagate the tenant header into the i18n response as well
  intlResponse.headers.set('x-tenant-slug', effectiveSlug ?? '');

  // For tenants, always force the default locale on their booking flow
  // (can be overridden per-customer via cookie `NEXT_LOCALE` later)
  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
