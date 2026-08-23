'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { MACRO_CATEGORIES, getIndustriesByCategory, IndustryType } from '@/lib/industries';
import { TermsModal } from '@/components/TermsModal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  locale: string;
  onSuccess?: (tenant: any) => void;
};

export function CreateTenantModal({ isOpen, onClose, locale, onSuccess }: Props) {
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    slug: '',
    industry: 'HOSTAL' as IndustryType,
    assignType: 'new' as 'new' | 'self',
    ownerEmail: '',
    ownerPassword: '',
    ownerName: '',
  });

  const [showTermsModal, setShowTermsModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function handleNameChange(value: string) {
    const autoSlug = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    setForm((f) => ({
      ...f,
      name: value,
      slug: f.slug === '' || f.slug === autoSlug.slice(0, -1) ? autoSlug : f.slug,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        name: form.name,
        slug: form.slug,
        industry: form.industry,
      };

      if (form.assignType === 'new') {
        if (!form.ownerEmail || !form.ownerPassword) {
          throw new Error('El correo y la contraseña del propietario son obligatorios.');
        }
        payload.ownerEmail = form.ownerEmail;
        payload.ownerPassword = form.ownerPassword;
        payload.ownerName = form.ownerName || form.name;
      }

      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Error al registrar el negocio.');
      }

      if (onSuccess) {
        onSuccess(data.tenant || data);
      }

      onClose();
      router.refresh();
      // Redirect to the newly created tenant's dashboard
      const tenantSlug = data.slug || form.slug;
      router.push(`/${locale}/dashboard/${tenantSlug}`);
    } catch (err: any) {
      setError(err.message || 'Error al crear el negocio.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 text-slate-100 shadow-2xl shadow-indigo-950/50">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-xl border border-indigo-500/30">
              ➕
            </span>
            <div>
              <h3 className="text-lg font-black text-white">Registrar Nuevo Negocio</h3>
              <p className="text-xs text-slate-400">Como Superadministrador puedes dar de alta cualquier negocio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs font-bold text-red-400">
              ⚠️ {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-1">
              Nombre del Negocio *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ej. Hostal Sol & Mar, Peluquería Style, Spa Relax..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-1">
              Subdominio / Slug *
            </label>
            <div className="flex items-center rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                placeholder="mi-negocio"
                className="w-full bg-transparent px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <span className="px-3 text-xs font-mono text-slate-400 border-l border-slate-700 bg-slate-850 shrink-0">
                .misreservaciones.com
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-1">
              Rubro / Industria *
            </label>
            <select
              value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value as any }))}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
            >
              {(() => {
                const categorized = getIndustriesByCategory();
                return MACRO_CATEGORIES.map((cat) => (
                  <optgroup key={cat.key} label={`${cat.icon} ${cat.name}`} className="bg-slate-900 font-bold text-indigo-300">
                    {categorized[cat.key].map((ind) => (
                      <option key={ind.key} value={ind.key} className="bg-slate-800 text-white font-normal">
                        {ind.icon} {ind.name}
                      </option>
                    ))}
                  </optgroup>
                ));
              })()}
            </select>
          </div>

          <div className="border-t border-slate-800 pt-4 mt-4 space-y-3">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-indigo-400">
              Propietario del Negocio
            </label>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="assignType"
                  value="new"
                  checked={form.assignType === 'new'}
                  onChange={() => setForm((f) => ({ ...f, assignType: 'new' }))}
                  className="accent-indigo-500"
                />
                Asignar / Crear Usuario Dueño
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="assignType"
                  value="self"
                  checked={form.assignType === 'self'}
                  onChange={() => setForm((f) => ({ ...f, assignType: 'self' }))}
                  className="accent-indigo-500"
                />
                Mí Mismo (Superadmin)
              </label>
            </div>

            {form.assignType === 'new' && (
              <div className="space-y-3 pt-2 bg-slate-850/60 p-3.5 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nombre Completo del Propietario</label>
                  <input
                    type="text"
                    value={form.ownerName}
                    onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
                    placeholder="Ej. Juan Pérez"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Correo Electrónico (Login) *</label>
                  <input
                    type="email"
                    required
                    value={form.ownerEmail}
                    onChange={(e) => setForm((f) => ({ ...f, ownerEmail: e.target.value }))}
                    placeholder="propietario@email.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Contraseña *</label>
                  <input
                    type="password"
                    required
                    value={form.ownerPassword}
                    onChange={(e) => setForm((f) => ({ ...f, ownerPassword: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Min 8 caract, 1 mayúscula, 1 minúscula y 1 número</p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 mt-4 text-[11px] text-slate-400">
            ⚖️ El registro y operación de este negocio se realiza en conformidad con los{' '}
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="text-indigo-400 underline font-semibold hover:text-indigo-300 inline"
            >
              Términos del Servicio y la Ley Orgánica de Protección de Datos Personales (LOPDP Ecuador)
            </button>
            .
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-950/50 transition disabled:opacity-50"
            >
              {loading ? 'Creando Negocio...' : '🚀 Crear y Gestionar Negocio'}
            </button>
          </div>
        </form>

        <TermsModal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
        />
      </div>
    </div>
  );
}
