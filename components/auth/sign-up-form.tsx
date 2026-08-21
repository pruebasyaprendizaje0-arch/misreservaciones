'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

const INDUSTRIES = [
  { value: 'HOSTAL', labelEs: '🏨 Hostal / Alojamiento', labelEn: 'Hostel / Lodging' },
  { value: 'MASAJE', labelEs: '💆 Masajes / Spa', labelEn: 'Massage / Spa' },
  { value: 'PELUQUERIA', labelEs: '💈 Peluquería / Estética', labelEn: 'Hair Salon / Barber' },
  { value: 'MEDICO', labelEs: '🩺 Centro Médico u Odontológico', labelEn: 'Medical / Dental Center' },
] as const;

export function SignUpForm() {
  const t = useTranslations('common');
  const router = useRouter();
  const locale = useLocale();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [industry, setIndustry] = useState<'HOSTAL' | 'MASAJE' | 'PELUQUERIA' | 'MEDICO'>('HOSTAL');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label text-slate-200 font-semibold" htmlFor="name">
          {locale === 'es' ? 'Nombre del negocio' : 'Business name'}
        </label>
        <input
          id="name"
          className="input bg-slate-900/60 border-slate-700 text-white placeholder-slate-400 focus:border-indigo-500"
          placeholder="ej. Hostal Sol & Luna u Odontología Smiles"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
        />
      </div>
      <div>
        <label className="label text-slate-200 font-semibold" htmlFor="slug">
          Subdominio del negocio
        </label>
        <div className="flex items-center gap-2">
          <input
            id="slug"
            className="input bg-slate-900/60 border-slate-700 text-white placeholder-slate-400 focus:border-indigo-500"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            required
            pattern="[a-z0-9\-]{2,48}"
            placeholder="mi-negocio"
          />
          <span className="text-sm font-bold text-indigo-400 shrink-0">
            .{process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ubicame.cc'}
          </span>
        </div>
      </div>
      <div>
        <label className="label text-slate-200 font-semibold" htmlFor="industry">
          Tipo de Negocio / Industria
        </label>
        <select
          id="industry"
          className="input bg-slate-900/60 border-slate-700 text-white focus:border-indigo-500"
          value={industry}
          onChange={(e) => setIndustry(e.target.value as typeof industry)}
        >
          {INDUSTRIES.map((i) => (
            <option key={i.value} value={i.value} className="bg-slate-900 text-white">
              {locale === 'es' ? i.labelEs : i.labelEn}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label text-slate-200 font-semibold" htmlFor="email">
          {t('email')} del Administrador
        </label>
        <input
          id="email"
          className="input bg-slate-900/60 border-slate-700 text-white placeholder-slate-400 focus:border-indigo-500"
          type="email"
          placeholder="admin@minegocio.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label text-slate-200 font-semibold" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          className="input bg-slate-900/60 border-slate-700 text-white placeholder-slate-400 focus:border-indigo-500"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        
        {/* Dynamic Password Strength Indicator */}
        {password.length > 0 && (
          <div className="mt-2 space-y-1.5 rounded-xl border border-white/10 bg-slate-950/40 p-3 text-xs">
            <div className="flex items-center justify-between text-slate-300 font-medium">
              <span>Fortaleza de la contraseña:</span>
              <span className={`font-bold ${
                passwordScore === 4 ? 'text-emerald-400' : passwordScore >= 2 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {passwordScore === 4 ? '🔒 Muy Segura' : passwordScore >= 2 ? '⚠️ Media' : '❌ Débil'}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  passwordScore === 4 ? 'w-full bg-emerald-500' : passwordScore === 3 ? 'w-3/4 bg-emerald-400' : passwordScore === 2 ? 'w-1/2 bg-amber-400' : 'w-1/4 bg-rose-500'
                }`}
              />
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] pt-1">
              <span className={hasMinLength ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                {hasMinLength ? '✓' : '○'} Mínimo 8 caracteres
              </span>
              <span className={hasUpper ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                {hasUpper ? '✓' : '○'} 1 Mayúscula (A-Z)
              </span>
              <span className={hasLower ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                {hasLower ? '✓' : '○'} 1 Minúscula (a-z)
              </span>
              <span className={hasNumber ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                {hasNumber ? '✓' : '○'} 1 Número (0-9)
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300 font-medium">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="btn-primary w-full py-3.5 font-extrabold text-sm rounded-xl shadow-lg transition bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
        disabled={loading || (password.length > 0 && !isPasswordValid)}
      >
        {loading ? t('loading') : '🚀 Registrar Negocio (Prueba 30 Días)'}
      </button>
    </form>
  );
}
