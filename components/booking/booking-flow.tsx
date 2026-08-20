'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';

import { format, addDays } from 'date-fns';

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
  currency: string;
};

type Staff = { id: string; name: string; serviceIds: string[] };
type Resource = { id: string; name: string; type: string; capacity: number; metadata?: any };

type Props = {
  industry: 'HOSTAL' | 'MASAJE' | 'PELUQUERIA' | 'MEDICO';
  services: Service[];
  staff: Staff[];
  resources: Resource[];
  tenantSlug: string;
};

type Slot = { startsAt: string; endsAt: string; available: boolean; staffId?: string; resourceId?: string };

export function BookingFlow({ industry, services, staff, resources, tenantSlug }: Props) {
  const t = useTranslations('booking');
  const locale = useLocale();

  const isHostal = industry === 'HOSTAL';


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
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [chosenSlot, setChosenSlot] = useState<Slot | null>(null);

  // Guest Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
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
    return (
      <div className="card text-center py-12 px-6 space-y-6 max-w-xl mx-auto shadow-xl border border-slate-100 rounded-3xl bg-white">
        <div className="text-6xl animate-bounce">🎉</div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">{t('success')}</h2>
          <p className="text-slate-600 text-sm font-medium">{t('successMessage')}</p>
        </div>

        <div className="bg-indigo-50/70 rounded-2xl p-4 border border-indigo-100 space-y-1">
          <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Código de Confirmación</div>
          <div className="font-mono text-sm font-black text-indigo-700 tracking-wide">{confirmation}</div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={`/${locale}/${tenantSlug}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-indigo-700 transition"
          >
            🏠 Volver al Perfil del Negocio
          </a>
          <button
            type="button"
            onClick={() => {
              setConfirmation(null);
              setStep(1);
              setChosenSlot(null);
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            🔄 Hacer Otra Reserva
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Steps Progress */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 text-xs font-semibold text-slate-500">
        <span className={step >= 1 ? 'text-indigo-600 font-bold' : ''}>
          1. {isHostal ? 'Tarifa / Servicio' : t('selectService')}
        </span>
        <span>→</span>
        <span className={step >= 2 ? 'text-indigo-600 font-bold' : ''}>
          2. {isHostal ? 'Habitación (Opcional)' : 'Asignación'}
        </span>
        <span>→</span>
        <span className={step >= 3 ? 'text-indigo-600 font-bold' : ''}>
          3. {isHostal ? 'Fechas y Habitación' : t('selectDate')}
        </span>
        <span>→</span>
        <span className={step >= 4 ? 'text-indigo-600 font-bold' : ''}>
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
            <div className="space-y-3">
              {filteredStaff.length > 0 && (
                <div>
                  <label className="label">{t('selectStaff')}</label>
                  <select
                    className="input"
                    value={staffId || ''}
                    onChange={(e) => setStaffId(e.target.value || undefined)}
                  >
                    <option value="">Cualquier profesional disponible</option>
                    {filteredStaff.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
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
                Verificando disponibilidad de habitaciones…
              </div>
            ) : slots.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm italic bg-slate-50 rounded-xl border border-slate-100">
                {t('noSlots')}
              </div>
            ) : (
              <div className={isHostal ? 'mt-3 space-y-3' : 'mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4'}>
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
              <span>
                📅 Check-in: {format(new Date(chosenSlot.startsAt), 'dd/MM/yyyy (12:00)')}
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
              <label className="label">{t('notes')}</label>
              <textarea
                className="input min-h-[80px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Indicaciones o requerimientos especiales..."
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button type="button" className="btn-secondary" onClick={() => setStep(3)}>
              ← Atrás
            </button>
            <button
              type="button"
              className="btn-primary px-8 text-base py-3"
              disabled={submitting || !name}
              onClick={submitBooking}
            >
              {submitting ? 'Confirmando…' : '✅ Confirmar Reserva'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
