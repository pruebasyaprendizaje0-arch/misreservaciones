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

  const requestHeaders = new Headers(req.headers);
  if (effectiveSlug) {
    requestHeaders.set('x-tenant-slug', effectiveSlug);
  } else {
    requestHeaders.set('x-tenant-slug', '');
  }

  const reqWithHeaders = new NextRequest(req, {
    headers: requestHeaders,
  });

  const intlResponse = intlMiddleware(reqWithHeaders);
  // Propagate the tenant header into the i18n response as well
  intlResponse.headers.set('x-tenant-slug', effectiveSlug ?? '');

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
