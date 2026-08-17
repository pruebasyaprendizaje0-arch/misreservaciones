'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProvincias, getCantonesForProvincia, getParroquiasForCanton } from '@/lib/ecuador-geo';

type TenantProfile = {
  name: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  provincia: string | null;
  canton: string | null;
  parroquia: string | null;
  lat: number | null;
  lng: number | null;
  logoUrl: string | null;
};

type Props = { slug: string; initial: TenantProfile; locale: string };

export function ProfileForm({ slug, initial, locale }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initial.name,
    description: initial.description ?? '',
    phone: initial.phone ?? '',
    address: initial.address ?? '',
    provincia: initial.provincia ?? '',
    canton: initial.canton ?? '',
    parroquia: initial.parroquia ?? '',
    lat: initial.lat?.toString() ?? '',
    lng: initial.lng?.toString() ?? '',
    logoUrl: initial.logoUrl ?? '',
  });

  const [provincias] = useState(() => getProvincias());
  const [cantones, setCantones] = useState<string[]>(() =>
    form.provincia ? getCantonesForProvincia(form.provincia) : []
  );
  const [parroquias, setParroquias] = useState<string[]>(() =>
    form.provincia && form.canton ? getParroquiasForCanton(form.provincia, form.canton) : []
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const setField = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Cascade: when province changes, reset canton and parish
  function handleProvinciaChange(value: string) {
    setForm((f) => ({ ...f, provincia: value, canton: '', parroquia: '' }));
    setCantones(getCantonesForProvincia(value));
    setParroquias([]);
  }

  function handleCantonChange(value: string) {
    setForm((f) => ({ ...f, canton: value, parroquia: '' }));
    setParroquias(getParroquiasForCanton(form.provincia, value));
  }

  function handleGetLocation() {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización.');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
        setGeoLoading(false);
      },
      () => {
        setError('No se pudo obtener la ubicación. Verifica los permisos del navegador.');
        setGeoLoading(false);
      }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const body = {
      name: form.name,
      description: form.description || null,
      phone: form.phone || null,
      address: form.address || null,
      provincia: form.provincia || null,
      canton: form.canton || null,
      parroquia: form.parroquia || null,
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      logoUrl: form.logoUrl || null,
    };

    const res = await fetch(`/api/tenants/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? 'Error al guardar. Intenta de nuevo.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Datos del negocio */}
      <section className="bg-slate-800/40 rounded-xl border border-slate-800/80 p-6 shadow-sm">
        <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
          <span className="text-xl">🏪</span> Información General
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold text-slate-300">Nombre del negocio *</label>
            <input
              className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              required
              minLength={2}
              placeholder="Nombre de tu negocio"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold text-slate-300">Descripción pública</label>
            <textarea
              className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[100px] resize-y"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Cuéntale a tus clientes qué ofrece tu negocio, qué te hace especial..."
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-300">Teléfono de contacto</label>
            <input
              className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              placeholder="+593 99 999 9999"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-300">URL del Logo</label>
            <input
              className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              type="url"
              value={form.logoUrl}
              onChange={(e) => setField('logoUrl', e.target.value)}
              placeholder="https://..."
            />
            <p className="mt-1.5 text-xs text-slate-500">Pega el enlace de tu logo (Cloudinary, Imgur, etc.)</p>
          </div>
        </div>
      </section>

      {/* Ubicación en Ecuador */}
      <section className="bg-slate-800/40 rounded-xl border border-slate-800/80 p-6 shadow-sm">
        <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
          <span className="text-xl">📍</span> Ubicación en Ecuador
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Provincia */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-300">Provincia</label>
            <select
              className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
              value={form.provincia}
              onChange={(e) => handleProvinciaChange(e.target.value)}
            >
              <option value="" className="bg-slate-900">— Selecciona —</option>
              {provincias.map((p) => (
                <option key={p} value={p} className="bg-slate-900">{p}</option>
              ))}
            </select>
          </div>

          {/* Cantón */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-300">Cantón</label>
            <select
              className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
              value={form.canton}
              onChange={(e) => handleCantonChange(e.target.value)}
              disabled={!form.provincia}
            >
              <option value="" className="bg-slate-900">— Selecciona —</option>
              {cantones.map((c) => (
                <option key={c} value={c} className="bg-slate-900">{c}</option>
              ))}
            </select>
          </div>

          {/* Parroquia */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-300">Parroquia</label>
            <select
              className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
              value={form.parroquia}
              onChange={(e) => setField('parroquia', e.target.value)}
              disabled={!form.canton}
            >
              <option value="" className="bg-slate-900">— Selecciona —</option>
              {parroquias.map((p) => (
                <option key={p} value={p} className="bg-slate-900">{p}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="mb-1.5 block text-sm font-semibold text-slate-300">Dirección completa</label>
            <input
              className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
              placeholder="Calle, número, referencias..."
            />
          </div>

          {/* Coordenadas */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-300">Latitud</label>
            <input
              className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={form.lat}
              onChange={(e) => setField('lat', e.target.value)}
              placeholder="-0.2295"
              type="number"
              step="any"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-300">Longitud</label>
            <input
              className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={form.lng}
              onChange={(e) => setField('lng', e.target.value)}
              placeholder="-78.5243"
              type="number"
              step="any"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold py-2 px-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              onClick={handleGetLocation}
              disabled={geoLoading}
            >
              {geoLoading ? (
                <span className="animate-spin">⏳</span>
              ) : (
                '🎯'
              )}
              {geoLoading ? 'Obteniendo…' : 'Mi ubicación actual'}
            </button>
          </div>

          {form.lat && form.lng && (
            <div className="sm:col-span-3">
              <a
                href={`https://www.google.com/maps?q=${form.lat},${form.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
              >
                🗺 Ver en Google Maps → ({form.lat}, {form.lng})
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-8 text-sm transition-all shadow-md shadow-indigo-950/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          disabled={saving}
        >
          {saving ? 'Guardando…' : '💾 Guardar cambios'}
        </button>
        <button
          type="button"
          className="rounded-lg bg-slate-850 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold py-2.5 px-8 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onClick={() => router.push(`/${locale}/dashboard/${slug}`)}
        >
          🚪 Salir
        </button>
        <div className="flex-1" />
        {saved && (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
            ✅ ¡Guardado correctamente!
          </span>
        )}
        {error && (
          <span className="text-sm font-semibold text-red-400">⚠ {error}</span>
        )}
      </div>
    </form>
  );
}
