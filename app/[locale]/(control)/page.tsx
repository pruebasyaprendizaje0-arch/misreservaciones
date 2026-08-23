import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';
import { BusinessDirectory } from '@/components/directory/BusinessDirectory';
import { PricingTable } from '@/components/pricing/PricingTable';
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
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-slate-900/40 px-5 py-2 text-xs font-black uppercase tracking-wider text-indigo-300 shadow-sm backdrop-blur-md mb-6">
              <span className="text-base">🇪🇨</span>
              <span className="text-white font-black tracking-widest">DIRECTORIO DE NEGOCIOS DEL ECUADOR</span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] text-indigo-300 font-bold border border-white/10">OFICIAL</span>
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
              { value: '17', label: 'Rubros en 5 Industrias' },
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
            { icon: '🏨', label: 'Alojamiento y Estadías', color: 'from-sky-500 to-indigo-600' },
            { icon: '💆', label: 'Salud, Bienestar y Belleza', color: 'from-rose-500 to-purple-600' },
            { icon: '⛵', label: 'Turismo, Aventura y Deportes', color: 'from-amber-500 to-emerald-600' },
            { icon: '🍽️', label: 'Gastronomía y Eventos', color: 'from-orange-500 to-red-600' },
            { icon: '🚜', label: 'Alquiler de Espacios y Equipos', color: 'from-blue-500 to-teal-600' },
          ].map((item) => (
            <div
              key={item.label}
              className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${item.color} px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:scale-105 hover:shadow-lg`}
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
          <div className="mb-8 rounded-3xl border border-white/10 bg-slate-900/40 p-6 sm:p-8 backdrop-blur-md shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-indigo-300 border border-indigo-500/30">
                🗺️ Explorador Geográfico Ecuador
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Directorio de Negocios & Servicios 🇪🇨
              </h2>
              <p className="text-sm font-medium text-slate-200 max-w-2xl leading-relaxed">
                Filtra por provincia, cantón y parroquia para encontrar alojamientos, consultorios, masajes, tours y locales cercanos.
              </p>
            </div>
            <Link
              href={`/${locale}/directorio`}
              className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-6 py-4 text-sm font-black text-white shadow-xl shadow-indigo-600/30 hover:from-indigo-500 hover:to-purple-500 transition-all duration-200 active:scale-[0.98] shrink-0 border border-indigo-400/30"
            >
              <span>🗺️ Ver Directorio Avanzado</span>
              <span className="text-indigo-200 font-bold">→</span>
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

      {/* ── Planes & Precios (FREE, PRO, BUSINESS) ───── */}
      <section id="planes" className="bg-transparent py-20 z-10 relative">
        <div className="mx-auto max-w-6xl px-6 space-y-12">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/20 px-4 py-1 text-xs font-black uppercase tracking-wider text-indigo-300">
              💎 Planes Diseñados para todo Tipo de Negocio
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Planes Transparentes y Flexibles
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-medium">
              Comienza gratis durante 30 días y escala al plan que mejor se adapte a tus necesidades. Sin contratos forzosos.
            </p>
          </div>

          <PricingTable locale={locale} />
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
          <div className="mt-8 flex justify-center">
            <Link
              href={`/${locale}/sign-up`}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-10 py-4 text-base font-black text-white shadow-xl shadow-indigo-600/30 hover:from-indigo-500 hover:to-purple-500 transition-all duration-200 active:scale-[0.98] border border-indigo-400/30"
            >
              🚀 Registrar mi negocio gratis
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
