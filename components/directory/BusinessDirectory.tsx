'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getProvincias, getCantonesForProvincia, getParroquiasForCanton, getComunasForParroquia } from '@/lib/ecuador-geo';
import { MACRO_CATEGORIES, getIndustriesByCategory, getIndustryConfig } from '@/lib/industries';

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
  comuna?: string | null;
  lat: number | null;
  lng: number | null;
  logoUrl: string | null;
  plan: string;
};

const GRADIENTS_BY_CATEGORY: Record<string, string> = {
  ALOJAMIENTO: 'from-sky-500 to-indigo-600',
  SALUD_BELLEZA: 'from-rose-500 to-purple-600',
  TURISMO_AVENTURA: 'from-amber-500 to-emerald-600',
  GASTRONOMIA_EVENTOS: 'from-orange-500 to-red-600',
  ALQUILER_ESPACIOS: 'from-blue-500 to-teal-600',
};

function BusinessCard({ tenant, locale }: { tenant: Tenant; locale: string }) {
  const config = getIndustryConfig(tenant.industry);
  const gradient = GRADIENTS_BY_CATEGORY[config.macroCategory] || 'from-slate-500 to-slate-700';
  const meta = { icon: config.icon, label: config.name, gradient };
  const location = [tenant.comuna ? `Comuna ${tenant.comuna}` : null, tenant.parroquia, tenant.canton, tenant.provincia].filter(Boolean).join(', ');

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
              {tenant.plan === 'BUSINESS' && (
                <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-black text-purple-300 border border-purple-500/30">🚀 BUSINESS</span>
              )}
              {tenant.plan === 'PRO' && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-black text-amber-300 border border-amber-500/30">⭐ PRO</span>
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
  const [comuna, setComuna] = useState('');
  const [industry, setIndustry] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  const provincias = getProvincias();
  const [cantones, setCantones] = useState<string[]>([]);
  const [parroquias, setParroquias] = useState<string[]>([]);
  const [comunas, setComunas] = useState<string[]>([]);

  function handleProvinciaChange(value: string) {
    setProvincia(value);
    setCanton('');
    setParroquia('');
    setComuna('');
    setCantones(getCantonesForProvincia(value));
    setParroquias([]);
    setComunas([]);
  }

  function handleCantonChange(value: string) {
    setCanton(value);
    setParroquia('');
    setComuna('');
    setParroquias(getParroquiasForCanton(provincia, value));
    setComunas([]);
  }

  function handleParroquiaChange(value: string) {
    setParroquia(value);
    setComuna('');
    setComunas(getComunasForParroquia(provincia, canton, value));
  }

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (provincia) params.set('provincia', provincia);
    if (canton) params.set('canton', canton);
    if (parroquia) params.set('parroquia', parroquia);
    if (comuna) params.set('comuna', comuna);
    if (industry) params.set('industry', industry);

    const res = await fetch(`/api/directory?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setTenants(data.tenants);
    }
    setLoading(false);
  }, [q, provincia, canton, parroquia, comuna, industry]);

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
    setComuna('');
    setIndustry('');
    setCantones([]);
    setParroquias([]);
    setComunas([]);
  }

  const hasFilters = q || provincia || canton || parroquia || comuna || industry;

  return (
    <div>
      {/* ── Search & Filters ──────────────────────────── */}
      <div className="bg-slate-900/40 rounded-3xl border border-white/10 shadow-xl p-6 sm:p-8 space-y-6 backdrop-blur-md">
        {/* Text search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-4 flex items-center text-indigo-400 text-xl pointer-events-none">🔍</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-4 pl-12 pr-4 text-base font-bold text-white placeholder-slate-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            type="search"
            placeholder="Buscar por nombre del negocio, servicio, ciudad, parroquia o comuna (ej. Olón, Montañita)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {/* Geo selectors + industry */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Provincia */}
          <div>
            <label className="mb-1.5 block text-xs font-black text-indigo-300 uppercase tracking-wider">Provincia</label>
            <select
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-xs sm:text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
              value={provincia}
              onChange={(e) => handleProvinciaChange(e.target.value)}
            >
              <option value="" className="bg-slate-950 text-white">Todas las Provincias</option>
              {provincias.map((p) => <option key={p} value={p} className="bg-slate-950 text-white">{p}</option>)}
            </select>
          </div>

          {/* Cantón */}
          <div>
            <label className="mb-1.5 block text-xs font-black text-indigo-300 uppercase tracking-wider">Cantón</label>
            <select
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-xs sm:text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40 shadow-inner"
              value={canton}
              onChange={(e) => handleCantonChange(e.target.value)}
              disabled={!provincia}
            >
              <option value="" className="bg-slate-950 text-white">Todos los Cantones</option>
              {cantones.map((c) => <option key={c} value={c} className="bg-slate-950 text-white">{c}</option>)}
            </select>
          </div>

          {/* Parroquia */}
          <div>
            <label className="mb-1.5 block text-xs font-black text-indigo-300 uppercase tracking-wider">Parroquia</label>
            <select
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-xs sm:text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40 shadow-inner"
              value={parroquia}
              onChange={(e) => handleParroquiaChange(e.target.value)}
              disabled={!canton}
            >
              <option value="" className="bg-slate-950 text-white">Todas las Parroquias</option>
              {parroquias.map((p) => <option key={p} value={p} className="bg-slate-950 text-white">{p}</option>)}
            </select>
          </div>

          {/* Comuna / Localidad */}
          <div>
            <label className="mb-1.5 block text-xs font-black text-indigo-300 uppercase tracking-wider">Comuna / Localidad</label>
            <select
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-xs sm:text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40 shadow-inner"
              value={comuna}
              onChange={(e) => setComuna(e.target.value)}
              disabled={!parroquia || comunas.length === 0}
            >
              <option value="" className="bg-slate-950 text-white">
                {comunas.length > 0 ? 'Todas las Comunas' : 'Sin comunas registradas'}
              </option>
              {comunas.map((c) => <option key={c} value={c} className="bg-slate-950 text-white">{c}</option>)}
            </select>
          </div>

          {/* Industria */}
          <div>
            <label className="mb-1.5 block text-xs font-black text-indigo-300 uppercase tracking-wider">Rubro / Industria</label>
            <select
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-xs sm:text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            >
              <option value="" className="bg-slate-950 text-white font-bold">Todos los Rubros</option>
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
