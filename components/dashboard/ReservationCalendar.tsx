'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

const locales = {
  es: es,
  en: enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type ReservationEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  serviceName: string;
  resourceName: string | null;
  staffName: string | null;
  notes: string | null;
};

type Props = {
  slug: string;
  initialEvents: ReservationEvent[];
  locale: string;
};

export function ReservationCalendar({ slug, initialEvents, locale }: Props) {
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = useState<ReservationEvent | null>(null);
  const [events, setEvents] = useState<ReservationEvent[]>(initialEvents);
  const [view, setView] = useState<any>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [updating, setUpdating] = useState(false);

  // Reschedule state
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleStart, setRescheduleStart] = useState('');
  const [rescheduleEnd, setRescheduleEnd] = useState('');

  const getEventProp = (event: ReservationEvent) => {
    let backgroundColor = '#3b82f6';
    let borderColor = '#2563eb';

    switch (event.status) {
      case 'PENDING':
        backgroundColor = '#f59e0b';
        borderColor = '#d97706';
        break;
      case 'COMPLETED':
        backgroundColor = '#10b981';
        borderColor = '#059669';
        break;
      case 'CANCELLED':
      case 'NO_SHOW':
        backgroundColor = '#ef4444';
        borderColor = '#dc2626';
        break;
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color: '#ffffff',
        borderRadius: '6px',
        fontSize: '0.825rem',
        padding: '2px 6px',
        fontWeight: '500',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      },
    };
  };

  const handleSelectEvent = (event: any) => {
    const ev = event as ReservationEvent;
    setSelectedEvent(ev);
    setIsRescheduling(false);
    // Format for datetime-local input
    setRescheduleStart(format(ev.start, "yyyy-MM-dd'T'HH:mm"));
    setRescheduleEnd(format(ev.end, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedEvent) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/tenants/${slug}/bookings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedEvent.id, status: newStatus }),
      });
      if (res.ok) {
        setEvents((prev) =>
          prev.map((e) => (e.id === selectedEvent.id ? { ...e, status: newStatus } : e))
        );
        setSelectedEvent(null);
        router.refresh();
      }
    } catch (err) {
      console.error('Error al actualizar estado:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveReschedule = async () => {
    if (!selectedEvent || !rescheduleStart || !rescheduleEnd) return;
    setUpdating(true);
    try {
      const newStart = new Date(rescheduleStart);
      const newEnd = new Date(rescheduleEnd);

      const res = await fetch(`/api/tenants/${slug}/bookings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedEvent.id,
          startsAt: newStart.toISOString(),
          endsAt: newEnd.toISOString(),
        }),
      });

      if (res.ok) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === selectedEvent.id ? { ...e, start: newStart, end: newEnd } : e
          )
        );
        setSelectedEvent(null);
        setIsRescheduling(false);
        router.refresh();
      }
    } catch (err) {
      console.error('Error al reagendar reserva:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteReservation = async () => {
    if (!selectedEvent || !confirm('¿Estás seguro de eliminar esta reserva?')) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/tenants/${slug}/bookings?id=${selectedEvent.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id));
        setSelectedEvent(null);
        router.refresh();
      }
    } catch (err) {
      console.error('Error al eliminar reserva:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="h-[650px] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm relative text-slate-800 dark:text-slate-200 transition-colors">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        culture={locale === 'es' ? 'es' : 'en'}
        messages={
          locale === 'es'
            ? {
                next: 'Siguiente',
                previous: 'Anterior',
                today: 'Hoy',
                month: 'Mes',
                week: 'Semana',
                day: 'Día',
                agenda: 'Agenda',
                date: 'Fecha',
                time: 'Hora',
                event: 'Reserva',
                noEventsInRange: 'No hay reservas en este rango.',
              }
            : undefined
        }
        eventPropGetter={getEventProp}
        onSelectEvent={handleSelectEvent}
        view={view}
        onView={(newView) => setView(newView)}
        date={date}
        onNavigate={(newDate) => setDate(newDate)}
      />

      {/* Modern Event Detail & Status Edit Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-slate-900 dark:text-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    selectedEvent.status === 'CONFIRMED'
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : selectedEvent.status === 'PENDING'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      : selectedEvent.status === 'COMPLETED'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                  }`}
                >
                  {selectedEvent.status}
                </span>
                <h3 className="text-xl font-bold mt-2">
                  {selectedEvent.serviceName}
                </h3>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl font-light"
                onClick={() => setSelectedEvent(null)}
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 dark:text-slate-500 font-medium w-16">Horario:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {format(selectedEvent.start, 'dd MMM yyyy, HH:mm')} -{' '}
                    {format(selectedEvent.end, 'HH:mm')}
                  </span>
                </div>
              </div>

              {/* Seccion Reagendar */}
              {isRescheduling ? (
                <div className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 p-3 space-y-3 mt-2">
                  <div className="text-xs font-bold text-indigo-400 flex items-center justify-between">
                    <span>🗓️ Reagendar Reserva</span>
                    <button
                      type="button"
                      onClick={() => setIsRescheduling(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Nueva Fecha / Hora Inicio</label>
                    <input
                      type="datetime-local"
                      value={rescheduleStart}
                      onChange={(e) => setRescheduleStart(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Nueva Fecha / Hora Fin</label>
                    <input
                      type="datetime-local"
                      value={rescheduleEnd}
                      onChange={(e) => setRescheduleEnd(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsRescheduling(false)}
                      className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={updating}
                      onClick={handleSaveReschedule}
                      className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow"
                    >
                      {updating ? 'Guardando…' : '💾 Guardar Nueva Fecha'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setIsRescheduling(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold hover:underline flex items-center gap-1"
                  >
                    <span>🗓️ Reagendar Fecha</span>
                  </button>
                </div>
              )}

              <div className="border-t border-slate-100 dark:border-slate-800 my-2 pt-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Detalles del Cliente
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 dark:text-slate-500 w-16">Nombre:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedEvent.customerName}</span>
                </div>
                {selectedEvent.customerEmail && (
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-slate-400 dark:text-slate-500 w-16">Email:</span>
                    <span>{selectedEvent.customerEmail}</span>
                  </div>
                )}
                {selectedEvent.customerPhone && (
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-slate-400 dark:text-slate-500 w-16">Teléfono:</span>
                    <span>{selectedEvent.customerPhone}</span>
                  </div>
                )}
              </div>

              {(selectedEvent.resourceName || selectedEvent.staffName) && (
                <div className="border-t border-slate-100 dark:border-slate-800 my-2 pt-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    Asignación
                  </div>
                  {selectedEvent.resourceName && (
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 dark:text-slate-500 w-16">Recurso:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{selectedEvent.resourceName}</span>
                    </div>
                  )}
                  {selectedEvent.staffName && (
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-slate-400 dark:text-slate-500 w-16">Personal:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{selectedEvent.staffName}</span>
                    </div>
                  )}
                </div>
              )}

              {selectedEvent.notes && (
                <div className="border-t border-slate-100 dark:border-slate-800 my-2 pt-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                    Notas
                  </div>
                  <p className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg text-slate-600 dark:text-slate-300 text-xs italic">
                    "{selectedEvent.notes}"
                  </p>
                </div>
              )}
            </div>

            {/* Editing Action Buttons */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Acciones de Estado
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={updating || selectedEvent.status === 'CONFIRMED'}
                  onClick={() => handleUpdateStatus('CONFIRMED')}
                  className="rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 px-3 py-1.5 text-xs font-semibold border border-blue-200 dark:border-blue-800 transition disabled:opacity-40"
                >
                  ✅ Confirmar
                </button>
                <button
                  type="button"
                  disabled={updating || selectedEvent.status === 'COMPLETED'}
                  onClick={() => handleUpdateStatus('COMPLETED')}
                  className="rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 px-3 py-1.5 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 transition disabled:opacity-40"
                >
                  🏁 Completar
                </button>
                <button
                  type="button"
                  disabled={updating || selectedEvent.status === 'CANCELLED'}
                  onClick={() => handleUpdateStatus('CANCELLED')}
                  className="rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 px-3 py-1.5 text-xs font-semibold border border-amber-200 dark:border-amber-800 transition disabled:opacity-40"
                >
                  ❌ Cancelar
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={handleDeleteReservation}
                  className="rounded-lg bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 px-3 py-1.5 text-xs font-semibold border border-red-200 dark:border-red-800 transition disabled:opacity-40"
                >
                  🗑️ Eliminar
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  onClick={() => setSelectedEvent(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
