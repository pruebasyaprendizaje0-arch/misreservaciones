'use client';

import { useState, useEffect } from 'react';

type Reservation = {
  id: string;
  startsAt: string;
  status: string;
  service: { name: string };
  staff: { name: string } | null;
};

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  medicalData: any;
  metadata?: any;
  reservations: Reservation[];
};

type Props = {
  slug: string;
  initialCustomers: Customer[];
  industry: string;
};

export function CustomerDirectory({ slug, initialCustomers, industry }: Props) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialCustomers.length > 0 ? initialCustomers[0].id : null
  );
  const [search, setSearch] = useState('');

  // Create Guest Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    phone: '',
    email: '',
    docId: '',
    nationality: '',
    emergencyContact: '',
    notes: '',
  });

  // Edit state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Hostal fields (stored in metadata)
  const [docId, setDocId] = useState('');
  const [nationality, setNationality] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Medical data fields
  const [allergies, setAllergies] = useState('');
  const [antecedents, setAntecedents] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [consultationNotes, setConsultationNotes] = useState('');

  // Wellness data fields (for MASAJE)
  const [preferredPressure, setPreferredPressure] = useState('Media');
  const [painAreas, setPainAreas] = useState('');
  const [oilAllergies, setOilAllergies] = useState('');
  const [wellnessPreferences, setWellnessPreferences] = useState('');

  const selectedCustomer = customers.find((c) => c.id === selectedId) || null;
  const isHostal = industry === 'HOSTAL';

  // Sync form fields when selected customer changes
  useEffect(() => {
    if (selectedCustomer) {
      setName(selectedCustomer.name);
      setEmail(selectedCustomer.email ?? '');
      setPhone(selectedCustomer.phone ?? '');
      setNotes(selectedCustomer.notes ?? '');

      const meta = selectedCustomer.metadata || {};
      setDocId(meta.docId ?? '');
      setNationality(meta.nationality ?? '');
      setEmergencyContact(meta.emergencyContact ?? '');

      const med = selectedCustomer.medicalData || {};
      if (industry === 'MEDICO') {
        setAllergies(med.allergies ?? '');
        setAntecedents(med.antecedents ?? '');
        setBloodPressure(med.bloodPressure ?? '');
        setDiagnosis(med.diagnosis ?? '');
        setConsultationNotes(med.consultationNotes ?? '');
      } else if (industry === 'MASAJE') {
        setPreferredPressure(med.preferredPressure ?? 'Media');
        setPainAreas(med.painAreas ?? '');
        setOilAllergies(med.oilAllergies ?? '');
        setWellnessPreferences(med.wellnessPreferences ?? '');
      }
      setSaveSuccess(false);
      setError(null);
      setDeleteConfirm(false);
    }
  }, [selectedId, selectedCustomer, industry]);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    const meta = c.metadata || {};
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (meta.docId && meta.docId.toLowerCase().includes(q)) ||
      (meta.nationality && meta.nationality.toLowerCase().includes(q))
    );
  });

  const term = {
    customer: isHostal ? 'Huésped' : industry === 'MEDICO' ? 'Paciente' : 'Cliente',
    customers: isHostal ? 'Huéspedes' : industry === 'MEDICO' ? 'Pacientes' : 'Clientes',
    bookings: isHostal ? 'Estadías' : industry === 'MEDICO' ? 'Consultas' : 'Reservas',
    staff: isHostal ? 'Personal' : industry === 'MEDICO' ? 'Médico' : 'Atendido por',
  };

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name) return;
    setCreating(true);

    try {
      const res = await fetch(`/api/tenants/${slug}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          phone: createForm.phone || null,
          email: createForm.email || null,
          notes: createForm.notes || null,
          metadata: {
            docId: createForm.docId || null,
            nationality: createForm.nationality || null,
            emergencyContact: createForm.emergencyContact || null,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newCustomer: Customer = {
          ...data.customer,
          reservations: [],
        };
        setCustomers((prev) => [newCustomer, ...prev]);
        setSelectedId(newCustomer.id);
        setShowCreateModal(false);
        setCreateForm({
          name: '',
          phone: '',
          email: '',
          docId: '',
          nationality: '',
          emergencyContact: '',
          notes: '',
        });
      }
    } catch (err) {
      console.error('Error al crear huésped:', err);
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    let medicalDataValue = null;
    if (industry === 'MEDICO') {
      medicalDataValue = {
        allergies,
        antecedents,
        bloodPressure,
        diagnosis,
        consultationNotes,
      };
    } else if (industry === 'MASAJE') {
      medicalDataValue = {
        preferredPressure,
        painAreas,
        oilAllergies,
        wellnessPreferences,
      };
    }

    const metadataValue = {
      ...(selectedCustomer?.metadata || {}),
      docId: docId || null,
      nationality: nationality || null,
      emergencyContact: emergencyContact || null,
    };

    try {
      const res = await fetch(`/api/tenants/${slug}/customers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedId,
          name,
          email: email || null,
          phone: phone || null,
          notes: notes || null,
          medicalData: medicalDataValue,
          metadata: metadataValue,
        }),
      });

      if (!res.ok) throw new Error('Error al actualizar la ficha');

      const data = await res.json();
      setCustomers((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, ...data.customer } : c))
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCustomer() {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/tenants/${slug}/customers?id=${selectedId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const remaining = customers.filter((c) => c.id !== selectedId);
        setCustomers(remaining);
        setSelectedId(remaining.length > 0 ? remaining[0].id : null);
        setDeleteConfirm(false);
      }
    } catch (err) {
      console.error('Error al eliminar cliente:', err);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-3 text-slate-900 dark:text-slate-100">
      {/* Left panel: Search, Create Button & List */}
      <div className="md:col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[75vh]">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold py-2 px-4 text-sm transition-all shadow-sm"
          >
            <span>👤+</span> Registrar {term.customer} Manualmente
          </button>
          <input
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            type="search"
            placeholder={`Buscar por nombre, cédula o teléfono...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-500 italic">
              No se encontraron {term.customers.toLowerCase()}.
            </div>
          ) : (
            filtered.map((c) => {
              const meta = c.metadata || {};
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between ${
                    selectedId === c.id
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-l-4 border-indigo-600'
                      : ''
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-snug">
                      {c.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {meta.docId ? `🆔 ${meta.docId} · ` : ''}
                      {c.phone || c.email || 'Sin contacto'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                    {c.reservations.length}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel: Detail & Ficha */}
      <div className="md:col-span-2 space-y-6">
        {selectedCustomer ? (
          <div className="grid gap-6">
            {/* General & Contact form */}
            <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-3">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>👤</span> Ficha de {term.customer}: <span className="text-indigo-600 dark:text-indigo-400">{selectedCustomer.name}</span>
                </h3>
                <div className="flex items-center gap-3">
                  {saveSuccess && (
                    <span className="text-xs font-semibold text-emerald-500 animate-fade-in">
                      ✅ Guardado
                    </span>
                  )}
                  {error && (
                    <span className="text-xs font-semibold text-red-500">
                      ⚠ {error}
                    </span>
                  )}
                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-4 text-xs transition shadow-sm disabled:opacity-50"
                    disabled={saving}
                  >
                    {saving ? 'Guardando...' : '💾 Guardar Ficha'}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre completo *</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Teléfono / WhatsApp</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. +593 99..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Correo electrónico</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Cédula / Pasaporte / DNI</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                    value={docId}
                    onChange={(e) => setDocId(e.target.value)}
                    placeholder="Ej. 0912345678"
                  />
                </div>
              </div>

              {/* Hostal specific fields */}
              {isHostal && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-sky-500 uppercase tracking-wider">🏨 Registro de Registro de Alojamiento (Hostal)</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Nacionalidad / Ciudad Origen</label>
                      <input
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value)}
                        placeholder="Ej. Ecuador / Guayaquil, Argentina..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Contacto de Emergencia</label>
                      <input
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                        placeholder="Ej. María Pérez (Familiar) +593..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* General notes */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-400 mb-1">Notas especiales del {term.customer.toLowerCase()}</label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 min-h-[90px] resize-y"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Preferencias de habitación, observaciones de estadía, cliente VIP..."
                />
              </div>

              {/* Danger zone: Delete guest */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                {deleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-500 font-bold">¿Seguro de eliminar este registro?</span>
                    <button
                      type="button"
                      onClick={handleDeleteCustomer}
                      className="px-3 py-1 rounded bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
                    >
                      Sí, Eliminar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(false)}
                      className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(true)}
                    className="text-xs text-red-500 hover:text-red-400 font-bold hover:underline"
                  >
                    🗑️ Eliminar Ficha de {term.customer}
                  </button>
                )}
              </div>
            </form>

            {/* Booking History */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-4">
                📅 Historial de {term.bookings} ({selectedCustomer.reservations.length})
              </h4>
              {selectedCustomer.reservations.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-4">
                  Este {term.customer.toLowerCase()} no registra {term.bookings.toLowerCase()} realizadas.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5">Fecha</th>
                        <th className="px-4 py-2.5">Servicio</th>
                        <th className="px-4 py-2.5">Atendido por</th>
                        <th className="px-4 py-2.5">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {selectedCustomer.reservations.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-medium">
                            {new Date(r.startsAt).toLocaleString('es', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="px-4 py-3">{r.service.name}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{r.staff?.name ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.status === 'CONFIRMED'
                                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                                  : r.status === 'COMPLETED'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                  : r.status === 'PENDING'
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                  : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-sm text-slate-400 dark:text-slate-500 italic">
            Selecciona un {term.customer.toLowerCase()} del panel izquierdo para ver su ficha de detalles o crea uno nuevo con el botón superior.
          </div>
        )}
      </div>

      {/* Modal para Registrar Nuevo Huésped / Cliente */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>👤+</span> Registrar Nuevo {term.customer}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cédula / Pasaporte / DNI</label>
                  <input
                    type="text"
                    placeholder="Ej. 0912345678"
                    value={createForm.docId}
                    onChange={(e) => setCreateForm({ ...createForm, docId: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ej. +593 99..."
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    placeholder="juan@ejemplo.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nacionalidad / Origen</label>
                  <input
                    type="text"
                    placeholder="Ej. Ecuador / Guayaquil"
                    value={createForm.nationality}
                    onChange={(e) => setCreateForm({ ...createForm, nationality: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notas especiales o preferencias</label>
                <textarea
                  placeholder="Observaciones de estadía, alergias, preferencias..."
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white min-h-[70px] resize-y"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow"
                >
                  {creating ? 'Registrando…' : `💾 Registrar ${term.customer}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
