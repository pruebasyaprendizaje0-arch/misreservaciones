'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

const INDUSTRIES = [
  { value: 'HOSTAL', labelEs: 'Hostal', labelEn: 'Hostel' },
  { value: 'MASAJE', labelEs: 'Masajes / Spa', labelEn: 'Massage / Spa' },
  { value: 'PELUQUERIA', labelEs: 'Peluquería', labelEn: 'Salon' },
  { value: 'MEDICO', labelEs: 'Centro médico', labelEn: 'Medical center' },
] as const;

export function SignUpForm() {
  const t = useTranslations('common');
  const ti = useTranslations('industries');
  const router = useRouter();
  const locale = useLocale();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [industry, setIndustry] = useState<'HOSTAL' | 'MASAJE' | 'PELUQUERIA' | 'MEDICO'>('HOSTAL');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, industry, ownerEmail: email, ownerPassword: password }),
    });
    setLoading(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.message || json.error || 'Error al crear el negocio');
      return;
    }

    const data = await res.json();
    router.push(`/${locale}/sign-in?created=${encodeURIComponent(data.slug)}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">{t('spanish') === 'Español' ? 'Nombre del negocio' : 'Business name'}</label>
        <input
          id="name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
        />
      </div>
      <div>
        <label className="label" htmlFor="slug">Subdominio (slug)</label>
        <div className="flex items-center gap-2">
          <input
            id="slug"
            className="input"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            required
            pattern="[a-z0-9\-]{2,48}"
            placeholder="acme"
          />
          <span className="text-sm text-slate-500">.{process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'tusreservas.com'}</span>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="industry">Industria</label>
        <select
          id="industry"
          className="input"
          value={industry}
          onChange={(e) => setIndustry(e.target.value as typeof industry)}
        >
          {INDUSTRIES.map((i) => (
            <option key={i.value} value={i.value}>
              {ti(i.value as 'HOSTAL')}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="email">{t('email')}</label>
        <input
          id="email"
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña (mínimo 8)</label>
        <input
          id="password"
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="btn-primary w-full py-3.5 font-extrabold text-sm rounded-xl shadow-md transition hover:bg-indigo-700" disabled={loading}>
        {loading ? t('loading') : '🚀 Comenzar Prueba Gratuita (30 Días)'}
      </button>

    </form>
  );
}
