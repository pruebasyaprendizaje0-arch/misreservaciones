'use client';

import { useState, useTransition } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { format } from 'date-fns';

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
  currency: string;
};

type Staff = { id: string; name: string; serviceIds: string[] };
type Resource = { id: string; name: string; type: string; capacity: number };

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
  const td = useTranslations('dashboard');
  const format_ = useFormatter();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [serviceId, setServiceId] = useState<string>('');
  const [staffId, setStaffId] = useState<string | undefined>();
  const [resourceId, setResourceId] = useState<string | undefined>();
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [chosenSlot, setChosenSlot] = useState<Slot | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const service = services.find((s) => s.id === serviceId);
  const filteredStaff = staff.filter((s) => s.serviceIds.includes(serviceId));
  const filteredResources =
    industry === 'HOSTAL' || industry === 'MASAJE' ? resources : [];

  async function loadSlots() {
    if (!serviceId) return;
    setLoadingSlots(true);
    setChosenSlot(null);
    setError(null);
    const params = new URLSearchParams({ serviceId, date, tenant: tenantSlug });
    if (staffId) params.set('staffId', staffId);
    if (resourceId) params.set('resourceId', resourceId);
    const res = await fetch(`/api/bookings/slots?${params.toString()}`);
    setLoadingSlots(false);
    if (!res.ok) {
      setError('No se pudieron cargar los horarios');
      setSlots([]);
      return;
    }
    const data = await res.json();
    setSlots(data.slots);
    startTransition(() => {
      // Trigger rerender so empty state appears
    });
  }

  async function submitBooking() {
    if (!chosenSlot || !service) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/bookings?tenant=${tenantSlug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId,
        staffId,
        resourceId,
        startsAt: chosenSlot.startsAt,
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
        return;
      }
      setError(t('error'));
      return;
    }
    const data = await res.json();
    setConfirmation(data.reservationId);
  }

  if (confirmation) {
    return (
      <div className="card text-center">
        <h2 className="text-2xl font-semibold text-green-700">{t('success')}</h2>
        <p className="mt-2 text-slate-600">{t('successMessage')}</p>
        <p className="mt-2 text-xs text-slate-400">#{confirmation}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Progress step={step} />

      {step === 1 && (
        <div className="card">
          <h2 className="text-lg font-semibold">{t('selectService')}</h2>
          <div className="mt-4 grid gap-3">
            {services.length === 0 && <p className="text-sm text-slate-500">—</p>}
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setServiceId(s.id);
                  setStaffId(undefined);
                  setResourceId(undefined);
                  setStep(2);
                }}
                className={`flex items-center justify-between rounded-md border p-4 text-left transition hover:border-brand-500 ${
                  serviceId === s.id ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="font-medium text-slate-900">{s.name}</div>
                  {s.description && <div className="text-sm text-slate-500">{s.description}</div>}
                  <div className="mt-1 text-xs text-slate-500">{t('duration', { minutes: s.durationMin })}</div>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {s.priceCents > 0
                    ? format_.number(s.priceCents / 100, { style: 'currency', currency: s.currency })
                    : ''}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          {filteredStaff.length > 0 && (
            <>
              <h2 className="text-lg font-semibold">{t('selectStaff')}</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setStaffId(undefined)}
                  className={`rounded border p-3 text-sm ${
                    !staffId ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200'
                  }`}
                >
                  Cualquiera
                </button>
                {filteredStaff.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStaffId(s.id)}
                    className={`rounded border p-3 text-sm ${
                      staffId === s.id ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {filteredResources.length > 0 && (
            <>
              <h2 className="mt-6 text-lg font-semibold">{t('selectResource')}</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setResourceId(undefined)}
                  className={`rounded border p-3 text-sm ${
                    !resourceId ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200'
                  }`}
                >
                  Cualquiera
                </button>
                {filteredResources.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setResourceId(r.id)}
                    className={`rounded border p-3 text-sm ${
                      resourceId === r.id ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200'
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="mt-6 flex justify-between">
            <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
              ←
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setStep(3);
                loadSlots();
              }}
            >
              {t('next')}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <h2 className="text-lg font-semibold">{t('selectDate')}</h2>
          <input
            type="date"
            className="input mt-3"
            value={date}
            min={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary mt-3"
            onClick={loadSlots}
            disabled={loadingSlots}
          >
            {loadingSlots ? t('loading') : t('search')}
          </button>

          <h2 className="mt-6 text-lg font-semibold">
            {industry === 'HOSTAL' ? 'Selecciona una habitación disponible' : t('selectTime')}
          </h2>
          {slots.length === 0 && !loadingSlots && (
            <p className="mt-3 text-sm text-slate-500">{t('noSlots')}</p>
          )}
          <div className={industry === 'HOSTAL' ? 'mt-3 space-y-3' : 'mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4'}>
            {slots.map((slot) => {
              const start = new Date(slot.startsAt);
              const end = new Date(slot.endsAt);
              const room = resources.find((r) => r.id === slot.resourceId);

              if (industry === 'HOSTAL') {
                return (
                  <button
                    key={`${slot.startsAt}-${slot.resourceId}`}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setChosenSlot(slot)}
                    className={`w-full rounded-xl border p-4 text-left transition flex justify-between items-center ${
                      !slot.available
                        ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed line-through'
                        : chosenSlot?.resourceId === slot.resourceId
                        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-200'
                        : 'border-slate-200 hover:border-brand-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-800">{room?.name || 'Habitación'}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        📅 Entrada: {format(start, 'dd/MM/yyyy')} (12:00) | Salida: {format(end, 'dd/MM/yyyy')} (12:00)
                      </div>
                    </div>
                    <div>
                      {slot.available ? (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">Disponible</span>
                      ) : (
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">Ocupado</span>
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
                  className={`rounded border p-2 text-sm transition ${
                    !slot.available
                      ? 'border-slate-100 bg-slate-50 text-slate-300 line-through'
                      : chosenSlot?.startsAt === slot.startsAt
                      ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-200'
                      : 'border-slate-200 hover:border-brand-300'
                  }`}
                >
                  {format(start, 'HH:mm')}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex justify-between">
            <button type="button" className="btn-secondary" onClick={() => setStep(2)}>
              ←
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!chosenSlot}
              onClick={() => setStep(4)}
            >
              {t('next')}
            </button>
          </div>
        </div>
      )}

      {step === 4 && service && (
        <div className="card">
          <h2 className="text-lg font-semibold">{t('yourInfo')}</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label className="label">{t('name')}</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </div>
            <div>
              <label className="label">{t('email')}</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">{t('phone')}</label>
              <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="label">{t('notes')}</label>
              <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            <div><strong>{service.name}</strong></div>
            {chosenSlot && (
              <div className="mt-1.5 space-y-0.5 text-xs text-slate-600">
                {industry === 'HOSTAL' ? (
                  <>
                    <div>🚪 Habitación: <strong>{resources.find((r) => r.id === chosenSlot.resourceId)?.name}</strong></div>
                    <div>📅 Entrada (Check-in): {format(new Date(chosenSlot.startsAt), 'dd/MM/yyyy')} (12:00)</div>
                    <div>📅 Salida (Check-out): {format(new Date(chosenSlot.endsAt), 'dd/MM/yyyy')} (12:00)</div>
                  </>
                ) : (
                  <div>{format(new Date(chosenSlot.startsAt), "PPPp")}</div>
                )}
              </div>
            )}
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex justify-between">
            <button type="button" className="btn-secondary" onClick={() => setStep(3)}>
              ←
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={submitting || !name}
              onClick={submitBooking}
            >
              {submitting ? t('loading') : t('confirm')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Progress({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="flex items-center justify-between text-xs text-slate-500">
      {[1, 2, 3, 4].map((n) => (
        <li
          key={n}
          className={`flex flex-1 items-center gap-2 ${n === step ? 'text-brand-600' : ''}`}
        >
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full ${
              n <= step ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}
          >
            {n}
          </span>
          {n < 4 && <span className="h-px flex-1 bg-slate-200" />}
        </li>
      ))}
    </ol>
  );
}
