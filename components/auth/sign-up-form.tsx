'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import { MACRO_CATEGORIES, getIndustriesByCategory, IndustryType } from '@/lib/industries';
import { TermsModal } from '@/components/TermsModal';

export function SignUpForm() {
  const t = useTranslations('common');
  const router = useRouter();
  const locale = useLocale();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [industry, setIndustry] = useState<IndustryType>('HOSTAL');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Password rules validation
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const passwordScore = [hasMinLength, hasUpper, hasLower, hasNumber].filter(Boolean).length;
  const isPasswordValid = passwordScore === 4;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!acceptedTerms) {
      setError('Debes aceptar los Términos y Condiciones y la Ley de Protección de Datos Personales (LOPDP) de Ecuador.');
      return;
    }

    if (!isPasswordValid) {
      setError('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.');
      return;
    }

    setLoading(true);

    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, industry, ownerEmail: email, ownerPassword: password }),
    });
    setLoading(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      if (json.issues && Array.isArray(json.issues)) {
        setError(json.issues.map((i: any) => i.message).join(', '));
      } else {
        setError(json.message || json.error || 'Error al crear el negocio');
      }
      return;
    }

    const data = await res.json();
    router.push(`/${locale}/sign-in?created=${encodeURIComponent(data.slug)}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 text-left">
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-indigo-300 mb-1.5" htmlFor="name">
          {locale === 'es' ? 'Nombre del negocio' : 'Business name'} *
        </label>
        <input
          id="name"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 shadow-inner focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition font-medium"
          placeholder="ej. Hostal Sol & Luna u Odontología Smiles"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
        />
      </div>

      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-indigo-300 mb-1.5" htmlFor="slug">
          Subdominio del negocio *
        </label>
        <div className="flex items-center gap-2">
          <input
            id="slug"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 shadow-inner focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition font-medium"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            required
            pattern="[a-z0-9\-]{2,48}"
            placeholder="mi-negocio"
          />
          <span className="text-sm font-black text-indigo-400 shrink-0 bg-slate-950 border border-slate-800 px-3.5 py-3 rounded-xl shadow-inner">
            .{process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ubicame.cc'}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-indigo-300 mb-1.5" htmlFor="industry">
          Tipo de Negocio / Industria *
        </label>
        <select
          id="industry"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition font-bold"
          value={industry}
          onChange={(e) => setIndustry(e.target.value as IndustryType)}
        >
          {(() => {
            const categorized = getIndustriesByCategory();
            return MACRO_CATEGORIES.map((cat) => (
              <optgroup key={cat.key} label={`${cat.icon} ${cat.name}`} className="bg-slate-950 font-black text-indigo-300 py-1">
                {categorized[cat.key].map((ind) => (
                  <option key={ind.key} value={ind.key} className="bg-slate-900 text-white font-medium py-1">
                    {ind.icon} {ind.name}
                  </option>
                ))}
              </optgroup>
            ));
          })()}
        </select>
      </div>

      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-indigo-300 mb-1.5" htmlFor="email">
          {t('email')} del Administrador *
        </label>
        <input
          id="email"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 shadow-inner focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition font-medium"
          type="email"
          placeholder="admin@minegocio.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-indigo-300 mb-1.5" htmlFor="password">
          Contraseña *
        </label>
        <input
          id="password"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 shadow-inner focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition font-medium"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {/* Dynamic Password Strength Indicator */}
        {password.length > 0 && (
          <div className="mt-2.5 space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs shadow-inner">
            <div className="flex items-center justify-between text-slate-200 font-bold">
              <span>Fortaleza de la contraseña:</span>
              <span className={`font-black px-2 py-0.5 rounded-md ${
                passwordScore === 4 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : passwordScore >= 2 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {passwordScore === 4 ? '🔒 Muy Segura' : passwordScore >= 2 ? '⚠️ Media' : '❌ Débil'}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  passwordScore === 4 ? 'w-full bg-emerald-400 shadow-lg shadow-emerald-500/50' : passwordScore === 3 ? 'w-3/4 bg-emerald-400' : passwordScore === 2 ? 'w-1/2 bg-amber-400' : 'w-1/4 bg-rose-500'
                }`}
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1 font-semibold">
              <span className={hasMinLength ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {hasMinLength ? '✓' : '○'} Mínimo 8 caracteres
              </span>
              <span className={hasUpper ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {hasUpper ? '✓' : '○'} 1 Mayúscula (A-Z)
              </span>
              <span className={hasLower ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {hasLower ? '✓' : '○'} 1 Minúscula (a-z)
              </span>
              <span className={hasNumber ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {hasNumber ? '✓' : '○'} 1 Número (0-9)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Ecuadorian Legal Terms & Conditions Checkbox */}
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-4 space-y-2 shadow-inner">
        <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-200 select-none">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-5 w-5 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500 cursor-pointer shrink-0"
            required
          />
          <span className="leading-relaxed font-medium">
            Acepto los{' '}
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="text-indigo-300 font-black underline hover:text-white transition inline"
            >
              Términos de Servicio y Protección de Datos Personales (LOPDP Ecuador)
            </button>
            .
          </span>
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/60 p-3.5 text-xs text-rose-200 font-bold shadow-lg">
          ⚠️ {error}
        </div>
      )}

      <button
        type="submit"
        className="w-full py-4 text-sm font-black rounded-xl shadow-xl transition-all duration-200 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-indigo-600"
        disabled={loading || !acceptedTerms || (password.length > 0 && !isPasswordValid)}
      >
        {loading ? t('loading') : '🚀 Registrar Negocio (Prueba 30 Días)'}
      </button>

      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </form>
  );
}
