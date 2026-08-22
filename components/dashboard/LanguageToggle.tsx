'use client';

import { usePathname, useRouter } from 'next/navigation';

export function LanguageToggle({ currentLocale }: { currentLocale: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const isEs = currentLocale === 'es';
  const targetLocale = isEs ? 'en' : 'es';

  function handleSwitch() {
    // Save locale preference in cookie
    document.cookie = `NEXT_LOCALE=${targetLocale}; path=/; max-age=31536000; SameSite=Lax`;

    if (!pathname) {
      router.push(`/${targetLocale}`);
      return;
    }

    // Replace locale in URL pathname
    const segments = pathname.split('/');
    if (segments[1] === 'es' || segments[1] === 'en') {
      segments[1] = targetLocale;
      router.push(segments.join('/'));
    } else {
      router.push(`/${targetLocale}${pathname}`);
    }
  }

  return (
    <button
      onClick={handleSwitch}
      type="button"
      className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-extrabold text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
      title={isEs ? 'Switch to English' : 'Cambiar a Español'}
    >
      <span>{isEs ? '🇺🇸' : '🇪🇸'}</span>
      <span>{isEs ? 'EN' : 'ES'}</span>
    </button>
  );
}
