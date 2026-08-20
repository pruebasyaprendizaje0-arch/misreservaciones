'use client';

import { useState, useEffect } from 'react';

type BlockedException = {
  id: string;
  date: string;
  reason?: string | null;
  blocked: boolean;
};

type Props = {
  slug: string;
  onUpdated?: () => void;
};

export function BlockDatesModal({ slug, onUpdated }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [blocks, setBlocks] = useState<BlockedException[]>([]);

  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) fetchBlocks();
  }, [isOpen]);

  async function fetchBlocks() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${slug}/blocked-dates`);
      if (res.ok) {
        const data = await res.json();
        setBlocks(data.exceptions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tenants/${slug}/blocked-dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, reason, blocked: true }),
      });
      if (res.ok) {
        setDate('');
        setReason('');
        await fetchBlocks();
        onUpdated?.();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnblock(id: string) {
    try {
      const res = await fetch(`/api/tenants/${slug}/blocked-dates?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setBlocks((prev) => prev.filter((b) => b.id !== id));
        onUpdated?.();
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 text-xs font-semibold transition"
      >
        <span>🚫</span> Bloquear Fechas
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🚫</span> Bloqueo de Fechas (Cierre / Mantenimiento)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Inhabilita fechas específicas para evitar que clientes realicen reservas.
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

            {/* Form de bloqueo */}
            <form onSubmit={handleAddBlock} className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 space-y-3">
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider">Bloquear Nueva Fecha</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Fecha a bloquear *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Motivo (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej: Mantenimiento, Evento privado"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 transition"
                >
                  {submitting ? 'Bloqueando…' : '🚫 Bloquear Fecha'}
                </button>
              </div>
            </form>

            {/* Lista de fechas bloqueadas */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fechas Bloqueadas Activas</h3>
              {loading ? (
                <p className="text-xs text-slate-400 text-center py-4 animate-pulse">Cargando fechas bloqueadas…</p>
              ) : blocks.length > 0 ? (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-900">
                  {blocks.map((b) => {
                    const formattedDate = new Date(b.date).toLocaleDateString('es-EC', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    });
                    return (
                      <div key={b.id} className="flex items-center justify-between p-3 text-sm">
                        <div>
                          <p className="font-bold text-red-300 flex items-center gap-1.5 capitalize">
                            <span>🛑</span> {formattedDate}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{b.reason || 'Sin motivo especificado'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUnblock(b.id)}
                          className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 font-semibold px-3 py-1 rounded-lg border border-slate-700 transition"
                        >
                          Desbloquear
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-4">No hay fechas bloqueadas actualmente.</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-slate-800 text-slate-300 hover:text-white px-4 py-2 text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
