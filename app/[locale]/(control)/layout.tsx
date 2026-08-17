import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getLocale } from 'next-intl/server';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { FullPageBackgroundVideo } from '@/components/FullPageBackgroundVideo';

export default async function ControlLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('common');
  const locale = await getLocale();

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950">
      {/* Background Video rendered at absolute z-0 */}
      <FullPageBackgroundVideo />

      {/* Main layout container wrapped in relative z-10 */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* Dark & Transparent glassmorphic header */}
        <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/40 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            {/* Logo */}
            <Link href={`/${locale}`} className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-black text-white shadow-sm">
                R
              </div>
              <span className="text-lg font-extrabold text-white tracking-tight">
                misreserva<span className="text-indigo-400">ciones</span>
              </span>
            </Link>

            {/* Nav */}
            <nav className="flex items-center gap-4 text-sm">
              <a
                href={`/${locale}#directorio`}
                className="hidden sm:inline-flex items-center gap-1 text-slate-300 font-medium hover:text-indigo-400 transition"
              >
                🔍 Directorio
              </a>
              <Link
                href={`/${locale}/sign-in`}
                className="text-slate-300 font-medium hover:text-white transition"
              >
                {t('signIn')}
              </Link>
              <Link
                href={`/${locale}/sign-up`}
                className="btn-primary text-sm bg-indigo-600 hover:bg-indigo-500 border-none text-white shadow-sm"
              >
                {t('signUp')}
              </Link>
              <LocaleSwitcher currentLocale={locale} />
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        {/* Dark & Transparent glassmorphic footer */}
        <footer className="border-t border-white/5 bg-slate-950/30 backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-black text-white">R</div>
                <span className="text-sm font-bold text-white">misreservaciones</span>
              </div>
              <p className="text-xs text-slate-400">
                © {new Date().getFullYear()} misreservaciones · Directorio de negocios del Ecuador 🇪🇨
              </p>
              <div className="flex gap-4 text-xs text-slate-300">
                <Link href={`/${locale}/sign-up`} className="hover:text-indigo-400 transition">Registrar negocio</Link>
                <Link href={`/${locale}/sign-in`} className="hover:text-indigo-400 transition">Iniciar sesión</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
