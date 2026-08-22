'use client';

import React, { useState, useEffect } from 'react';

export interface DayRule {
  weekday: number; // 0=Sun, 1=Mon, ..., 6=Sat
  active: boolean;
  startTime: string; // "08:00"
  endTime: string;   // "17:00"
}

interface BusinessHoursEditorProps {
  slug: string;
  staffId?: string | null; // null = General Business, string = Staff member
  staffName?: string;
  onSaved?: () => void;
}

const WEEKDAYS = [
  { label: 'Lunes', weekday: 1 },
  { label: 'Martes', weekday: 2 },
  { label: 'Miércoles', weekday: 3 },
  { label: 'Jueves', weekday: 4 },
  { label: 'Viernes', weekday: 5 },
  { label: 'Sábado', weekday: 6 },
  { label: 'Domingo', weekday: 0 },
];

function minToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function timeToMin(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function BusinessHoursEditor({ slug, staffId = null, staffName, onSaved }: BusinessHoursEditorProps) {
  const [useCustomSchedule, setUseCustomSchedule] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [days, setDays] = useState<DayRule[]>(() =>
    WEEKDAYS.map((w) => ({
      weekday: w.weekday,
      active: w.weekday >= 1 && w.weekday <= 5, // Mon-Fri default active
      startTime: '08:00',
      endTime: '17:00',
    }))
  );

  useEffect(() => {
    async function loadRules() {
      setLoading(true);
      try {
        const url = `/api/tenants/${slug}/availability/rules${staffId ? `?staffId=${staffId}` : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const rules: any[] = data.rules || [];

          if (staffId && rules.length === 0) {
            // Staff has no custom rules yet -> set useCustomSchedule to false
            setUseCustomSchedule(false);
          } else {
            if (staffId && rules.length > 0) {
              setUseCustomSchedule(true);
            }
            if (rules.length > 0) {
              setDays((prev) =>
                prev.map((d) => {
                  const match = rules.find((r) => r.weekday === d.weekday);
                  if (match) {
                    return {
                      weekday: d.weekday,
                      active: match.active,
                      startTime: minToTime(match.startMin),
                      endTime: minToTime(match.endMin),
                    };
                  }
                  return d;
                })
              );
            }
          }
        }
      } catch (err) {
        console.error('Error al cargar horarios:', err);
      } finally {
        setLoading(false);
      }
    }

    loadRules();
  }, [slug, staffId]);

  function handleToggleDay(weekday: number) {
    setDays((prev) =>
      prev.map((d) => (d.weekday === weekday ? { ...d, active: !d.active } : d))
    );
  }

  function handleTimeChange(weekday: number, field: 'startTime' | 'endTime', value: string) {
    setDays((prev) =>
      prev.map((d) => (d.weekday === weekday ? { ...d, [field]: value } : d))
    );
  }

  function applyPresetMonToFri() {
    setDays((prev) =>
      prev.map((d) => ({
        ...d,
        active: d.weekday >= 1 && d.weekday <= 5,
        startTime: '08:00',
        endTime: '17:00',
      }))
    );
  }

  function copyFirstActiveToAll() {
    const firstActive = days.find((d) => d.active);
    if (!firstActive) return;
    setDays((prev) =>
      prev.map((d) =>
        d.active
          ? { ...d, startTime: firstActive.startTime, endTime: firstActive.endTime }
          : d
      )
    );
  }

  async function handleSave() {
    setSaving(true);
    setSuccessMsg(false);
    setErrorMsg(null);

    try {
      let rulesPayload: any[] = [];

      if (staffId && !useCustomSchedule) {
        // If staff uses default business schedule, clear staff rules
        rulesPayload = [];
      } else {
        rulesPayload = days.map((d) => ({
          weekday: d.weekday,
          active: d.active,
          startMin: timeToMin(d.startTime),
          endMin: timeToMin(d.endTime),
          staffId: staffId || null,
        }));
      }

      const res = await fetch(`/api/tenants/${slug}/availability/rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: staffId || null,
          rules: rulesPayload,
        }),
      });

      if (!res.ok) throw new Error('Error al guardar los horarios');

      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
      if (onSaved) onSaved();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 animate-pulse">
        Cargando horarios de atención...
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>🗓️</span> {staffId ? `Horario de Trabajo: ${staffName || 'Empleado'}` : 'Horario de Atención del Negocio'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {staffId
              ? 'Configura los días que labora este profesional y sus horas específicas de consulta o atención.'
              : 'Configura los días laborables y las horas de apertura/cierre generales de tu establecimiento.'}
          </p>
        </div>

        {/* Action Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition shadow-sm disabled:opacity-50 self-start sm:self-auto"
        >
          <span>💾</span>
          <span>{saving ? 'Guardando...' : 'Guardar Horario'}</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
          <span>✅</span> Horario guardado correctamente. Las reservas respetarán este horario.
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
          <span>⚠️</span> {errorMsg}
        </div>
      )}

      {/* Staff custom schedule toggle */}
      {staffId && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-4">
          <div>
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
              Modo de Horario del Profesional
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {useCustomSchedule
                ? 'Este profesional tiene días y horas de trabajo personalizados.'
                : 'Este profesional trabaja en el mismo horario general del negocio.'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setUseCustomSchedule(!useCustomSchedule)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition border ${
              useCustomSchedule
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
            }`}
          >
            {useCustomSchedule ? '✏️ Horario Personalizado' : '🏢 Usar Horario del Negocio'}
          </button>
        </div>
      )}

      {/* Days Table List */}
      {(!staffId || useCustomSchedule) && (
        <div className="space-y-4">
          {/* Quick preset buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Ajustes Rápidos:</span>
            <button
              type="button"
              onClick={applyPresetMonToFri}
              className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 transition"
            >
              📅 Lunes a Viernes (08:00 - 17:00)
            </button>
            <button
              type="button"
              onClick={copyFirstActiveToAll}
              className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 transition"
            >
              📋 Copiar primer horario a todos los días
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            {WEEKDAYS.map((w) => {
              const rule = days.find((d) => d.weekday === w.weekday) || {
                weekday: w.weekday,
                active: false,
                startTime: '08:00',
                endTime: '17:00',
              };

              return (
                <div
                  key={w.weekday}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    rule.active
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-slate-50/60 dark:bg-slate-950/40 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Toggle Day active button */}
                    <button
                      type="button"
                      onClick={() => handleToggleDay(w.weekday)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        rule.active ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          rule.active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    <div>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        {w.label}
                      </span>
                      <span className="ml-2 text-xs font-semibold text-slate-400">
                        {rule.active ? '🟢 Laborable' : '🔴 Cerrado / Descanso'}
                      </span>
                    </div>
                  </div>

                  {/* Hours Selector */}
                  {rule.active ? (
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-normal">Apertura:</span>
                        <input
                          type="time"
                          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 font-extrabold text-slate-900 dark:text-slate-100"
                          value={rule.startTime}
                          onChange={(e) => handleTimeChange(w.weekday, 'startTime', e.target.value)}
                        />
                      </div>

                      <span>—</span>

                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-normal">Cierre:</span>
                        <input
                          type="time"
                          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 font-extrabold text-slate-900 dark:text-slate-100"
                          value={rule.endTime}
                          onChange={(e) => handleTimeChange(w.weekday, 'endTime', e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs italic text-slate-400">No se generan turnos de reserva para este día.</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
