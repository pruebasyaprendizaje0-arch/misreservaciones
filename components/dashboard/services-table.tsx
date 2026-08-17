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
  const [services, setServices] = useState<Service[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
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
      setForm(EMPTY_FORM);
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
          onClick={() => { setShowForm((v) => !v); setForm(EMPTY_FORM); }}
        >
          {showForm ? '✕ Cancelar' : '+ Nuevo servicio'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nombre del servicio *</label>
            <input className="input" value={form.name} onChange={(e) => setField('name', e.target.value)} required minLength={2} placeholder="Ej: Corte de cabello" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descripción</label>
            <textarea className="input min-h-[72px] resize-y" value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Describe brevemente el servicio..." />
          </div>
          <div>
            <label className="label">Duración (minutos) *</label>
            <input className="input" type="number" min={5} value={form.durationMin} onChange={(e) => setField('durationMin', Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Precio (centavos)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm">$</span>
              <input
                className="input pl-7"
                type="number"
                min={0}
                step={100}
                value={form.priceCents}
                onChange={(e) => setField('priceCents', Number(e.target.value))}
                placeholder="0"
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">Ingresa en centavos (ej: 1000 = $10.00)</p>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Guardando…' : 'Crear servicio'}</button>
          </div>
        </form>
      )}

      {/* Services list */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <span className="text-4xl">🛎</span>
            <p className="text-sm font-medium">No hay servicios aún</p>
            <button type="button" className="btn-primary mt-2 text-xs" onClick={() => setShowForm(true)}>+ Crear el primero</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Servicio</th>
                <th className="px-4 py-3 hidden sm:table-cell">Duración</th>
                <th className="px-4 py-3 hidden sm:table-cell">Precio</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {services.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
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
                          <input
                            className="input text-sm"
                            type="number"
                            value={editForm.durationMin ?? 30}
                            onChange={(e) => setEditForm((f) => ({ ...f, durationMin: Number(e.target.value) }))}
                            placeholder="Min"
                          />
                          <input
                            className="input text-sm"
                            type="number"
                            value={editForm.priceCents ?? 0}
                            onChange={(e) => setEditForm((f) => ({ ...f, priceCents: Number(e.target.value) }))}
                            placeholder="Centavos"
                          />
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
                        <button type="button" className="text-xs text-emerald-600 font-semibold hover:underline mr-3" disabled={loading} onClick={() => handleSaveEdit(s.id)}>
                          {loading ? '…' : '✔ Guardar'}
                        </button>
                        <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => setEditingId(null)}>Cancelar</button>
                      </td>
                    </>
                  ) : (
                    // ── Read row ─────────────────────────────────────
                    <>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{s.name}</p>
                        {s.description && <p className="text-xs text-slate-500 truncate max-w-xs">{s.description}</p>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-slate-600">⏱ {s.durationMin} min</td>
                      <td className="px-4 py-3 hidden sm:table-cell font-medium text-slate-900">
                        {s.priceCents > 0 ? `$${(s.priceCents / 100).toFixed(2)}` : <span className="text-slate-400">Gratis</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleActive(s.id, s.active)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                            s.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${s.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {s.active ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button type="button" className="mr-3 text-xs text-indigo-600 font-semibold hover:underline" onClick={() => startEdit(s)}>✏️ Editar</button>
                        {deleteConfirmId === s.id ? (
                          <>
                            <span className="mr-2 text-xs text-slate-500">¿Eliminar?</span>
                            <button type="button" className="mr-2 text-xs text-red-600 font-semibold hover:underline" onClick={() => handleDelete(s.id)}>Sí, eliminar</button>
                            <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => setDeleteConfirmId(null)}>No</button>
                          </>
                        ) : (
                          <button type="button" className="text-xs text-red-500 hover:underline" onClick={() => setDeleteConfirmId(s.id)}>🗑 Eliminar</button>
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
