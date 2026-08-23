'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';

import { format, addDays } from 'date-fns';
import { TermsModal } from '@/components/TermsModal';

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
  currency: string;
};

type Staff = { id: string; name: string; role?: string | null; email?: string | null; phone?: string | null; serviceIds: string[] };
type Resource = { id: string; name: string; type: string; capacity: number; metadata?: any };

type PaymentDetails = {
  bankName?: string;
  accountType?: string;
  accountNumber?: string;
  accountHolder?: string;
  accountTaxId?: string;
  deunaQrUrl?: string;
  notes?: string;
};

type Props = {
  industry: 'HOSTAL' | 'MASAJE' | 'PELUQUERIA' | 'MEDICO';
  services: Service[];
  staff: Staff[];
  resources: Resource[];
  tenantSlug: string;
  tenantName?: string;
  businessPhone?: string;
  paymentDetails?: PaymentDetails;
};

type Slot = { startsAt: string; endsAt: string; available: boolean; staffId?: string; resourceId?: string };

export function BookingFlow({
  industry,
  services,
  staff,
  resources,
  tenantSlug,
  tenantName,
  businessPhone,
  paymentDetails,
}: Props) {
  const t = useTranslations('booking');
  const locale = useLocale();

  const isHostal = industry === 'HOSTAL';
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function generateGoogleCalendarUrl({
    title,
    description,
    location,
    startDate,
    endDate,
  }: {
    title: string;
    description: string;
    location: string;
    startDate: Date;
    endDate: Date;
  }) {
    const formatGDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${formatGDate(startDate)}/${formatGDate(endDate)}`,
      details: description,
      location: location,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  function downloadIcsFile({
    title,
    description,
    location,
    startDate,
    endDate,
  }: {
    title: string;
    description: string;
    location: string;
    startDate: Date;
    endDate: Date;
  }) {
    const formatIcsDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MisReservaciones//ES',
      'BEGIN:VEVENT',
      `SUMMARY:${title}`,
      `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
      `LOCATION:${location}`,
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reserva-${confirmation || 'confirmada'}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }


  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [serviceId, setServiceId] = useState<string>('');
  const [staffId, setStaffId] = useState<string | undefined>();
  const [resourceId, setResourceId] = useState<string | undefined>();

  // Date selection (Check-in and Check-out for Hostal)
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const [date, setDate] = useState<string>(todayStr); // Check-in
  const [checkOutDate, setCheckOutDate] = useState<string>(tomorrowStr); // Check-out

  const [slots, setSlots] = useState<Slot[]>([]);
  const [scheduleSuggestion, setScheduleSuggestion] = useState<{
    isWorkingDay: boolean;
    workingDaysLabels: string[];
    scheduleText?: string;
    nextAvailableDate?: string;
    reason?: 'NOT_WORKING_DAY' | 'FULLY_BOOKED';
  } | null>(null);

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [chosenSlot, setChosenSlot] = useState<Slot | null>(null);

  // Guest Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const service = services.find((s) => s.id === serviceId);
  const filteredStaff = staff.filter((s) => s.serviceIds.includes(serviceId));
  const filteredResources = isHostal || industry === 'MASAJE' ? resources : [];

  // Calculate number of stay nights for Hostal
  const stayNights = isHostal
    ? Math.max(
        1,
        Math.round(
          (new Date(checkOutDate).getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
        )
      )
    : 1;

  async function loadSlots() {
    if (!serviceId) return;
    setLoadingSlots(true);
    setChosenSlot(null);
    setError(null);
    setScheduleSuggestion(null);

    const params = new URLSearchParams({
      serviceId,
      date,
      ...(isHostal && checkOutDate ? { checkOutDate } : {}),
      tenant: tenantSlug,
    });
    if (staffId) params.set('staffId', staffId);
    if (resourceId) params.set('resourceId', resourceId);

    try {
      const res = await fetch(`/api/bookings/slots?${params.toString()}`);
      setLoadingSlots(false);
      if (!res.ok) {
        setError('No se pudieron cargar las habitaciones/horarios disponibles');
        setSlots([]);
        return;
      }
      const data = await res.json();
      setSlots(data.slots || []);
      setScheduleSuggestion(data.scheduleSuggestion || null);
    } catch (err) {
      console.error(err);
      setLoadingSlots(false);
    }
  }

  // Automatically fetch available slots/rooms when entering Step 3 or changing dates
  useEffect(() => {
    if (step === 3 && serviceId) {
      loadSlots();
    }
  }, [step, serviceId, date, checkOutDate, staffId, resourceId]);

  function handleCheckInChange(newCheckIn: string) {
    setDate(newCheckIn);
    // If checkOut is before or same as checkIn, set checkOut to checkIn + 1 day
    if (new Date(checkOutDate) <= new Date(newCheckIn)) {
      const nextDay = format(addDays(new Date(newCheckIn), 1), 'yyyy-MM-dd');
      setCheckOutDate(nextDay);
    }
  }

  async function submitBooking() {
    if (!chosenSlot || !service) return;
    if (!acceptedTerms) {
      setError('Debes aceptar los Términos del Servicio y la Ley de Protección de Datos Personales (LOPDP Ecuador).');
      return;
    }
    setSubmitting(true);
    setError(null);

    const finalResourceId = chosenSlot.resourceId || resourceId;

    const res = await fetch(`/api/bookings?tenant=${tenantSlug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId,
        staffId,
        resourceId: finalResourceId,
        startsAt: chosenSlot.startsAt,
        endsAt: chosenSlot.endsAt,
        customer: { name, email: email || undefined, phone: phone || undefined, notes: notes || undefined },
        notes: notes || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.error === 'SLOT_TAKEN') {
        setError(t('slotTaken'));
        loadSlots();
        setStep(3);
      } else {
        setError(t('error'));
      }
      return;
    }
    const data = await res.json();
    setConfirmation(data.reservationId);
  }

  if (confirmation) {
    const cleanPhone = (businessPhone || '').replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('593')
      ? cleanPhone
      : cleanPhone.length === 9 || cleanPhone.length === 10
      ? `593${cleanPhone.replace(/^0/, '')}`
      : cleanPhone;

    const waText = encodeURIComponent(
      `Hola ${tenantName || ''}, acabo de realizar la reserva #${confirmation} para el servicio "${service?.name || ''}". Deseo coordinar el pago / enviar mi comprobante.`
    );
    const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${waText}` : '#';

    function copyToClipboard(text: string, field: string) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2500);
      }
    }

    return (
      <div className="card text-center py-10 px-6 sm:px-8 space-y-6 max-w-xl mx-auto shadow-2xl border border-slate-800 rounded-3xl bg-slate-900/95 text-white backdrop-blur-xl">
        <div className="text-6xl animate-bounce">🎉</div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white">{t('success')}</h2>
          <p className="text-slate-300 text-sm font-medium leading-relaxed">{t('successMessage')}</p>
        </div>

        <div className="bg-indigo-950/80 rounded-2xl p-4 border border-indigo-500/40 space-y-1.5 shadow-inner">
          <div className="text-xs font-black text-indigo-300 uppercase tracking-widest">Código de Confirmación</div>
          <div className="font-mono text-lg font-black text-indigo-400 tracking-wider select-all">{confirmation}</div>
        </div>

        {/* Custom Business Owner Note & Payment Terms Banner */}
        {paymentDetails?.notes ? (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-950/60 p-4 text-left space-y-1.5 shadow-lg">
            <div className="font-black text-amber-300 flex items-center gap-2 text-xs uppercase tracking-wider">
              <span className="text-base">📌</span> Nota & Política del Establecimiento
            </div>
            <p className="whitespace-pre-line text-xs font-semibold text-amber-100 leading-relaxed">
              {paymentDetails.notes}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/40 p-3.5 text-left space-y-1 shadow-sm">
            <div className="font-black text-amber-300 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <span>📌</span> Política de Confirmación
            </div>
            <p className="text-xs font-medium text-amber-200 leading-relaxed">
              Recuerda enviar tu comprobante de pago con anticipación para asegurar tu cupo/reserva.
            </p>
          </div>
        )}

        {/* Primary Action Buttons: WhatsApp & Formas de Pago */}
        <div className="space-y-3 pt-2">
          {/* WhatsApp Button */}
          {waPhone && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 px-6 text-sm transition shadow-xl shadow-emerald-950/40 active:scale-98"
            >
              <span className="text-xl">💬</span>
              <span>Enviar Comprobante por WhatsApp</span>
            </a>
          )}

          {/* Formas de Pago Button */}
          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-black py-4 px-6 text-sm transition shadow-xl shadow-indigo-950/40 active:scale-98"
          >
            <span className="text-xl">💳</span>
            <span>Ver Formas de Pago (Transferencia & QR Deuna)</span>
          </button>

          {/* Añadir a mi Calendario Button */}
          <button
            type="button"
            onClick={() => setShowCalendarModal(true)}
            className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black py-4 px-6 text-sm transition shadow-xl shadow-amber-950/40 active:scale-98"
          >
            <span className="text-xl">📅</span>
            <span>Añadir a mi Calendario (Google / Apple / Outlook)</span>
          </button>
        </div>

        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={`/${locale}/${tenantSlug}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-5 py-3 text-xs font-black text-white hover:bg-slate-700 transition shadow-md"
          >
            🏠 Volver al Perfil
          </a>
          <button
            type="button"
            onClick={() => {
              setConfirmation(null);
              setStep(1);
              setChosenSlot(null);
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-xs font-black text-indigo-300 hover:bg-slate-800 transition shadow-md"
          >
            🔄 Hacer Otra Reserva
          </button>
        </div>

        {/* ── MODAL DE FORMAS DE PAGO / TRANSFERENCIA / QR DEUNA ── */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
            <div className="relative w-full max-w-lg bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-800 text-left space-y-5 max-h-[90vh] overflow-y-auto text-white">
              {/* Header Modal */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>💳</span> Formas de Pago Aceptadas
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 font-bold hover:text-white hover:bg-slate-700 transition flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Deuna QR Section */}
              <div className="space-y-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                <div className="font-extrabold text-sm text-white flex items-center gap-2">
                  <span>⚡</span> QR Deuna / Transferencia Inmediata
                </div>
                {paymentDetails?.deunaQrUrl ? (
                  <div className="flex flex-col items-center p-4 bg-slate-900 rounded-xl border border-slate-800 shadow-inner">
                    <img
                      src={paymentDetails.deunaQrUrl}
                      alt="QR Deuna / Pago Directo"
                      className="w-48 h-48 object-contain rounded-lg border border-slate-700 shadow-md"
                    />
                    <span className="text-[11px] font-black text-indigo-300 mt-2.5">
                      Escanea este QR desde tu app Deuna o Banco Pichincha
                    </span>
                  </div>
                ) : (
                  <div className="p-4 text-center bg-indigo-950/50 rounded-xl border border-indigo-500/30">
                    <div className="text-3xl mb-1">📲</div>
                    <div className="text-xs font-bold text-indigo-300">
                      Escaneo de Pago Deuna Disponible
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5 font-medium">
                      Puedes realizar tu pago directo por Deuna o mediante la transferencia bancaria abajo especificada.
                    </div>
                  </div>
                )}
              </div>

              {/* Bank Details Section */}
              <div className="space-y-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                <div className="font-extrabold text-sm text-white flex items-center gap-2">
                  <span>🏦</span> Datos de Transferencia Bancaria
                </div>

                <div className="space-y-2.5 text-xs text-slate-200">
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="font-semibold text-slate-400">Banco:</span>
                    <strong className="font-extrabold text-white">
                      {paymentDetails?.bankName || 'Banco Pichincha'}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="font-semibold text-slate-400">Tipo de Cuenta:</span>
                    <strong className="font-extrabold text-white">
                      {paymentDetails?.accountType || 'Cuenta de Ahorros'}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="font-semibold text-slate-400">Número de Cuenta:</span>
                    <div className="flex items-center gap-2">
                      <strong className="font-mono font-black text-sm text-indigo-400">
                        {paymentDetails?.accountNumber || 'Configurar en perfil'}
                      </strong>
                      {paymentDetails?.accountNumber && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(paymentDetails.accountNumber!, 'accountNumber')}
                          className="px-2 py-1 rounded bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold hover:bg-indigo-900 transition"
                        >
                          {copiedField === 'accountNumber' ? '✓ Copiado' : '📋 Copiar'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="font-semibold text-slate-400">Titular de la Cuenta:</span>
                    <strong className="font-extrabold text-white">
                      {paymentDetails?.accountHolder || tenantName || 'Titular del Negocio'}
                    </strong>
                  </div>

                  {paymentDetails?.accountTaxId && (
                    <div className="flex justify-between items-center py-1">
                      <span className="font-semibold text-slate-400">RUC / Cédula:</span>
                      <div className="flex items-center gap-2">
                        <strong className="font-mono font-extrabold text-white">
                          {paymentDetails.accountTaxId}
                        </strong>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(paymentDetails.accountTaxId!, 'accountTaxId')}
                          className="px-2 py-1 rounded bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold hover:bg-indigo-900 transition"
                        >
                          {copiedField === 'accountTaxId' ? '✓ Copiado' : '📋 Copiar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Business Owner Note Banner in Modal */}
              {paymentDetails?.notes && (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-950/60 p-4 text-xs text-amber-200 leading-relaxed space-y-1.5 shadow-lg">
                  <div className="font-black text-amber-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <span>📌</span> Nota del Establecimiento
                  </div>
                  <p className="whitespace-pre-line font-medium text-amber-100">{paymentDetails.notes}</p>
                </div>
              )}

              {/* Modal Footer / WhatsApp Action */}
              <div className="pt-2">
                {waPhone && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 px-4 text-xs transition shadow-md"
                  >
                    <span>📲 Enviar Comprobante por WhatsApp</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL AÑADIR A MI CALENDARIO ── */}
        {showCalendarModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
            <div className="relative w-full max-w-md bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-800 text-left space-y-5 text-white">
              {/* Header Modal */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>📅</span> Añadir a mi Calendario
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCalendarModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 font-bold hover:text-white hover:bg-slate-700 transition flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Guarda el recordatorio de tu reserva directamente en tu calendario personal para no olvidar tu cita.
              </p>

              {/* Event Details Summary */}
              <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 space-y-1.5 text-xs text-slate-200 shadow-inner">
                <div className="font-extrabold text-indigo-300 text-sm">
                  📌 {service?.name || 'Reserva'}
                </div>
                <div className="font-medium text-slate-400">
                  🏢 {tenantName || 'Establecimiento'}
                </div>
                {chosenSlot && (
                  <div className="font-bold text-white">
                    🗓️ {format(new Date(chosenSlot.startsAt), 'dd/MM/yyyy (HH:mm)')} — {format(new Date(chosenSlot.endsAt), 'HH:mm')}
                  </div>
                )}
                {staffId && (
                  <div className="text-xs font-semibold text-indigo-300">
                    👤 Atendido por: {staff.find((s) => s.id === staffId)?.name || 'Asignación automática'}
                  </div>
                )}
              </div>

              {/* Action Links for Google Calendar and iCal Download */}
              <div className="space-y-3 pt-1">
                {/* Google Calendar Link */}
                <a
                  href={generateGoogleCalendarUrl({
                    title: `Reserva: ${service?.name || 'Cita'} - ${tenantName || 'Negocio'}`,
                    description: `Código de Confirmación: #${confirmation}\nServicio: ${service?.name || ''}\nAtendido por: ${staff.find((s) => s.id === staffId)?.name || 'Asignación automática'}\nEstablecimiento: ${tenantName || ''}`,
                    location: tenantName || 'Establecimiento',
                    startDate: chosenSlot ? new Date(chosenSlot.startsAt) : new Date(),
                    endDate: chosenSlot ? new Date(chosenSlot.endsAt) : new Date(Date.now() + 3600000),
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 transition text-xs font-black text-white shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🗓️</span>
                    <span>Google Calendar (Web / Android)</span>
                  </div>
                  <span className="text-indigo-400 font-bold">→</span>
                </a>

                {/* Apple / iCal Download */}
                <button
                  type="button"
                  onClick={() =>
                    downloadIcsFile({
                      title: `Reserva: ${service?.name || 'Cita'} - ${tenantName || 'Negocio'}`,
                      description: `Código de Confirmación: #${confirmation}\nServicio: ${service?.name || ''}\nAtendido por: ${staff.find((s) => s.id === staffId)?.name || 'Asignación automática'}\nEstablecimiento: ${tenantName || ''}`,
                      location: tenantName || 'Establecimiento',
                      startDate: chosenSlot ? new Date(chosenSlot.startsAt) : new Date(),
                      endDate: chosenSlot ? new Date(chosenSlot.endsAt) : new Date(Date.now() + 3600000),
                    })
                  }
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 transition text-xs font-black text-white shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🍏</span>
                    <span>Apple Calendar / Outlook / iCal (.ics)</span>
                  </div>
                  <span className="text-indigo-400 font-bold">⬇</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Steps Progress */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 text-xs font-semibold text-slate-500 overflow-x-auto no-scrollbar whitespace-nowrap gap-2 sm:gap-4">
        <span className={step >= 1 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>
          1. {isHostal ? 'Tarifa / Servicio' : t('selectService')}
        </span>
        <span className="text-slate-300 dark:text-slate-700">→</span>
        <span className={step >= 2 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>
          2. {isHostal ? 'Habitación (Opcional)' : 'Asignación'}
        </span>
        <span className="text-slate-300 dark:text-slate-700">→</span>
        <span className={step >= 3 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>
          3. {isHostal ? 'Fechas y Turno' : t('selectDate')}
        </span>
        <span className="text-slate-300 dark:text-slate-700">→</span>
        <span className={step >= 4 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>
          4. {t('yourInfo')}
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Step 1: Select Service / Tariff */}
      {step === 1 && (
        <div className="card space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            {isHostal ? 'Selecciona el Tipo de Habitación / Tarifa' : t('selectService')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setServiceId(s.id);
                  setChosenSlot(null);
                  setStep(2);
                }}
                className={`w-full rounded-xl border p-4 text-left transition hover:border-indigo-400 hover:shadow-md ${
                  serviceId === s.id
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-200'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="font-bold text-slate-900 text-base">{s.name}</div>
                {s.description && <div className="mt-1 text-xs text-slate-500 line-clamp-2">{s.description}</div>}
                <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>
                    {isHostal
                      ? `📅 Tarifa por noche`
                      : `⏱ ${s.durationMin} min`}
                  </span>
                  {s.priceCents > 0 && (
                    <span className="text-sm font-extrabold text-slate-900">
                      ${(s.priceCents / 100).toFixed(2)} {s.currency}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Resource / Staff Selection */}
      {step === 2 && (
        <div className="card space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            {isHostal ? 'Preferencias de Habitación (Opcional)' : 'Asignación de Personal / Recurso'}
          </h2>

          {isHostal && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Puedes seleccionar una habitación específica de preferencia o continuar para ver todas las disponibles.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setResourceId(undefined);
                    setStep(3);
                  }}
                  className={`rounded-xl border p-4 text-left font-bold transition ${
                    !resourceId ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  ✨ Cualquiera disponible (Recomendado)
                </button>
                {filteredResources.map((r) => {
                  const photos: string[] = (r.metadata as any)?.photos || [];
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setResourceId(r.id);
                        setStep(3);
                      }}
                      className={`rounded-xl border p-4 text-left transition flex items-center gap-3 ${
                        resourceId === r.id ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      {photos.length > 0 ? (
                        <img src={photos[0]} alt={r.name} className="w-12 h-12 rounded-lg object-cover border" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-xl">🛏️</div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{r.name}</div>
                        <div className="text-xs text-slate-500">👥 Capacidad: {r.capacity} persona(s)</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!isHostal && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 font-medium">
                Selecciona al especialista de tu preferencia que deseas que te atienda, o bien elige asignación automática.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Option 1: Any professional */}
                <button
                  type="button"
                  onClick={() => {
                    setStaffId(undefined);
                  }}
                  className={`rounded-2xl border p-4 text-left font-bold transition flex items-center gap-3 cursor-pointer ${
                    !staffId
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-500 shadow-md'
                      : 'border-slate-200 hover:border-indigo-300 bg-white shadow-xs'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-sm">
                    ✨
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">
                      Cualquier profesional disponible
                    </div>
                    <div className="text-xs text-slate-500 font-normal mt-0.5">
                      Asignación automática según el horario más conveniente
                    </div>
                  </div>
                </button>

                {/* Professional staff cards list */}
                {staff.map((st) => {
                  const isSelected = staffId === st.id;
                  const isAssignedToService = serviceId ? st.serviceIds.includes(serviceId) : true;

                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setStaffId(st.id);
                      }}
                      className={`rounded-2xl border p-4 text-left transition flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-500 shadow-md'
                          : 'border-slate-200 hover:border-indigo-300 bg-white shadow-xs'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black text-base flex items-center justify-center shrink-0 border border-indigo-200/60 shadow-xs">
                        {st.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-slate-900 text-sm truncate">
                          {st.name}
                        </div>
                        <div className="text-xs text-slate-500 font-medium truncate">
                          {st.role || (industry === 'MEDICO' ? 'Médico / Especialista' : industry === 'PELUQUERIA' ? 'Estilista / Profesional' : 'Especialista')}
                        </div>
                        {isAssignedToService && (
                          <span className="inline-block mt-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            Especialista principal
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {staff.length === 0 && (
                <div className="p-4 text-center text-xs italic text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                  No hay profesionales registrados individualmente aún. Se asignará automáticamente el personal disponible.
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
              ← Atrás
            </button>
            <button type="button" className="btn-primary" onClick={() => setStep(3)}>
              {t('next')} →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Date Range & Room Selection */}
      {step === 3 && (
        <div className="card space-y-5">
          {/* Check-in & Check-out Date Pickers for Hostal */}
          {isHostal ? (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🗓️</span> Fechas de Entrada y Salida (Check-in / Check-out)
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">📅 Fecha de Entrada (Check-in)</label>
                  <input
                    type="date"
                    className="input w-full bg-white"
                    value={date}
                    min={todayStr}
                    onChange={(e) => handleCheckInChange(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">🏁 Fecha de Salida (Check-out)</label>
                  <input
                    type="date"
                    className="input w-full bg-white"
                    value={checkOutDate}
                    min={format(addDays(new Date(date), 1), 'yyyy-MM-dd')}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-indigo-900 pt-1">
                <span>🌙 Duración de la Estadía: <span className="text-indigo-600 text-sm font-black">{stayNights} noche(s)</span></span>
                {service && service.priceCents > 0 && (
                  <span>Total estimado: <span className="text-slate-900 text-sm font-extrabold">${((service.priceCents * stayNights) / 100).toFixed(2)} USD</span></span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t('selectDate')}</h2>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="date"
                  className="input max-w-xs"
                  value={date}
                  min={todayStr}
                  onChange={(e) => setDate(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-secondary text-xs py-2 px-4"
                  onClick={loadSlots}
                  disabled={loadingSlots}
                >
                  {loadingSlots ? t('loading') : '🔍 Actualizar'}
                </button>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>{isHostal ? '🔑' : '🕒'}</span>
              {isHostal ? 'Habitaciones disponibles para tu estadía' : t('selectTime')}
            </h2>

            {loadingSlots ? (
              <div className="py-8 text-center text-sm font-semibold text-slate-400 animate-pulse">
                Verificando disponibilidad de horarios y turnos libres…
              </div>
            ) : slots.length === 0 ? (
              <div className="space-y-4">
                <div className="p-6 text-center text-slate-500 text-sm italic bg-slate-50 rounded-xl border border-slate-100">
                  {t('noSlots')}
                </div>

                {scheduleSuggestion && (
                  <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200/80 dark:border-amber-900 text-slate-800 dark:text-slate-200 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2 font-extrabold text-amber-900 dark:text-amber-300 text-sm">
                      <span>⚠️</span>
                      <span>
                        {scheduleSuggestion.reason === 'NOT_WORKING_DAY'
                          ? staffId
                            ? `${staff.find((s) => s.id === staffId)?.name || 'El profesional'} no atiende en la fecha seleccionada.`
                            : 'El establecimiento no atiende en la fecha seleccionada.'
                          : 'Todos los turnos de atención para esta fecha están ocupados.'}
                      </span>
                    </div>

                    {scheduleSuggestion.workingDaysLabels.length > 0 && (
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        🗓️ Días laborables habituales:{' '}
                        <strong className="text-slate-900 dark:text-white font-bold">
                          {scheduleSuggestion.workingDaysLabels.join(', ')}
                        </strong>
                        {scheduleSuggestion.scheduleText && (
                          <span> ({scheduleSuggestion.scheduleText})</span>
                        )}
                      </p>
                    )}

                    {scheduleSuggestion.nextAvailableDate && (
                      <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                          💡 Próxima fecha disponible con turnos libres:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setDate(scheduleSuggestion.nextAvailableDate!);
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-sm transition hover:scale-[1.02] active:scale-95"
                        >
                          <span>📅 Ir al {scheduleSuggestion.nextAvailableDate}</span>
                          <span>→</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className={isHostal ? 'mt-3 space-y-3' : 'mt-3 grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3'}>
                {slots.map((slot) => {
                  const start = new Date(slot.startsAt);
                  const end = new Date(slot.endsAt);
                  const room = resources.find((r) => r.id === slot.resourceId);
                  const photos: string[] = (room?.metadata as any)?.photos || [];

                  if (isHostal) {
                    const isSelected = chosenSlot?.resourceId === slot.resourceId;

                    return (
                      <button
                        key={`${slot.startsAt}-${slot.resourceId}`}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => {
                          setChosenSlot(slot);
                          if (slot.resourceId) setResourceId(slot.resourceId);
                        }}
                        className={`w-full rounded-2xl border p-4 text-left transition flex items-center justify-between gap-4 cursor-pointer ${
                          !slot.available
                            ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'border-indigo-600 bg-indigo-50/90 text-indigo-950 ring-2 ring-indigo-500 shadow-md'
                            : 'border-slate-200 hover:border-indigo-300 bg-white shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {photos.length > 0 ? (
                            <img
                              src={photos[0]}
                              alt={room?.name || 'Habitación'}
                              className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-sm"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">
                              🛏️
                            </div>
                          )}
                          <div>
                            <div className="font-extrabold text-slate-900 text-base">
                              {room?.name || 'Habitación Disponible'}
                            </div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">
                              👥 Capacidad: {room?.capacity || 1} persona(s)
                            </div>
                            <div className="text-xs text-slate-600 font-semibold mt-1 flex items-center gap-2">
                              <span>📅 Entrada: {format(start, 'dd/MM/yyyy')} (12:00)</span>
                              <span>·</span>
                              <span>Salida: {format(end, 'dd/MM/yyyy')} (12:00)</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          {slot.available ? (
                            <span
                              className={`text-xs font-extrabold px-3 py-1.5 rounded-full transition ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {isSelected ? '✓ Seleccionada' : 'Disponible'}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                              Ocupado
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={`${slot.startsAt}-${slot.staffId ?? ''}-${slot.resourceId ?? ''}`}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setChosenSlot(slot)}
                      className={`rounded-xl border p-2.5 text-sm font-semibold transition ${
                        !slot.available
                          ? 'border-slate-100 bg-slate-50 text-slate-300 line-through'
                          : chosenSlot?.startsAt === slot.startsAt
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-200 font-bold'
                          : 'border-slate-200 hover:border-indigo-300 bg-white'
                      }`}
                    >
                      {format(start, 'HH:mm')}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-between pt-4 border-t border-slate-100">
            <button type="button" className="btn-secondary" onClick={() => setStep(2)}>
              ← Atrás
            </button>
            <button
              type="button"
              className="btn-primary px-6"
              disabled={!chosenSlot}
              onClick={() => setStep(4)}
            >
              {t('next')} →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Guest Details & Submit */}
      {step === 4 && service && chosenSlot && (
        <div className="card space-y-5">
          <h2 className="text-lg font-bold text-slate-900">{t('yourInfo')}</h2>

          {/* Summary Card */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-2 text-sm text-slate-800">
            <div className="font-bold text-indigo-950 text-base">{service.name}</div>
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
              {chosenSlot.resourceId && (
                <span>
                  🔑 Habitación: {resources.find((r) => r.id === chosenSlot.resourceId)?.name}
                </span>
              )}
              {staffId && (
                <span>
                  👨‍⚕️ Atendido por: <strong className="text-indigo-700">{staff.find((st) => st.id === staffId)?.name}</strong>
                </span>
              )}
              <span>
                📅 {isHostal ? 'Check-in:' : 'Fecha y Hora:'} {format(new Date(chosenSlot.startsAt), isHostal ? 'dd/MM/yyyy (12:00)' : 'dd/MM/yyyy - HH:mm')}
              </span>
              <span>
                🏁 Check-out: {format(new Date(chosenSlot.endsAt), 'dd/MM/yyyy (12:00)')}
              </span>
              {isHostal && (
                <span>
                  🌙 Estadía: <strong className="text-indigo-700">{stayNights} noche(s)</strong>
                </span>
              )}
              {service.priceCents > 0 && (
                <span className="font-extrabold text-slate-900">
                  Total: ${((service.priceCents * stayNights) / 100).toFixed(2)} {service.currency}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="label">{t('name')} *</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                placeholder="Ingresa tu nombre y apellido"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">{t('email')}</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                />
              </div>
              <div>
                <label className="label">{t('phone')}</label>
                <input
                  className="input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+593 99..."
                />
              </div>
            </div>
            <div>
              <label className="label">
                {industry === 'MEDICO' ? '🩺 Motivo de Consulta / Sintomatología u Odontología (Opcional)' : t('notes')}
              </label>
              <textarea
                className="input min-h-[80px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={industry === 'MEDICO' ? 'Ej. Dolor de muela, profilaxis/limpieza dental, consulta médica de control...' : 'Indicaciones o requerimientos especiales...'}
              />
            </div>

            {/* Legal terms check */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  required
                />
                <span className="leading-snug">
                  Acepto los{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-indigo-600 font-bold underline hover:text-indigo-800 inline"
                  >
                    Términos del Servicio y la Ley de Protección de Datos Personales (LOPDP Ecuador)
                  </button>
                  .
                </span>
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button type="button" className="btn-secondary" onClick={() => setStep(3)}>
              ← Atrás
            </button>
            <button
              type="button"
              className="btn-primary px-8 text-base py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting || !name || !acceptedTerms}
              onClick={submitBooking}
            >
              {submitting ? 'Confirmando…' : '✅ Confirmar Reserva'}
            </button>
          </div>

          <TermsModal
            isOpen={showTermsModal}
            onClose={() => setShowTermsModal(false)}
          />
        </div>
      )}
    </div>
  );
}
