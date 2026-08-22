'use client';

import React, { useState } from 'react';

export interface VitalSigns {
  bloodPressure?: string; // ej. 120/80
  heartRate?: number;     // bpm
  temperature?: number;   // °C
  weightKg?: number;      // kg
  heightCm?: number;      // cm
  bmi?: number;           // IMC calculado automáticamente
}

export interface ConsultationRecord {
  id: string;
  date: string;
  doctorName?: string;
  reason: string;         // Motivo de consulta
  vitals?: VitalSigns;
  subjective?: string;     // S
  objective?: string;      // O
  assessment?: string;     // A (Diagnóstico)
  plan?: string;           // P (Receta y plan)
}

interface ClinicalHistoryProps {
  allergies: string;
  setAllergies: (val: string) => void;
  bloodType: string;
  setBloodType: (val: string) => void;
  bloodPressure: string;
  setBloodPressure: (val: string) => void;
  currentMedications: string;
  setCurrentMedications: (val: string) => void;
  antecedents: string;
  setAntecedents: (val: string) => void;
  diagnosis: string;
  setDiagnosis: (val: string) => void;
  consultations?: ConsultationRecord[];
  onAddConsultation?: (consultation: ConsultationRecord) => void;
  readOnly?: boolean;
}

export function ClinicalHistory({
  allergies,
  setAllergies,
  bloodType,
  setBloodType,
  bloodPressure,
  setBloodPressure,
  currentMedications,
  setCurrentMedications,
  antecedents,
  setAntecedents,
  diagnosis,
  setDiagnosis,
  consultations = [],
  onAddConsultation,
  readOnly = false,
}: ClinicalHistoryProps) {
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [expandedConsultationId, setExpandedConsultationId] = useState<string | null>(null);

  // New consultation form state
  const [newReason, setNewReason] = useState('');
  const [newDoctor, setNewDoctor] = useState('');
  const [newBp, setNewBp] = useState('');
  const [newHr, setNewHr] = useState('');
  const [newTemp, setNewTemp] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newHeight, setNewHeight] = useState('');
  const [newS, setNewS] = useState('');
  const [newO, setNewO] = useState('');
  const [newA, setNewA] = useState('');
  const [newP, setNewP] = useState('');

  // Calculate IMC (BMI)
  const weightVal = parseFloat(newWeight);
  const heightM = parseFloat(newHeight) / 100;
  const bmiVal = weightVal > 0 && heightM > 0 ? (weightVal / (heightM * heightM)).toFixed(1) : null;

  function handleCreateConsultation(e: React.FormEvent) {
    e.preventDefault();
    if (!newReason.trim()) return;

    const record: ConsultationRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      doctorName: newDoctor.trim() || 'Dr. General',
      reason: newReason.trim(),
      vitals: {
        bloodPressure: newBp || undefined,
        heartRate: newHr ? parseInt(newHr) : undefined,
        temperature: newTemp ? parseFloat(newTemp) : undefined,
        weightKg: weightVal || undefined,
        heightCm: parseFloat(newHeight) || undefined,
        bmi: bmiVal ? parseFloat(bmiVal) : undefined,
      },
      subjective: newS.trim() || undefined,
      objective: newO.trim() || undefined,
      assessment: newA.trim() || undefined,
      plan: newP.trim() || undefined,
    };

    if (onAddConsultation) {
      onAddConsultation(record);
    }

    // Reset form
    setNewReason('');
    setNewDoctor('');
    setNewBp('');
    setNewHr('');
    setNewTemp('');
    setNewWeight('');
    setNewHeight('');
    setNewS('');
    setNewO('');
    setNewA('');
    setNewP('');
    setShowConsultationModal(false);
  }

  return (
    <div className="space-y-8">
      {/* Antecedentes Médicos de Ficha General */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>📋</span> Ficha de Antecedentes y Perfil Médico Basal
          </h3>
          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 px-3 py-1 rounded-xl border border-rose-200/50 dark:border-rose-900">
            🏥 Categoría Salud
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              ⚠️ Alergias (Medicamentos/Alimentos)
            </label>
            <input
              disabled={readOnly}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="Ej. Penicilina, AINEs, Mariscos..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              🩸 Grupo Sanguíneo y Rh
            </label>
            <input
              disabled={readOnly}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200"
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value)}
              placeholder="Ej. O Positivo (O+)"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              🫀 Presión Arterial Basal
            </label>
            <input
              disabled={readOnly}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-medium"
              value={bloodPressure}
              onChange={(e) => setBloodPressure(e.target.value)}
              placeholder="Ej. 120/80 mmHg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              💊 Medicación Habitual
            </label>
            <input
              disabled={readOnly}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-medium"
              value={currentMedications}
              onChange={(e) => setCurrentMedications(e.target.value)}
              placeholder="Ej. Losartán 50mg, Metformina..."
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              📜 Antecedentes Personales y Cirugías
            </label>
            <textarea
              disabled={readOnly}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-medium min-h-[75px]"
              value={antecedents}
              onChange={(e) => setAntecedents(e.target.value)}
              placeholder="Diabetes tipo 2, Apendicectomía en 2018, Hipertensión..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              📌 Diagnóstico Principal y Alertas Médicas
            </label>
            <textarea
              disabled={readOnly}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-medium min-h-[75px]"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Diagnóstico de seguimiento o notas permanentes de atención..."
            />
          </div>
        </div>
      </div>

      {/* Consultas Médicas & Evolución Timeline (SOAP Notes) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>🩺</span> Historial de Consultas Médicas y Notas de Evolución (SOAP)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Registro cronológico de atenciones médicas, signos vitales, diagnósticos y recetas.
            </p>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowConsultationModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition shadow-sm"
            >
              <span>➕ Nueva Consulta Médica</span>
            </button>
          )}
        </div>

        {/* Timeline of past consultations */}
        {consultations.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs italic">
            No hay atenciones médicas registradas aún para este paciente. Haz clic en "Nueva Consulta Médica" para crear el primer registro.
          </div>
        ) : (
          <div className="space-y-4">
            {consultations.map((c) => {
              const isExpanded = expandedConsultationId === c.id;
              const dateStr = new Date(c.date).toLocaleDateString('es-EC', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-5 space-y-3 transition hover:border-indigo-300 dark:hover:border-indigo-700"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-base shrink-0">
                        🩺
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                          {c.reason}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {dateStr} • Atendido por <span className="font-bold text-slate-700 dark:text-slate-300">{c.doctorName || 'Dr. Médico'}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedConsultationId(isExpanded ? null : c.id)}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline self-start sm:self-auto"
                    >
                      {isExpanded ? 'Ver menos ▲' : 'Ver detalle SOAP ▼'}
                    </button>
                  </div>

                  {/* Vitals Summary Pill Bar */}
                  {c.vitals && (
                    <div className="flex flex-wrap gap-2 text-[11px] font-semibold pt-1">
                      {c.vitals.bloodPressure && (
                        <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300">
                          🫀 PA: {c.vitals.bloodPressure}
                        </span>
                      )}
                      {c.vitals.heartRate && (
                        <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300">
                          💓 FC: {c.vitals.heartRate} bpm
                        </span>
                      )}
                      {c.vitals.temperature && (
                        <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300">
                          🌡️ T°: {c.vitals.temperature} °C
                        </span>
                      )}
                      {c.vitals.weightKg && (
                        <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300">
                          ⚖️ Peso: {c.vitals.weightKg} kg
                        </span>
                      )}
                      {c.vitals.bmi && (
                        <span className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg font-bold">
                          📊 IMC: {c.vitals.bmi}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expanded SOAP Detail */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 grid gap-3 sm:grid-cols-2 text-xs">
                      {c.subjective && (
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block mb-1">
                            S - Subjetivo (Anamnesis / Sintomatología)
                          </span>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{c.subjective}</p>
                        </div>
                      )}

                      {c.objective && (
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="font-extrabold text-sky-600 dark:text-sky-400 block mb-1">
                            O - Objetivo (Examen Físico / Hallazgos)
                          </span>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{c.objective}</p>
                        </div>
                      )}

                      {c.assessment && (
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="font-extrabold text-rose-600 dark:text-rose-400 block mb-1">
                            A - Análisis / Diagnóstico (CIE-10)
                          </span>
                          <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{c.assessment}</p>
                        </div>
                      )}

                      {c.plan && (
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 block mb-1">
                            P - Plan / Tratamiento y Receta
                          </span>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{c.plan}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Nueva Consulta Médica (SOAP) */}
      {showConsultationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>🩺</span> Registrar Nueva Consulta Médica (Evolución SOAP)
              </h3>
              <button
                type="button"
                onClick={() => setShowConsultationModal(false)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateConsultation} className="space-y-4 text-xs">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Motivo de Consulta *
                  </label>
                  <input
                    required
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-medium"
                    placeholder="Ej. Dolor abdominal de 24h, Chequeo de rutina..."
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Médico / Especialista Tratante
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-medium"
                    placeholder="Ej. Dr. Juan Pérez (Medicina General)"
                    value={newDoctor}
                    onChange={(e) => setNewDoctor(e.target.value)}
                  />
                </div>
              </div>

              {/* Vitals inputs */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl space-y-2 border border-slate-100 dark:border-slate-800">
                <span className="font-extrabold text-slate-800 dark:text-slate-200 block text-xs">
                  📊 Signos Vitales y Antropometría
                </span>
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-5">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500">Presión (mmHg)</label>
                    <input
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs"
                      placeholder="120/80"
                      value={newBp}
                      onChange={(e) => setNewBp(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500">FC (bpm)</label>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs"
                      placeholder="75"
                      value={newHr}
                      onChange={(e) => setNewHr(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500">Temp (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs"
                      placeholder="36.5"
                      value={newTemp}
                      onChange={(e) => setNewTemp(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500">Peso (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs"
                      placeholder="70"
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500">Talla (cm)</label>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs"
                      placeholder="170"
                      value={newHeight}
                      onChange={(e) => setNewHeight(e.target.value)}
                    />
                  </div>
                </div>
                {bmiVal && (
                  <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    Calculado automáticamente - IMC: {bmiVal} kg/m²
                  </div>
                )}
              </div>

              {/* SOAP Form fields */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    S - Subjetivo (Síntomas expresados)
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-medium min-h-[60px]"
                    placeholder="Paciente refiere dolor de cabeza de 2 días de evolución..."
                    value={newS}
                    onChange={(e) => setNewS(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    O - Objetivo (Examen físico)
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-medium min-h-[60px]"
                    placeholder="Abdomen suave, no doloroso a la palpación profunda..."
                    value={newO}
                    onChange={(e) => setNewO(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  A - Diagnóstico / Impresión Clínica (CIE-10)
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-bold text-rose-600 dark:text-rose-400"
                  placeholder="Ej. K02.1 - Caries de la dentina / J00 - Nasofaringitis aguda"
                  value={newA}
                  onChange={(e) => setNewA(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  P - Plan de Tratamiento, Receta Médica e Indicaciones
                </label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-medium min-h-[70px]"
                  placeholder="1. Paracetamol 500mg cada 8 horas por 3 días&#10;2. Reposo relativo por 24 horas&#10;3. Control en 7 días..."
                  value={newP}
                  onChange={(e) => setNewP(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConsultationModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-sm"
                >
                  Guardar Consulta Médica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
