'use client';

import { useState } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useTranslations } from 'next-intl';

// Define locales for date-fns localizer
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
  initialEvents: ReservationEvent[];
  locale: string;
};

export function ReservationCalendar({ initialEvents, locale }: Props) {
  const t = useTranslations('dashboard');
  const tb = useTranslations('booking');
  const [selectedEvent, setSelectedEvent] = useState<ReservationEvent | null>(null);
  const [view, setView] = useState<any>(Views.MONTH);
  const [date, setDate] = useState(new Date());

  // Map status to dynamic background/border colors
  const getEventProp = (event: ReservationEvent) => {
    let backgroundColor = '#3b82f6'; // blue-500 (CONFIRMED/default)
    let borderColor = '#2563eb';

    switch (event.status) {
      case 'PENDING':
        backgroundColor = '#f59e0b'; // amber-500
        borderColor = '#d97706';
        break;
      case 'COMPLETED':
        backgroundColor = '#10b981'; // emerald-500
        borderColor = '#059669';
        break;
      case 'CANCELLED':
      case 'NO_SHOW':
        backgroundColor = '#ef4444'; // red-500
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
    setSelectedEvent(event as ReservationEvent);
  };

  return (
    <div className="h-[650px] bg-white rounded-xl border border-slate-100 p-4 shadow-sm relative text-slate-800">
      <Calendar
        localizer={localizer}
        events={initialEvents}
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

      {/* Modern Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    selectedEvent.status === 'CONFIRMED'
                      ? 'bg-blue-50 text-blue-700'
                      : selectedEvent.status === 'PENDING'
                      ? 'bg-amber-50 text-amber-700'
                      : selectedEvent.status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {selectedEvent.status}
                </span>
                <h3 className="text-xl font-bold text-slate-950 mt-2">
                  {selectedEvent.serviceName}
                </h3>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 transition-colors text-2xl font-light"
                onClick={() => setSelectedEvent(null)}
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-sm text-slate-700">
              <div className="flex items-center gap-3">
                <span className="text-slate-400 font-medium w-16">Horario:</span>
                <span className="font-semibold text-slate-900">
                  {format(selectedEvent.start, 'dd MMM yyyy, HH:mm')} -{' '}
                  {format(selectedEvent.end, 'HH:mm')}
                </span>
              </div>

              <div className="border-t border-slate-100 my-2 pt-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Detalles del Cliente
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 w-16">Nombre:</span>
                  <span className="font-medium text-slate-900">{selectedEvent.customerName}</span>
                </div>
                {selectedEvent.customerEmail && (
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-slate-400 w-16">Email:</span>
                    <span className="text-slate-900">{selectedEvent.customerEmail}</span>
                  </div>
                )}
                {selectedEvent.customerPhone && (
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-slate-400 w-16">Teléfono:</span>
                    <span className="text-slate-900">{selectedEvent.customerPhone}</span>
                  </div>
                )}
              </div>

              {(selectedEvent.resourceName || selectedEvent.staffName) && (
                <div className="border-t border-slate-100 my-2 pt-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    Asignación
                  </div>
                  {selectedEvent.resourceName && (
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 w-16">Recurso:</span>
                      <span className="font-medium text-slate-900">{selectedEvent.resourceName}</span>
                    </div>
                  )}
                  {selectedEvent.staffName && (
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-slate-400 w-16">Personal:</span>
                      <span className="font-medium text-slate-900">{selectedEvent.staffName}</span>
                    </div>
                  )}
                </div>
              )}

              {selectedEvent.notes && (
                <div className="border-t border-slate-100 my-2 pt-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                    Notas de Reserva
                  </div>
                  <p className="bg-slate-50 p-2.5 rounded-lg text-slate-600 text-xs italic">
                    "{selectedEvent.notes}"
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="btn-secondary text-sm px-4 py-2"
                onClick={() => setSelectedEvent(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
