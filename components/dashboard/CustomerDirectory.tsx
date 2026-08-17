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
  
  // Edit state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  
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

  // Sync form fields when selected customer changes
  useEffect(() => {
    if (selectedCustomer) {
      setName(selectedCustomer.name);
      setEmail(selectedCustomer.email ?? '');
      setPhone(selectedCustomer.phone ?? '');
      setNotes(selectedCustomer.notes ?? '');

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
    }
  }, [selectedId, selectedCustomer, industry]);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q))
    );
  });

  // Industry specific terminology
  const term = {
    customer: industry === 'MEDICO' ? 'Paciente' : industry === 'HOSTAL' ? 'Huésped' : 'Cliente',
    customers: industry === 'MEDICO' ? 'Pacientes' : industry === 'HOSTAL' ? 'Huéspedes' : 'Clientes',
    bookings: industry === 'MEDICO' ? 'Consultas' : industry === 'HOSTAL' ? 'Estadías' : 'Reservas',
    staff: industry === 'MEDICO' ? 'Médico' : industry === 'HOSTAL' ? 'Personal' : industry === 'Estilista/Terapeuta',
  };

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
        }),
      });

      if (!res.ok) {
        throw new Error('Error al actualizar la ficha');
      }

      const data = await res.json();
      
      // Update local state
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

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Left panel: Search & list */}
      <div className="md:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[70vh]">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <input
            className="input w-full bg-white"
            type="search"
            placeholder={`Buscar por nombre o teléfono...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400 italic">
              No se encontraron {term.customers.toLowerCase()}.
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center justify-between ${
                  selectedId === c.id ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : ''
                }`}
              >
                <div>
                  <h4 className="font-bold text-slate-800 text-sm leading-snug">{c.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{c.phone || c.email || 'Sin contacto'}</p>
                </div>
                <span className="text-xs font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                  {c.reservations.length}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel: Detail & Ficha */}
      <div className="md:col-span-2 space-y-6">
        {selectedCustomer ? (
          <div className="grid gap-6">
            {/* General & Contact form */}
            <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>👤</span> Ficha de {term.customer}: <span className="text-indigo-600">{selectedCustomer.name}</span>
                </h3>
                <div className="flex items-center gap-3">
                  {saveSuccess && (
                    <span className="text-xs font-semibold text-emerald-600 animate-fade-in">
                      ✅ Guardado
                    </span>
                  )}
                  {error && (
                    <span className="text-xs font-semibold text-red-600">
                      ⚠ {error}
                    </span>
                  )}
                  <button type="submit" className="btn-primary py-1.5 text-xs px-4" disabled={saving}>
                    {saving ? 'Guardando...' : '💾 Guardar Ficha'}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Nombre completo</label>
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Teléfono de contacto</label>
                  <input
                    className="input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. +593..."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Correo electrónico</label>
                  <input
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                  />
                </div>
              </div>

              {/* Dynamic wellness/medical/general records */}
              {industry === 'MEDICO' && (
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide">🩺 Ficha Clínica (Historial Médico)</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Alergias conocidas</label>
                      <input
                        className="input"
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                        placeholder="Ej. Penicilina, mariscos, etc."
                      />
                    </div>
                    <div>
                      <label className="label">Presión Arterial (Último control)</label>
                      <input
                        className="input"
                        value={bloodPressure}
                        onChange={(e) => setBloodPressure(e.target.value)}
                        placeholder="Ej. 120/80"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Antecedentes Clínicos / Patologías</label>
                      <textarea
                        className="input min-h-[60px] resize-y"
                        value={antecedents}
                        onChange={(e) => setAntecedents(e.target.value)}
                        placeholder="Hipertensión, diabetes, cirugías previas, etc."
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Diagnóstico y Plan de Tratamiento</label>
                      <textarea
                        className="input min-h-[80px] resize-y"
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        placeholder="Medicamentos recetados, indicaciones de dosis y controles."
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Notas adicionales de consulta</label>
                      <textarea
                        className="input min-h-[80px] resize-y"
                        value={consultationNotes}
                        onChange={(e) => setConsultationNotes(e.target.value)}
                        placeholder="Detalles sobre síntomas referidos, observaciones clínicas..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {industry === 'MASAJE' && (
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide">💆 Perfil de Bienestar y Preferencias</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Presión preferida</label>
                      <select
                        className="input bg-white"
                        value={preferredPressure}
                        onChange={(e) => setPreferredPressure(e.target.value)}
                      >
                        <option value="Suave">Suave (Relajante ligero)</option>
                        <option value="Media">Media (Terapéutico estándar)</option>
                        <option value="Fuerte">Fuerte (Tejido profundo)</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Alergias a aceites/aromas</label>
                      <input
                        className="input"
                        value={oilAllergies}
                        onChange={(e) => setOilAllergies(e.target.value)}
                        placeholder="Ej. Almendras, lavanda, etc."
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Zonas con dolor o a evitar</label>
                      <input
                        className="input"
                        value={painAreas}
                        onChange={(e) => setPainAreas(e.target.value)}
                        placeholder="Ej. Evitar lumbar baja, énfasis en cervicales/hombros"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Preferencias / Notas adicionales de bienestar</label>
                      <textarea
                        className="input min-h-[80px] resize-y"
                        value={wellnessPreferences}
                        onChange={(e) => setWellnessPreferences(e.target.value)}
                        placeholder="Detalles sobre temperatura de cabina, música, camilla..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {industry !== 'MEDICO' && industry !== 'MASAJE' && (
                <div className="pt-4 border-t border-slate-100">
                  <label className="label">Notas generales de cliente</label>
                  <textarea
                    className="input min-h-[100px] resize-y"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Preferencias de estadía, detalles de cortes de cabello anteriores, particularidades..."
                  />
                </div>
              )}
            </form>

            {/* Booking History */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h4 className="font-bold text-slate-800 text-sm mb-4">
                📅 Historial de {term.bookings} ({selectedCustomer.reservations.length})
              </h4>
              {selectedCustomer.reservations.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-4">
                  Este {term.customer.toLowerCase()} no registra {term.bookings.toLowerCase()} realizadas.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-100">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5">Fecha</th>
                        <th className="px-4 py-2.5">Servicio</th>
                        <th className="px-4 py-2.5">Atendido por</th>
                        <th className="px-4 py-2.5">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedCustomer.reservations.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium">
                            {new Date(r.startsAt).toLocaleString('es', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="px-4 py-3">{r.service.name}</td>
                          <td className="px-4 py-3 text-slate-500">{r.staff?.name ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.status === 'CONFIRMED'
                                  ? 'bg-blue-50 text-blue-700'
                                  : r.status === 'COMPLETED'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : r.status === 'PENDING'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-red-50 text-red-700'
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
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-sm text-slate-400 italic">
            Selecciona un {term.customer.toLowerCase()} del panel izquierdo para ver su ficha de detalles.
          </div>
        )}
      </div>
    </div>
  );
}
