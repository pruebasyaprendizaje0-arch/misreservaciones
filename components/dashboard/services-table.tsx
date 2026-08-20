'use client';

import { useState } from 'react';

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
  currency: string;
  active: boolean;
};

type Props = {
  slug: string;
  industry: string;
  initial: Service[];
};

const EMPTY_FORM = { name: '', description: '', durationMin: 30, priceCents: 0, currency: 'USD' };

export function ServicesTable({ slug, industry, initial }: Props) {
  const isHostal = industry === 'HOSTAL';
  const [services, setServices] = useState<Service[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(isHostal ? { ...EMPTY_FORM, durationMin: 1440 } : EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Service>>({});
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  function setField<K extends keyof typeof EMPTY_FORM>(key: K, value: typeof EMPTY_FORM[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/tenants/${slug}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, industry }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setServices((s) => [data.service, ...s]);
      setForm(isHostal ? { ...EMPTY_FORM, durationMin: 1440 } : EMPTY_FORM);
      setShowForm(false);
    }
  }

  function startEdit(s: Service) {
    setEditingId(s.id);
    setEditForm({ name: s.name, description: s.description, durationMin: s.durationMin, priceCents: s.priceCents });
  }

  async function handleSaveEdit(id: string) {
    setLoading(true);
    const res = await fetch(`/api/tenants/${slug}/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setServices((s) => s.map((svc) => (svc.id === id ? data.service : svc)));
      setEditingId(null);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    const res = await fetch(`/api/tenants/${slug}/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    });
    if (res.ok) setServices((s) => s.map((svc) => (svc.id === id ? { ...svc, active: !active } : svc)));
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/tenants/${slug}/services/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setServices((s) => s.filter((svc) => svc.id !== id));
      setDeleteConfirmId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-end">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setShowForm((v) => !v);
            setForm(isHostal ? { ...EMPTY_FORM, durationMin: 1440 } : EMPTY_FORM);
          }}
        >
          {showForm ? '✕ Cancelar' : isHostal ? '+ Nueva Habitación / Tarifa' : '+ Nuevo servicio'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-indigo-200 dark:border-slate-800 bg-indigo-50 dark:bg-slate-900 p-5 grid gap-4 sm:grid-cols-2 text-slate-900 dark:text-slate-100">
          <div className="sm:col-span-2">
            <label className="label">{isHostal ? 'Nombre de Habitación / Plan *' : 'Nombre del servicio *'}</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              required
              minLength={2}
              placeholder={isHostal ? 'Ej: Habitación Matrimonial (por noche)' : 'Ej: Corte de cabello'}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descripción</label>
            <textarea
              className="input min-h-[72px] resize-y"
              value={form.description ?? ''}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Describe las características y comodidades incluidos..."
            />
          </div>
          <div>
            <label className="label">{isHostal ? 'Duración de la Estancia (Días) *' : 'Duración (minutos) *'}</label>
            {isHostal ? (
              <input
                className="input"
                type="number"
                min={1}
                step={1}
                value={Math.max(1, Math.round(form.durationMin / 1440))}
                onChange={(e) => setField('durationMin', Math.max(1, Number(e.target.value)) * 1440)}
              />
            ) : (
              <input
                className="input"
                type="number"
                min={5}
                value={form.durationMin}
                onChange={(e) => setField('durationMin', Number(e.target.value))}
              />
            )}
            <p className="mt-1 text-xs text-slate-400">
              {isHostal ? 'Cantidad de días/noches de estancia (ej: 1 día)' : 'Duración estimada en minutos'}
            </p>
          </div>
          <div>
            <label className="label">Precio ($ USD)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm font-semibold">$</span>
              <input
                className="input pl-7"
                type="number"
                min={0}
                step={0.01}
                value={form.priceCents ? form.priceCents / 100 : ''}
                onChange={(e) => setField('priceCents', Math.round(Number(e.target.value) * 100))}
                placeholder="0.00"
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">Precio directamente en dólares (ej: 25.00)</p>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando…' : isHostal ? 'Crear Tarifa / Habitación' : 'Crear servicio'}
            </button>
          </div>
        </form>
      )}

      {/* Services list */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400 dark:text-slate-500">
            <span className="text-4xl">{isHostal ? '🛌' : '🛎'}</span>
            <p className="text-sm font-medium">No hay tarifas o servicios configurados aún</p>
            <button type="button" className="btn-primary mt-2 text-xs" onClick={() => setShowForm(true)}>
              + Crear el primero
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">{isHostal ? 'Habitación / Tarifa' : 'Servicio'}</th>
                <th className="px-4 py-3 hidden sm:table-cell">Duración</th>
                <th className="px-4 py-3 hidden sm:table-cell">Precio ($ USD)</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {services.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  {editingId === s.id ? (
                    // ── Inline edit row ──────────────────────────────
                    <>
                      <td className="px-4 py-2" colSpan={3}>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <input
                            className="input text-sm"
                            value={editForm.name ?? ''}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="Nombre"
                          />
                          {isHostal ? (
                            <input
                              className="input text-sm"
                              type="number"
                              min={1}
                              value={Math.max(1, Math.round((editForm.durationMin ?? 1440) / 1440))}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  durationMin: Math.max(1, Number(e.target.value)) * 1440,
                                }))
                              }
                              placeholder="Días"
                            />
                          ) : (
                            <input
                              className="input text-sm"
                              type="number"
                              value={editForm.durationMin ?? 30}
                              onChange={(e) => setEditForm((f) => ({ ...f, durationMin: Number(e.target.value) }))}
                              placeholder="Min"
                            />
                          )}
                          <div className="relative">
                            <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-400 text-xs">$</span>
                            <input
                              className="input text-sm pl-6"
                              type="number"
                              step={0.01}
                              value={editForm.priceCents ? editForm.priceCents / 100 : ''}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, priceCents: Math.round(Number(e.target.value) * 100) }))
                              }
                              placeholder="0.00"
                            />
                          </div>
                          <input
                            className="input text-sm sm:col-span-3"
                            value={editForm.description ?? ''}
                            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                            placeholder="Descripción"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2" />
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline mr-3"
                          disabled={loading}
                          onClick={() => handleSaveEdit(s.id)}
                        >
                          {loading ? '…' : '✔ Guardar'}
                        </button>
                        <button
                          type="button"
                          className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
                          onClick={() => setEditingId(null)}
                        >
                          Cancelar
                        </button>
                      </td>
                    </>
                  ) : (
                    // ── Read row ─────────────────────────────────────
                    <>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{s.name}</p>
                        {s.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">{s.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-slate-600 dark:text-slate-300 font-medium">
                        {isHostal
                          ? `📅 ${Math.max(1, Math.round(s.durationMin / 1440))} día(s)`
                          : `⏱ ${s.durationMin} min`}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell font-bold text-slate-900 dark:text-slate-100">
                        {s.priceCents > 0 ? (
                          `$${(s.priceCents / 100).toFixed(2)}`
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 font-normal">Gratis</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleActive(s.id, s.active)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                            s.active
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              s.active ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-slate-400 dark:bg-slate-500'
                            }`}
                          />
                          {s.active ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="mr-3 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                          onClick={() => startEdit(s)}
                        >
                          ✏️ Editar
                        </button>
                        {deleteConfirmId === s.id ? (
                          <>
                            <span className="mr-2 text-xs text-slate-500 dark:text-slate-400">¿Eliminar?</span>
                            <button
                              type="button"
                              className="mr-2 text-xs text-red-600 dark:text-red-400 font-semibold hover:underline"
                              onClick={() => handleDelete(s.id)}
                            >
                              Sí, eliminar
                            </button>
                            <button
                              type="button"
                              className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="text-xs text-red-500 dark:text-red-400 hover:underline"
                            onClick={() => setDeleteConfirmId(s.id)}
                          >
                            🗑 Eliminar
                          </button>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
