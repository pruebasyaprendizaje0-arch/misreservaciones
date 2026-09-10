'use client';

import React, { useState } from 'react';
import { BusinessHoursEditor } from './BusinessHoursEditor';

type StaffMember = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
};

type Props = { slug: string; initial: StaffMember[] };

const EMPTY = { name: '', role: '', email: '', phone: '' };

export function StaffTable({ slug, initial }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<StaffMember>>({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [scheduleStaffId, setScheduleStaffId] = useState<string | null>(null);

  const setField = (key: keyof typeof EMPTY, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    const body = {
      name: form.name.trim(),
      role: form.role ? form.role.trim() : null,
      email: form.email ? form.email.trim() : null,
      phone: form.phone ? form.phone.trim() : null,
    };

    try {
      const res = await fetch(`/api/tenants/${slug}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (res.ok && (data.member || data.staff)) {
        const created = data.member || data.staff;
        setStaff((s) => [...s, created]);
        setForm(EMPTY);
        setShowForm(false);
      } else {
        setErrorMessage(data?.message || data?.error || 'Error al crear el empleado. Intenta de nuevo.');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err?.message || 'Error de conexión.');
    }
  }

  async function handleSaveEdit(id: string) {
    setLoading(true);
    setErrorMessage(null);
    const current = staff.find((m) => m.id === id);

    const body = {
      name: editForm.name !== undefined ? editForm.name.trim() : current?.name,
      role: editForm.role !== undefined ? (editForm.role ? editForm.role.trim() : null) : (current?.role ?? null),
      email: editForm.email !== undefined ? (editForm.email ? editForm.email.trim() : null) : (current?.email ?? null),
      phone: editForm.phone !== undefined ? (editForm.phone ? editForm.phone.trim() : null) : (current?.phone ?? null),
    };

    try {
      const res = await fetch(`/api/tenants/${slug}/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);

      if (res.ok && (data.member || data.staff)) {
        const updated = data.member || data.staff;
        setStaff((s) => s.map((m) => (m.id === id ? updated : m)));
        setEditingId(null);
      } else {
        setErrorMessage(data?.message || data?.error || 'Error al guardar los cambios del empleado.');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err?.message || 'Error de conexión.');
    }
  }

  async function toggleActive(id: string, active: boolean) {
    try {
      const res = await fetch(`/api/tenants/${slug}/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      });
      if (res.ok) setStaff((s) => s.map((m) => (m.id === id ? { ...m, active: !active } : m)));
    } catch {}
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/tenants/${slug}/staff/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStaff((s) => s.filter((m) => m.id !== id));
        setDeleteConfirmId(null);
      }
    } catch {}
  }

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 p-4 text-sm font-semibold text-rose-300 flex items-center justify-between">
          <span>⚠️ {errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs text-rose-400 hover:text-white underline ml-4"
          >
            Cerrar
          </button>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setShowForm((v) => !v);
            setForm(EMPTY);
            setErrorMessage(null);
          }}
        >
          {showForm ? '✕ Cancelar' : '+ Nuevo empleado'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Nombre *</label>
            <input className="input" value={form.name} onChange={(e) => setField('name', e.target.value)} required minLength={2} placeholder="Ej: María García" />
          </div>
          <div>
            <label className="label">Cargo / Rol</label>
            <input className="input" value={form.role} onChange={(e) => setField('role', e.target.value)} placeholder="Ej: Estilista, Recepcionista" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="maria@ejemplo.com" />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input className="input" value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="+593 99 999 9999" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Guardando…' : 'Crear empleado'}</button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <span className="text-4xl">👥</span>
            <p className="text-sm font-medium">No hay empleados registrados</p>
            <button type="button" className="btn-primary mt-2 text-xs" onClick={() => setShowForm(true)}>+ Agregar el primero</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3 hidden sm:table-cell">Cargo</th>
                <th className="px-4 py-3 hidden md:table-cell">Contacto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((m) => (
                <React.Fragment key={m.id}>
                  <tr className="hover:bg-slate-50 transition-colors">
                  {editingId === m.id ? (
                    <>
                      <td className="px-4 py-2" colSpan={3}>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input className="input text-sm" placeholder="Nombre" value={editForm.name ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                          <input className="input text-sm" placeholder="Cargo" value={editForm.role ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))} />
                          <input className="input text-sm" placeholder="Email" value={editForm.email ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
                          <input className="input text-sm" placeholder="Teléfono" value={editForm.phone ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
                        </div>
                      </td>
                      <td />
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button type="button" className="mr-3 text-xs text-emerald-600 font-semibold hover:underline" disabled={loading} onClick={() => handleSaveEdit(m.id)}>{loading ? '…' : '✔ Guardar'}</button>
                        <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => setEditingId(null)}>Cancelar</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-sm">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-900">{m.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-slate-600">{m.role ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs">
                        {m.email && <div>{m.email}</div>}
                        {m.phone && <div>{m.phone}</div>}
                        {!m.email && !m.phone && <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => toggleActive(m.id, m.active)} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${m.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${m.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {m.active ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="mr-3 text-xs text-indigo-600 font-extrabold hover:underline"
                          onClick={() => setScheduleStaffId(scheduleStaffId === m.id ? null : m.id)}
                        >
                          🗓️ Horario
                        </button>
                        <button type="button" className="mr-3 text-xs text-indigo-600 font-semibold hover:underline" onClick={() => { setEditingId(m.id); setEditForm({ name: m.name, role: m.role, email: m.email, phone: m.phone }); }}>✏️ Editar</button>
                        {deleteConfirmId === m.id ? (
                          <>
                            <span className="mr-2 text-xs text-slate-500">¿Eliminar?</span>
                            <button type="button" className="mr-2 text-xs text-red-600 font-semibold hover:underline" onClick={() => handleDelete(m.id)}>Sí</button>
                            <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => setDeleteConfirmId(null)}>No</button>
                          </>
                        ) : (
                          <button type="button" className="text-xs text-red-500 hover:underline" onClick={() => setDeleteConfirmId(m.id)}>🗑 Eliminar</button>
                        )}
                      </td>
                    </>
                  )}
                </tr>

                {scheduleStaffId === m.id && (
                  <tr>
                    <td colSpan={5} className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-b border-indigo-200 dark:border-indigo-900">
                      <BusinessHoursEditor
                        slug={slug}
                        staffId={m.id}
                        staffName={m.name}
                        onSaved={() => setScheduleStaffId(null)}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
