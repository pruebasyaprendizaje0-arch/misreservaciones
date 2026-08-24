'use client';

import { useState, useEffect } from 'react';

type CustomSeason = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  priceMultiplier: number;
  fixedPriceUSD?: number | null;
  active?: boolean;
};

type PricingRules = {
  weekendMultiplier: number; // 1.0 = normal, 1.2 = +20%
  customSeasons: CustomSeason[];
};

type Props = {
  slug: string;
};

export function PricingRulesModal({ slug }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [weekendIncreasePercent, setWeekendIncreasePercent] = useState<number>(0);
  const [seasons, setSeasons] = useState<CustomSeason[]>([]);

  // New Season Form state
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newIncreasePercent, setNewIncreasePercent] = useState(20);

  useEffect(() => {
    if (isOpen) {
      fetchRules();
    }
  }, [isOpen]);

  async function fetchRules() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${slug}/pricing-rules`);
      if (res.ok) {
        const data = await res.json();
        const rules: PricingRules = data.rules;
        const mult = rules.weekendMultiplier || 1.0;
        setWeekendIncreasePercent(Math.round((mult - 1) * 100));
        setSeasons(rules.customSeasons || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleAddSeason(e: React.FormEvent) {
    e.preventDefault();
    if (!newSeasonName || !newStartDate || !newEndDate) return;

    const newSeason: CustomSeason = {
      id: Date.now().toString(),
      name: newSeasonName,
      startDate: newStartDate,
      endDate: newEndDate,
      priceMultiplier: 1 + newIncreasePercent / 100,
      active: true,
    };

    setSeasons((prev) => [...prev, newSeason]);
    setNewSeasonName('');
    setNewStartDate('');
    setNewEndDate('');
    setNewIncreasePercent(20);
  }

  function handleToggleSeasonActive(id: string) {
    setSeasons((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: s.active === false ? true : false } : s))
    );
  }

  function handleRemoveSeason(id: string) {
    setSeasons((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleSaveAll() {
    setSaving(true);
    setSaved(false);

    const payload: PricingRules = {
      weekendMultiplier: 1 + weekendIncreasePercent / 100,
      customSeasons: seasons,
    };

    try {
      const res = await fetch(`/api/tenants/${slug}/pricing-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 text-xs font-semibold transition"
      >
        <span>💲</span> Tarifas y Temporadas
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>💰</span> Configuración de Tarifas y Temporadas
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Define incrementos de precio automáticos para fines de semana, feriados y temporadas altas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
                Cargando configuración de tarifas…
              </div>
            ) : (
              <div className="space-y-6">
                {/* Fin de semana */}
                <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 space-y-3">
                  <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <span>🗓️</span> Tarifa Fin de Semana (Viernes, Sábado y Domingo)
                  </h3>
                  <div className="flex items-center gap-4">
                    <label className="text-xs text-slate-300">Aumento porcentual en fines de semana:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={weekendIncreasePercent}
                        onChange={(e) => setWeekendIncreasePercent(Number(e.target.value))}
                        className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-bold text-white text-center"
                      />
                      <span className="text-sm font-bold text-slate-300">%</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    {weekendIncreasePercent > 0
                      ? `Las reservas que incluyan viernes, sábado o domingo costarán un ${weekendIncreasePercent}% más.`
                      : 'Sin incremento en fines de semana.'}
                  </p>
                </div>

                {/* Temporadas y Festivos */}
                <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 space-y-4">
                  <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                    <span>🌴</span> Temporadas Altas y Festivos Especificados
                  </h3>

                  {/* Form para agregar temporada */}
                  <form onSubmit={handleAddSeason} className="rounded-lg border border-slate-700 bg-slate-900 p-4 grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre del Festivo / Temporada</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Feriado de Carnaval 2026, Fin de Año"
                        value={newSeasonName}
                        onChange={(e) => setNewSeasonName(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Fecha Inicio</label>
                      <input
                        type="date"
                        required
                        value={newStartDate}
                        onChange={(e) => setNewStartDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Fecha Fin</label>
                      <input
                        type="date"
                        required
                        value={newEndDate}
                        onChange={(e) => setNewEndDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-300">Aumento:</label>
                        <input
                          type="number"
                          min="1"
                          max="300"
                          value={newIncreasePercent}
                          onChange={(e) => setNewIncreasePercent(Number(e.target.value))}
                          className="w-20 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-bold text-white text-center"
                        />
                        <span className="text-sm font-bold text-slate-300">%</span>
                      </div>
                      <button
                        type="submit"
                        className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 transition"
                      >
                        + Agregar Temporada
                      </button>
                    </div>
                  </form>

                  {/* Lista de temporadas configuradas */}
                  {seasons.length > 0 ? (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Temporadas Activas</label>
                      <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden bg-slate-900">
                        {seasons.map((s) => {
                          const percent = Math.round((s.priceMultiplier - 1) * 100);
                          const isActive = s.active !== false;
                          return (
                            <div key={s.id} className="flex items-center justify-between p-3 text-sm">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-white">{s.name}</p>
                                  <span
                                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                      isActive
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-slate-700 text-slate-400 border border-slate-600'
                                    }`}
                                  >
                                    {isActive ? 'Activa' : 'Pausada'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  📅 {s.startDate} al {s.endDate} · Aumento: <span className="font-bold text-emerald-400">+{percent}%</span>
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSeasonActive(s.id)}
                                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition ${
                                    isActive
                                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                                  }`}
                                >
                                  {isActive ? '⏸ Pausar' : '▶ Activar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSeason(s.id)}
                                  className="text-xs text-red-400 hover:text-red-300 font-bold px-2 py-1"
                                >
                                  🗑️ Eliminar
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic text-center py-2">No hay festivos ni temporadas especiales registradas.</p>
                  )}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-slate-800 text-slate-300 hover:text-white px-4 py-2 text-xs font-semibold"
              >
                Cerrar
              </button>
              <div className="flex items-center gap-3">
                {saved && <span className="text-xs text-emerald-400 font-bold">✅ ¡Tarifas guardadas!</span>}
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 text-xs font-bold transition"
                >
                  {saving ? 'Guardando…' : '💾 Guardar Configuración'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
