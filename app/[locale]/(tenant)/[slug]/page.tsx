import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTenantContext } from '@/lib/tenant-context';
import { getTenantClient } from '@/lib/db/tenant';
import { getLocale, getTranslations } from 'next-intl/server';

import { headers } from 'next/headers';

const INDUSTRY_ICONS: Record<string, string> = {
  HOSTAL: '🏨',
  MASAJE: '💆',
  PELUQUERIA: '💈',
  MEDICO: '🩺',
};

const INDUSTRY_HERO: Record<string, { gradient: string; tag: string }> = {
  HOSTAL: { gradient: 'from-sky-600 to-indigo-700', tag: 'Tu alojamiento de confianza' },
  MASAJE: { gradient: 'from-orange-500 to-rose-600', tag: 'Relájate y renueva energías' },
  PELUQUERIA: { gradient: 'from-purple-600 to-pink-600', tag: 'Estilo y confianza' },
  MEDICO: { gradient: 'from-teal-600 to-emerald-700', tag: 'Tu salud, primero' },
};

export default async function TenantHome({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { locale, slug } = await params;
  const ctx = await getTenantContext(slug);
  if (!ctx.tenant) notFound();

  const headerList = await headers();
  const isSubdomain = !!headerList.get('x-tenant-slug');
  const bookingUrl = isSubdomain ? `/${locale}/reservar` : `/${locale}/${slug}/reservar`;

  const t = await getTranslations();
  const ti = await getTranslations('industries');

  const db = getTenantClient(ctx.dbUrl!);
  const [services, staffList] = await Promise.all([
    db.service.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    }),
    db.staff.findMany({ where: { active: true }, select: { id: true, name: true, role: true } }),
  ]);

  const industry = ctx.tenant.industry;
  const icon = INDUSTRY_ICONS[industry] ?? '🏢';
  const hero = INDUSTRY_HERO[industry] ?? { gradient: 'from-slate-700 to-slate-900', tag: 'Tu negocio de confianza' };

  return (
    <div className="flex flex-col">
      {/* ─── Hero ─── */}
      <section className={`relative overflow-hidden bg-gradient-to-br ${hero.gradient} text-white`}>
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 40%, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/80 mb-6">
            <span>{icon}</span>
            <span>{ti(industry as 'HOSTAL')}</span>
            <span className="text-white/40">·</span>
            <span>{hero.tag}</span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
            {ctx.tenant.name}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/75">
            Reserva tu cita de forma rápida y sencilla, sin llamadas ni esperas. Elige el servicio, la fecha y el horario que más te convenga.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href={bookingUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-slate-900 shadow-lg transition hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            >
              📅 {t('booking.title')}
            </Link>
            {services.length > 0 && (
              <a
                href="#servicios"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Ver servicios ↓
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ─── Services ─── */}
      {services.length > 0 && (
        <section id="servicios" className="mx-auto w-full max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-extrabold text-slate-900">
            Nuestros <span className={`bg-gradient-to-r ${hero.gradient} bg-clip-text text-transparent`}>Servicios</span>
          </h2>
          <p className="mt-2 text-slate-500 max-w-lg">
            Selecciona el servicio de tu preferencia y programa tu cita en minutos.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <div
                key={s.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${hero.gradient} text-2xl text-white shadow-sm`}>
                  {icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{s.name}</h3>
                {s.description && (
                  <p className="mt-1 text-sm text-slate-500 line-clamp-2">{s.description}</p>
                )}
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    ⏱ {s.durationMin} min
                  </span>
                  {s.priceCents > 0 && (
                    <span className="font-bold text-slate-900">
                      ${(s.priceCents / 100).toFixed(2)}
                      <span className="text-xs font-normal text-slate-400"> {s.currency}</span>
                    </span>
                  )}
                </div>
                <Link
                  href={bookingUrl}
                  className={`mt-5 block w-full rounded-xl bg-gradient-to-r ${hero.gradient} py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:opacity-90`}
                >
                  Reservar →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Staff ─── */}
      {staffList.length > 0 && (
        <section className="bg-slate-50 border-t border-slate-100">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-2xl font-extrabold text-slate-900">
              Nuestro <span className={`bg-gradient-to-r ${hero.gradient} bg-clip-text text-transparent`}>Equipo</span>
            </h2>
            <div className="mt-8 flex flex-wrap gap-4">
              {staffList.map((staff) => (
                <div key={staff.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${hero.gradient} text-base font-bold text-white shadow`}>
                    {staff.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{staff.name}</p>
                    {staff.role && <p className="text-xs text-slate-500">{staff.role}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── CTA Bottom ─── */}
      <section className={`bg-gradient-to-br ${hero.gradient}`}>
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2 className="text-3xl font-extrabold text-white">¿Listo para reservar?</h2>
          <p className="mt-3 text-white/70">
            Agenda tu cita ahora mismo. Es rápido, fácil y sin complicaciones.
          </p>
          <Link
            href={bookingUrl}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-bold text-slate-900 shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
          >
            📅 Reservar ahora
          </Link>
        </div>
      </section>
    </div>
  );
}
