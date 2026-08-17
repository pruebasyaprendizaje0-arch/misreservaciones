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
  const db = getTenantClient(ctx.dbUrl!);
  const settings = await db.setting.findMany({ where: { key: { in: ['locale', 'currency'] } } });
  const settingMap = Object.fromEntries(
    settings.map((s) => [s.key, s.value as string | null])
  );
  const businessName = ctx.tenant.name;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href={isSubdomain ? `/${locale}` : `/${locale}/${slug}`} className="text-lg font-semibold text-slate-900">
            {businessName}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href={bookingUrl} className="btn-primary">
              {t('title')}
            </Link>
            <LocaleSwitcher currentLocale={locale} />
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} {businessName}
        </div>
      </footer>
    </div>
  );
}
