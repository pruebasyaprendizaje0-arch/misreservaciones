'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

export function SignInForm() {
  const t = useTranslations('common');
  const router = useRouter();
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      setLoading(false);

      if (res?.error) {
        setError('Credenciales inválidas. Verifica tu correo y contraseña.');
        return;
      }

      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch (err: any) {
      setLoading(false);
      console.error('[SignInForm] Login error:', err);
      setError('Error al conectar con el servicio de autenticación. Inténtalo de nuevo.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 text-left">
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-indigo-300 mb-1.5" htmlFor="email">
          {t('email')} *
        </label>
        <input
          id="email"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 shadow-inner focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition font-medium"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="tu@correo.com"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-black uppercase tracking-wider text-indigo-300" htmlFor="password">
            Contraseña *
          </label>
          <Link
            href={`/${locale}/forgot-password`}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline transition"
          >
            🔑 ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <input
          id="password"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 shadow-inner focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition font-medium"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/60 p-3.5 text-xs text-rose-200 font-bold shadow-lg">
          ⚠️ {error}
        </div>
      )}

      <button
        type="submit"
        className="w-full py-4 text-sm font-black rounded-xl shadow-xl transition-all duration-200 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={loading}
      >
        {loading ? t('loading') : '🚀 Iniciar Sesión'}
      </button>
    </form>
  );
}
