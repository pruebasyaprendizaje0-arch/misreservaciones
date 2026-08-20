import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';
import { BusinessDirectory } from '@/components/directory/BusinessDirectory';
import { FullPageBackgroundVideo } from '@/components/FullPageBackgroundVideo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEs = locale === 'es';

  const title = isEs
    ? 'misreservaciones | Sistema de Reservas Online para Hostales y Negocios en Ecuador'
    : 'misreservaciones | Online Booking System for Hostels and Businesses in Ecuador';

  const description = isEs
    ? 'Plataforma multi-tenant de reservas en línea para hostales, masajes, peluquerías y consultorios médicos en Ecuador. Reserva sin comisiones en Olón, Montañita, Santa Elena, Quito y Guayaquil.'
    : 'Multi-tenant online booking platform for hostels, massage spas, salons, and medical clinics in Ecuador. Direct commission-free bookings.';

  return {
    title,
    description,
    keywords: [
      'reservas hostales ecuador',
      'sistema de reservaciones',
      'hostales olon',
      'hostales montañita',
      'alojamiento santa elena',
      'reserva online ecuador',
    ],
    openGraph: {
      title,
      description,
      type: 'website',
      locale: isEs ? 'es_EC' : 'en_US',
    },
    alternates: {
      canonical: `https://misreservaciones.com/${locale}`,
    },
  };
}

export default async function LandingPage() {
  const t = await getTranslations();
  const locale = await getLocale();

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'misreservaciones',
    url: `https://misreservaciones.com/${locale}`,
    logo: 'https://misreservaciones.com/logo.png',
    description:
      'Plataforma líder de reservas directas en línea para hostales y negocios en Ecuador.',
    areaServed: {
      '@type': 'Country',
      name: 'Ecuador',
    },
  };

  const webSiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'misreservaciones',
    url: `https://misreservaciones.com/${locale}`,
    potentialAction: {
      '@type': 'SearchAction',
      target: `https://misreservaciones.com/${locale}/directorio?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="relative min-h-screen text-slate-100 overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
      />

      {/* ── Fixed Full-Page Parallax Background Video ── */}
      <FullPageBackgroundVideo />

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-transparent">
        <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-32 z-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-indigo-300 backdrop-blur-md mb-6">
              🇪🇨 Directorio de Negocios del Ecuador
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Encuentra y reserva
              <br />
              <span className="bg-gradient-to-r from-yellow-300 via-orange-300 to-amber-200 bg-clip-text text-transparent">
                en tu ciudad
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">
              Busca negocios locales por provincia, cantón y parroquia. Reserva citas en hostales,
              masajes, peluquerías, consultorios médicos y más — todo en un solo lugar.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href={`/${locale}/sign-up`}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:shadow-xl hover:-translate-y-0.5"
              >
                🏪 Registra tu negocio gratis
              </Link>
              <Link
                href={`/${locale}/directorio`}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20"
              >
                🔍 Explorar Directorio Completo →
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-14 grid grid-cols-3 gap-6 text-center">
            {[
              { value: '24', label: 'Provincias' },
              { value: '221+', label: 'Cantones' },
              { value: '4', label: 'Industrias' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/5 bg-slate-900/30 backdrop-blur-sm p-4">
                <p className="text-3xl font-extrabold text-white sm:text-4xl">{stat.value}</p>
                <p className="mt-1 text-sm text-indigo-300">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industry pills ──────────────────────────── */}
      <section className="bg-slate-900/40 backdrop-blur-md border-y border-white/5">
        <div className="mx-auto max-w-6xl px-6 py-6 flex flex-wrap items-center justify-center gap-3">
          {[
            { icon: '🏨', label: 'Hostales', color: 'from-sky-500 to-indigo-600' },
            { icon: '💆', label: 'Masajes', color: 'from-orange-500 to-rose-600' },
            { icon: '💈', label: 'Peluquerías', color: 'from-purple-500 to-pink-600' },
            { icon: '🩺', label: 'Salud & Médicos', color: 'from-teal-500 to-emerald-600' },
          ].map((item) => (
            <div
              key={item.label}
              className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${item.color} px-5 py-2 text-sm font-semibold text-white shadow-sm`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Directory ───────────────────────────────── */}
      <section id="directorio" className="bg-transparent">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-white">
                Directorio de Negocios
                <span className="ml-2 text-indigo-400">🗺️</span>
              </h2>
              <p className="mt-2 text-slate-300 max-w-xl">
                Filtra por provincia, cantón y parroquia para encontrar el negocio más cercano a ti.
              </p>
            </div>
            <Link
              href={`/${locale}/directorio`}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-md shrink-0"
            >
              🔍 Ver Directorio Avanzado →
            </Link>
          </div>

          <BusinessDirectory locale={locale} />
        </div>
      </section>

      {/* ── How it works ────────────────────────────── */}
      <section className="bg-slate-900/30 backdrop-blur-md border-y border-white/5">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-extrabold text-white">¿Cómo funciona?</h2>
          <p className="text-center text-slate-400 mt-2">Reserva en 3 simples pasos</p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              { step: '01', icon: '🔍', title: 'Busca', desc: 'Filtra por tu ciudad, tipo de negocio o escribe lo que necesitas.' },
              { step: '02', icon: '📋', title: 'Elige', desc: 'Consulta el perfil del negocio, servicios y disponibilidad.' },
              { step: '03', icon: '✅', title: 'Reserva', desc: 'Confirma tu cita en segundos. Recibirás un WhatsApp de confirmación.' },
            ].map((item) => (
              <div key={item.step} className="relative rounded-2xl border border-white/5 bg-slate-900/40 p-8 backdrop-blur-sm">
                <span className="absolute -top-4 left-6 rounded-full bg-indigo-600 px-3 py-1 text-xs font-black text-white">{item.step}</span>
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA for businesses ──────────────────────── */}
      <section className="bg-transparent">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-4xl font-extrabold text-white">¿Tienes un negocio?</h2>
          <p className="mt-4 text-lg text-slate-300 max-w-xl mx-auto">
            Registra tu negocio gratis y empieza a recibir reservas en línea hoy mismo.
            Calendario, estadísticas, notificaciones WhatsApp y más.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href={`/${locale}/sign-up`}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-bold text-indigo-700 shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
            >
              🚀 Registrarme gratis
            </Link>
            <Link
              href={`/${locale}/sign-in`}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/15"
            >
              Iniciar sesión →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
