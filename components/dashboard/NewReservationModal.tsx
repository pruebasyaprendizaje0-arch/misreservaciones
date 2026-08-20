'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type ServiceOption = { id: string; name: string; durationMin: number; priceCents: number };
type StaffOption = { id: string; name: string };
type ResourceOption = { id: string; name: string };
type CustomerOption = { id: string; name: string; phone: string | null };

type Props = {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
};

export function NewReservationModal({ slug, isOpen, onClose }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);

  const [services, setServices] = useState<ServiceOption[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [resources, setResources] = useState<ResourceOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  // Form states
  const [serviceId, setServiceId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [status, setStatus] = useState('CONFIRMED');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // New customer quick fields
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    // Set default date-time (now rounded to next 30 min)
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0);
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setStartsAt(localIso);

    // Fetch options
    setFetchingData(true);
    Promise.all([
      fetch(`/api/tenants/${slug}/services`).then((r) => r.json()),
      fetch(`/api/tenants/${slug}/staff`).then((r) => r.json()),
      fetch(`/api/tenants/${slug}/resources`).then((r) => r.json()),
      fetch(`/api/tenants/${slug}/customers`).then((r) => r.json()),
    ])
      .then(([srvRes, stfRes, resRes, custRes]) => {
        const srv = srvRes.services || [];
        setServices(srv);
        if (srv.length > 0) setServiceId(srv[0].id);

        const stf = stfRes.staff || [];
        setStaffList(stf);

        const rsc = resRes.resources || [];
        setResources(rsc);

        const cust = custRes.customers || [];
        setCustomers(cust);
        if (cust.length > 0) setCustomerId(cust[0].id);
        else setIsCreatingNewCustomer(true);
      })
      .catch((err) => console.error('Error al cargar datos:', err))
      .finally(() => setFetchingData(false));
  }, [isOpen, slug]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      let finalCustomerId = customerId;

      // Create new customer if needed
      if (isCreatingNewCustomer) {
        if (!newCustomerName.trim()) {
          setErrorMsg('Escribe el nombre del nuevo cliente');
          setLoading(false);
          return;
        }

        const createCustRes = await fetch(`/api/tenants/${slug}/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newCustomerName.trim(),
            phone: newCustomerPhone.trim() || undefined,
            email: newCustomerEmail.trim() || undefined,
          }),
        });

        const custData = await createCustRes.json();
        if (!createCustRes.ok || !custData.customer) {
          throw new Error(custData.error || 'Error al crear el cliente');
        }
        finalCustomerId = custData.customer.id;
      }

      if (!serviceId) {
        setErrorMsg('Selecciona un servicio');
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/tenants/${slug}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId,
          customerId: finalCustomerId,
          staffId: staffId || undefined,
          resourceId: resourceId || undefined,
          startsAt: new Date(startsAt).toISOString(),
          status,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar la reserva');
      }

      onClose();
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-slate-900 dark:text-slate-100 my-8">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <span>➕</span> Nueva Reserva
          </h2>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl font-light"
          >
            &times;
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-700 dark:text-red-300">
            ⚠️ {errorMsg}
          </div>
        )}

        {fetchingData ? (
          <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            Cargando servicios y opciones...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-sm">
            {/* Servicio */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Servicio *
              </label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                required
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationMin >= 1440 ? `${Math.round(s.durationMin / 1440)} día(s)` : `${s.durationMin} min`} - ${(s.priceCents / 100).toFixed(2)})
                  </option>
                ))}

              </select>
            </div>

            {/* Cliente */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Cliente *
                </label>
                <button
                  type="button"
                  onClick={() => setIsCreatingNewCustomer(!isCreatingNewCustomer)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  {isCreatingNewCustomer ? 'Seleccionar cliente existente' : '+ Registrar nuevo cliente'}
                </button>
              </div>

              {!isCreatingNewCustomer ? (
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  required={!isCreatingNewCustomer}
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
                  <input
                    type="text"
                    placeholder="Nombre completo *"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="tel"
                      placeholder="Teléfono / WhatsApp"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                    />
                    <input
                      type="email"
                      placeholder="Correo electrónico"
                      value={newCustomerEmail}
                      onChange={(e) => setNewCustomerEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Fecha y Hora */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Fecha y Hora de Inicio *
              </label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Personal y Recurso */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Personal (Opcional)
                </label>
                <select
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Sin asignar</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Habitación / Recurso
                </label>
                <select
                  value={resourceId}
                  onChange={(e) => setResourceId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Sin asignar</option>
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Estado Inicial
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="CONFIRMED">CONFIRMADA</option>
                <option value="PENDING">PENDIENTE</option>
                <option value="COMPLETED">COMPLETADA</option>
              </select>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Notas adicionales
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalles sobre la estancia o servicio..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Crear Reserva'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
