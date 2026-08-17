'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getProvincias, getCantonesForProvincia, getParroquiasForCanton } from '@/lib/ecuador-geo';

type Tenant = {
  id: string;
  slug: string;
  name: string;
  industry: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  provincia: string | null;
  canton: string | null;
  parroquia: string | null;
  lat: number | null;
  lng: number | null;
  logoUrl: string | null;
  plan: string;
};

const INDUSTRY_META: Record<string, { icon: string; label: string; gradient: string }> = {
  HOSTAL:      { icon: '🏨', label: 'Hostal / Alojamiento', gradient: 'from-sky-500 to-indigo-600' },
  MASAJE:      { icon: '💆', label: 'Masajes / Spa',         gradient: 'from-orange-500 to-rose-600' },
  PELUQUERIA:  { icon: '💈', label: 'Peluquería / Estética', gradient: 'from-purple-500 to-pink-600' },
  MEDICO:      { icon: '🩺', label: 'Médico / Salud',        gradient: 'from-teal-500 to-emerald-600' },
};

const INDUSTRIES = [
  { value: '', label: 'Todos los rubros' },
  { value: 'HOSTAL', label: '🏨 Hostales' },
  { value: 'MASAJE', label: '💆 Masajes' },
  { value: 'PELUQUERIA', label: '💈 Peluquerías' },
  { value: 'MEDICO', label: '🩺 Salud' },
];

function BusinessCard({ tenant, locale }: { tenant: Tenant; locale: string }) {
  const meta = INDUSTRY_META[tenant.industry] ?? { icon: '🏢', label: tenant.industry, gradient: 'from-slate-500 to-slate-700' };
  const location = [tenant.parroquia, tenant.canton, tenant.provincia].filter(Boolean).join(', ');

  return (
    <Link
      href={`/${locale}/${tenant.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md shadow-sm transition hover:shadow-xl hover:-translate-y-1 hover:border-white/10"
    >
      {/* Color band top */}
      <div className={`h-2 w-full bg-gradient-to-r ${meta.gradient}`} />

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-4">
          {/* Logo or default icon */}
          {tenant.logoUrl ? (
            <img
              src={tenant.logoUrl}
              alt={tenant.name}
              className="h-14 w-14 rounded-xl object-cover border border-white/10 shadow-sm flex-shrink-0"
            />
          ) : (
            <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.gradient} text-2xl shadow-sm`}>
              {meta.icon}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
                {meta.icon} {meta.label}
              </span>
              {tenant.plan !== 'FREE' && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/20">⭐ PRO</span>
              )}
            </div>
            <h3 className="mt-1 text-lg font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
              {tenant.name}
            </h3>
          </div>
        </div>

        {tenant.description && (
          <p className="mt-3 text-sm text-slate-300 line-clamp-2">{tenant.description}</p>
        )}

        <div className="mt-auto pt-4 space-y-1.5 text-xs text-slate-400">
          {location && (
            <div className="flex items-center gap-1.5">
              <span>📍</span>
              <span className="truncate">{location}</span>
            </div>
          )}
          {tenant.address && (
            <div className="flex items-center gap-1.5">
              <span>🏠</span>
              <span className="truncate">{tenant.address}</span>
            </div>
          )}
          {tenant.phone && (
            <div className="flex items-center gap-1.5">
              <span>📞</span>
              <span>{tenant.phone}</span>
            </div>
          )}
        </div>
      </div>

      <div className={`mx-5 mb-5 mt-3 rounded-xl bg-gradient-to-r ${meta.gradient} py-2.5 text-center text-sm font-semibold text-white shadow-sm transition group-hover:opacity-90`}>
        Ver perfil y reservar →
      </div>
    </Link>
  );
}

type Props = { locale: string };

