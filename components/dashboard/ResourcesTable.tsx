'use client';

import { useState } from 'react';

type Resource = {
  id: string;
  name: string;
  description?: string | null;
  capacity: number;
  active: boolean;
};

type Props = { slug: string; initial: Resource[]; industryLabel?: string };

const EMPTY = { name: '', description: '', capacity: 1 };

export function ResourcesTable({ slug, initial, industryLabel = 'Recurso' }: Props) {
  const [resources, setResources] = useState<Resource[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Resource>>({});
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const setField = <K extends keyof typeof EMPTY>(key: K, value: typeof EMPTY[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/tenants/${slug}/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setResources((r) => [...r, data.resource]);
      setForm(EMPTY);
      setShowForm(false);
    }
  }

  async function handleSaveEdit(id: string) {
    setLoading(true);
    const res = await fetch(`/api/tenants/${slug}/resources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setResources((r) => r.map((rc) => (rc.id === id ? data.resource : rc)));
      setEditingId(null);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    const res = await fetch(`/api/tenants/${slug}/resources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    });
    if (res.ok) setResources((r) => r.map((rc) => (rc.id === id ? { ...rc, active: !active } : rc)));
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/tenants/${slug}/resources/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setResources((r) => r.filter((rc) => rc.id !== id));
      setDeleteConfirmId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" className="btn-primary" onClick={() => { setShowForm((v) => !v); setForm(EMPTY); }}>
          {showForm ? '✕ Cancelar' : `+ Nuevo ${industryLabel.toLowerCase()}`}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Nombre *</label>
            <input className="input" value={form.name} onChange={(e) => setField('name', e.target.value)} required minLength={2} placeholder={`Ej: ${industryLabel} 1`} />
          </div>
          <div>
            <label className="label">Capacidad (personas)</label>
            <input className="input" type="number" min={1} value={form.capacity} onChange={(e) => setField('capacity', Number(e.target.value))} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descripción</label>
            <input className="input" value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Descripción opcional" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Guardando…' : `Crear ${industryLabel.toLowerCase()}`}</button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {resources.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <span className="text-4xl">🏷️</span>
            <p className="text-sm font-medium">No hay {industryLabel.toLowerCase()}s registrados</p>
            <button type="button" className="btn-primary mt-2 text-xs" onClick={() => setShowForm(true)}>+ Agregar el primero</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3 hidden sm:table-cell">Descripción</th>
                <th className="px-4 py-3">Capacidad</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resources.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  {editingId === r.id ? (
                    <>
                      <td className="px-4 py-2" colSpan={3}>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <input className="input text-sm" placeholder="Nombre" value={editForm.name ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                          <input className="input text-sm" type="number" placeholder="Capacidad" value={editForm.capacity ?? 1} onChange={(e) => setEditForm((f) => ({ ...f, capacity: Number(e.target.value) }))} />
                          <input className="input text-sm" placeholder="Descripción" value={editForm.description ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
                        </div>
                      </td>
                      <td />
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button type="button" className="mr-3 text-xs text-emerald-600 font-semibold hover:underline" disabled={loading} onClick={() => handleSaveEdit(r.id)}>{loading ? '…' : '✔ Guardar'}</button>
                        <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => setEditingId(null)}>Cancelar</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-semibold text-slate-900">{r.name}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-slate-500 text-xs">{r.description ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-slate-600">👤 {r.capacity}</td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => toggleActive(r.id, r.active)} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${r.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${r.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {r.active ? 'Disponible' : 'No disponible'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button type="button" className="mr-3 text-xs text-indigo-600 font-semibold hover:underline" onClick={() => { setEditingId(r.id); setEditForm({ name: r.name, description: r.description, capacity: r.capacity }); }}>✏️ Editar</button>
                        {deleteConfirmId === r.id ? (
                          <>
                            <span className="mr-2 text-xs text-slate-500">¿Eliminar?</span>
                            <button type="button" className="mr-2 text-xs text-red-600 font-semibold hover:underline" onClick={() => handleDelete(r.id)}>Sí</button>
                            <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => setDeleteConfirmId(null)}>No</button>
                          </>
                        ) : (
                          <button type="button" className="text-xs text-red-500 hover:underline" onClick={() => setDeleteConfirmId(r.id)}>🗑 Eliminar</button>
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
