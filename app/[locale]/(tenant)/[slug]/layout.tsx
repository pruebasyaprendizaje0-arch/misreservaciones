import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTenantContext } from '@/lib/tenant-context';
import { getTenantClient } from '@/lib/db/tenant';
import { getLocale, getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { headers } from 'next/headers';

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getTenantContext(slug);
  if (!ctx.tenant) notFound();

  const locale = await getLocale();
  const headerList = await headers();
  const isSubdomain = !!headerList.get('x-tenant-slug');
  const bookingUrl = isSubdomain ? `/${locale}/reservar` : `/${locale}/${slug}/reservar`;

  const t = await getTranslations('common');
  let settingMap: Record<string, string | null> = {};
  if (ctx.dbUrl) {
    try {
      const db = getTenantClient(ctx.dbUrl);
      if (db) {
        const settings = await db.setting.findMany({ where: { key: { in: ['locale', 'currency'] } } });
        settingMap = Object.fromEntries(
          settings.map((s) => [s.key, s.value as string | null])
        );
      }
    } catch (e) {
      console.warn('[TenantLayout] Warning: Could not fetch db settings:', e);
    }
  }
  const businessName = ctx.tenant.name;


  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md transition-all shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            href={isSubdomain ? `/${locale}` : `/${locale}/${slug}`}
            className="flex items-center gap-3 group transition-transform active:scale-95"
          >
            {ctx.tenant.logoUrl ? (
              <img
                src={ctx.tenant.logoUrl}
                alt={businessName}
                className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-xs group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-900 text-white flex items-center justify-center font-black text-base shadow-xs group-hover:scale-105 transition-transform">
                {businessName.charAt(0)}
              </div>
            )}
            <span className="text-base font-extrabold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
              {businessName}
            </span>
          </Link>

          <nav className="flex items-center gap-3 text-sm">
            <Link
              href={bookingUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-indigo-600 px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-slate-900/10 transition-all hover:shadow-indigo-600/20 active:scale-95"
            >
              <span>📅</span>
              <span>{t('title')}</span>
            </Link>
            <div className="border-l border-slate-200 pl-3">
              <LocaleSwitcher currentLocale={locale} />
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200/80 bg-white py-8 text-slate-500">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">{businessName}</span>
            <span>·</span>
            <span>Reservas Directas en Línea</span>
          </div>
          <p>© {new Date().getFullYear()} {businessName}. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