export function BusinessDirectory({ locale }: Props) {
  const [q, setQ] = useState('');
  const [provincia, setProvincia] = useState('');
  const [canton, setCanton] = useState('');
  const [parroquia, setParroquia] = useState('');
  const [industry, setIndustry] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  const provincias = getProvincias();
  const [cantones, setCantones] = useState<string[]>([]);
  const [parroquias, setParroquias] = useState<string[]>([]);

  function handleProvinciaChange(value: string) {
    setProvincia(value);
    setCanton('');
    setParroquia('');
    setCantones(getCantonesForProvincia(value));
    setParroquias([]);
  }

  function handleCantonChange(value: string) {
    setCanton(value);
    setParroquia('');
    setParroquias(getParroquiasForCanton(provincia, value));
  }

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (provincia) params.set('provincia', provincia);
    if (canton) params.set('canton', canton);
    if (parroquia) params.set('parroquia', parroquia);
    if (industry) params.set('industry', industry);

    const res = await fetch(`/api/directory?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setTenants(data.tenants);
    }
    setLoading(false);
  }, [q, provincia, canton, parroquia, industry]);

  // Debounce text search
  useEffect(() => {
    const timer = setTimeout(fetchTenants, 350);
    return () => clearTimeout(timer);
  }, [fetchTenants]);

  function clearFilters() {
    setQ('');
    setProvincia('');
    setCanton('');
    setParroquia('');
    setIndustry('');
    setCantones([]);
    setParroquias([]);
  }

  const hasFilters = q || provincia || canton || parroquia || industry;

  return (
    <div>
      {/* ── Search & Filters ──────────────────────────── */}
      <div className="bg-slate-900/40 rounded-2xl border border-white/5 shadow-sm p-5 space-y-4 backdrop-blur-md">
        {/* Text search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 text-lg pointer-events-none">🔍</span>
          <input
            className="w-full rounded-xl border border-white/5 bg-slate-950/40 py-3 pl-12 pr-4 text-sm font-medium text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            type="search"
            placeholder="Buscar por nombre, servicio o ciudad..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {/* Geo selectors + industry */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Provincia */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-indigo-300 uppercase tracking-wide">Provincia</label>
            <select
              className="w-full rounded-xl border border-white/5 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={provincia}
              onChange={(e) => handleProvinciaChange(e.target.value)}
            >
              <option value="" className="bg-slate-900 text-slate-200">Todas</option>
              {provincias.map((p) => <option key={p} value={p} className="bg-slate-900 text-slate-200">{p}</option>)}
            </select>
          </div>

          {/* Cantón */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-indigo-300 uppercase tracking-wide">Cantón</label>
            <select
              className="w-full rounded-xl border border-white/5 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40"
              value={canton}
              onChange={(e) => handleCantonChange(e.target.value)}
              disabled={!provincia}
            >
              <option value="" className="bg-slate-900 text-slate-200">Todos</option>
              {cantones.map((c) => <option key={c} value={c} className="bg-slate-900 text-slate-200">{c}</option>)}
            </select>
          </div>

          {/* Parroquia */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-indigo-300 uppercase tracking-wide">Parroquia</label>
            <select
              className="w-full rounded-xl border border-white/5 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40"
              value={parroquia}
              onChange={(e) => setParroquia(e.target.value)}
              disabled={!canton}
            >
              <option value="" className="bg-slate-900 text-slate-200">Todas</option>
              {parroquias.map((p) => <option key={p} value={p} className="bg-slate-900 text-slate-200">{p}</option>)}
            </select>
          </div>

          {/* Industria */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-indigo-300 uppercase tracking-wide">Rubro</label>
            <select
              className="w-full rounded-xl border border-white/5 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            >
              {INDUSTRIES.map((i) => <option key={i.value} value={i.value} className="bg-slate-900 text-slate-200">{i.label}</option>)}
            </select>
          </div>
        </div>

        {hasFilters && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-slate-300">
              {loading ? 'Buscando…' : `${tenants.length} negocio${tenants.length !== 1 ? 's' : ''} encontrado${tenants.length !== 1 ? 's' : ''}`}
            </p>
            <button
              type="button"
              className="text-xs text-indigo-400 font-semibold hover:underline"
              onClick={clearFilters}
            >
              ✕ Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* ── Results ───────────────────────────────────── */}
      <div className="mt-8">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-64 rounded-2xl bg-slate-900/30 border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : tenants.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-slate-400">
            <span className="text-6xl">🔍</span>
            <p className="text-lg font-semibold text-slate-300">No se encontraron negocios</p>
            <p className="text-sm">Intenta con otros filtros o amplía tu búsqueda</p>
            {hasFilters && (
              <button type="button" className="mt-2 btn-secondary bg-white/10 text-white hover:bg-white/15" onClick={clearFilters}>
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tenants.map((t) => (
              <BusinessCard key={t.id} tenant={t} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
