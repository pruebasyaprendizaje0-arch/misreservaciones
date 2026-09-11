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
        {/* Glassmorphic transparent header */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/40 backdrop-blur-md shadow-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
            {/* Logo */}
            <Link href={`/${locale}`} className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xl font-black text-white tracking-tight">
                reserva<span className="text-indigo-400 font-black">ciones</span>
              </span>
            </Link>

            {/* Nav */}
            <nav className="flex items-center gap-5 text-sm">
              <a
                href={`/${locale}#directorio`}
                className="hidden sm:inline-flex items-center gap-1.5 text-white font-extrabold hover:text-indigo-300 transition"
              >
                🔍 Directorio
              </a>
              <a
                href={`/${locale}#planes`}
                className="hidden sm:inline-flex items-center gap-1.5 text-white font-extrabold hover:text-indigo-300 transition"
              >
                💎 Planes & Precios
              </a>
              <Link
                href={`/${locale}/sign-in`}
                className="text-white font-extrabold hover:text-indigo-300 transition"
              >
                {t('signIn')}
              </Link>
              <Link
                href={`/${locale}/sign-up`}
                className="btn-primary text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-none text-white font-black px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition"
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
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-sm shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-white">reservaciones</span>
              </div>
              <p className="text-xs text-slate-400">
                © {new Date().getFullYear()} reservaciones · Directorio de negocios del Ecuador 🇪🇨
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
