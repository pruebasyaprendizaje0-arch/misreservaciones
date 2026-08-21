import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getTenantContext } from '@/lib/tenant-context';
import { getTenantClient } from '@/lib/db/tenant';
import { getTranslations } from 'next-intl/server';
import { headers } from 'next/headers';

const INDUSTRY_ICONS: Record<string, string> = {
  HOSTAL: '🏨',
  MASAJE: '💆',
  PELUQUERIA: '💈',
  MEDICO: '🩺',
};

const INDUSTRY_HERO: Record<string, { gradient: string; tag: string; bgAccent: string }> = {
  HOSTAL: { gradient: 'from-sky-600 via-indigo-600 to-slate-900', bgAccent: 'bg-sky-500/20', tag: 'Tu Alojamiento de Confianza' },
  MASAJE: { gradient: 'from-amber-500 via-rose-600 to-slate-900', bgAccent: 'bg-rose-500/20', tag: 'Bienestar y Relajación' },
  PELUQUERIA: { gradient: 'from-purple-600 via-pink-600 to-slate-900', bgAccent: 'bg-pink-500/20', tag: 'Estilo y Cuidado Personal' },
  MEDICO: { gradient: 'from-teal-600 via-emerald-600 to-slate-900', bgAccent: 'bg-teal-500/20', tag: 'Atención Médica Profesional' },
};

// ─── Dynamic SEO / GEO / AEO Metadata Generation ───
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const ctx = await getTenantContext(slug);
  if (!ctx.tenant) return {};

  const tenant = ctx.tenant;
  const industryLabel =
    tenant.industry === 'HOSTAL'
      ? 'Hostal'
      : tenant.industry === 'MASAJE'
      ? 'Masajes'
      : tenant.industry === 'PELUQUERIA'
      ? 'Peluquería'
      : 'Centro Médico';

  const locationParts = [
    tenant.comuna ? `Comuna ${tenant.comuna}` : null,
    tenant.parroquia,
    tenant.canton,
    tenant.provincia,
    'Ecuador',
  ].filter(Boolean);
  const locationStr = locationParts.join(', ');

  const title = `${tenant.name} - ${industryLabel} en ${tenant.comuna || tenant.parroquia || 'Santa Elena'} | Reservas Directas`;
  const description =
    tenant.description ||
    `${tenant.name} es un ${industryLabel.toLowerCase()} ubicado en ${locationStr}. Consulta disponibilidad, precios y reserva online en tiempo real sin comisiones.`;

  const images = [tenant.coverUrl, tenant.logoUrl].filter(Boolean) as string[];

  return {
    title,
    description,
    keywords: [
      tenant.name,
      industryLabel,
      `${industryLabel} en ${tenant.comuna || 'Olón'}`,
      `${industryLabel} en ${tenant.parroquia || 'Manglaralto'}`,
      `${industryLabel} en ${tenant.canton || 'Santa Elena'}`,
      'reservas directas',
      'alojamiento santa elena',
      'hostal en ecuador',
      'reserva online',
    ],
    openGraph: {
      title,
      description,
      type: 'website',
      locale: locale === 'es' ? 'es_EC' : 'en_US',
      images: images.length > 0 ? images.map((url) => ({ url })) : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images.length > 0 ? images : undefined,
    },
    alternates: {
      canonical: `https://${slug}.misreservaciones.com/${locale}`,
    },
  };
}

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

  const t = await getTranslations('common');
  const ti = await getTranslations('industries');

  let services: any[] = [];
  let staffList: any[] = [];
  let resources: any[] = [];

  try {
    const db = getTenantClient(ctx.dbUrl!);
    [services, staffList, resources] = await Promise.all([
      db.service.findMany({
        where: { active: true },
        orderBy: { createdAt: 'asc' },
      }),
      db.staff.findMany({ where: { active: true }, select: { id: true, name: true, role: true } }),
      db.resource.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    ]);
  } catch (err) {
    console.error(`[TenantHome] Warning: Could not fetch DB data for ${slug}:`, err);
  }

  const tenant = ctx.tenant;
  const industry = tenant.industry;
  const isHostal = industry === 'HOSTAL';
  const icon = INDUSTRY_ICONS[industry] ?? '🏢';
  const hero = INDUSTRY_HERO[industry] ?? {
    gradient: 'from-slate-800 via-indigo-950 to-slate-900',
    bgAccent: 'bg-indigo-500/20',
    tag: 'Tu Negocio de Confianza',
  };

  const commonAreaPhotos: string[] = (tenant.metadata as any)?.commonAreaPhotos || [];

  // WhatsApp Link
  const rawPhone = tenant.phone ? tenant.phone.replace(/[^0-9]/g, '') : null;
  const whatsappNumber = rawPhone
    ? rawPhone.startsWith('593')
      ? rawPhone
      : '593' + rawPhone.replace(/^0/, '')
    : null;
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola ${tenant.name}, me gustaría realizar una consulta sobre sus servicios y reservas.`)}`
    : null;

  // Google Maps Link
  const fullAddress = [
    tenant.address,
    tenant.comuna ? `Comuna ${tenant.comuna}` : null,
    tenant.parroquia,
    tenant.canton,
    tenant.provincia,
    'Ecuador',
  ]
    .filter(Boolean)
    .join(', ');

  const mapUrl =
    tenant.lat && tenant.lng
      ? `https://www.google.com/maps?q=${tenant.lat},${tenant.lng}`
      : `https://www.google.com/maps?q=${encodeURIComponent(`${tenant.name}, ${fullAddress}`)}`;

  // ─── GEO & AEO JSON-LD Schema ───
  const schemaType = isHostal ? 'LodgingBusiness' : 'LocalBusiness';
  const businessSchema = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: tenant.name,
    description: tenant.description || `${tenant.name} en ${fullAddress}`,
    url: `https://${slug}.misreservaciones.com/${locale}`,
    telephone: tenant.phone || undefined,
    image: [tenant.coverUrl, tenant.logoUrl].filter(Boolean),
    address: {
      '@type': 'PostalAddress',
      streetAddress: tenant.address || undefined,
      addressLocality: tenant.comuna || tenant.parroquia || undefined,
      addressRegion: tenant.provincia || undefined,
      addressCountry: 'EC',
    },
    ...(tenant.lat && tenant.lng
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: tenant.lat,
            longitude: tenant.lng,
          },
        }
      : {}),
    hasMap: mapUrl,
    priceRange: '$$',
  };

  const faqList = [
    {
      q: `¿Cómo puedo realizar una reserva en ${tenant.name}?`,
      a: `Puedes reservar directamente online en nuestro sitio oficial seleccionando la opción "${isHostal ? 'Reservar Habitación' : 'Reservar Cita'}" en la parte superior. Recibirás tu confirmación inmediata sin pagar comisiones adicionales.`,
    },
    {
      q: `¿Dónde se encuentra ubicado ${tenant.name}?`,
      a: `${tenant.name} está ubicado en ${fullAddress}. Puedes abrir nuestra ubicación exacta en Google Maps usando el botón directo en esta página.`,
    },
    ...(isHostal
      ? [
          {
            q: `¿Cuáles son los horarios de Check-in y Check-out?`,
            a: `Nuestro horario habitual de Check-in es a partir de las 12:00 PM y el Check-out se realiza hasta las 12:00 PM. Si necesitas un horario especial, contáctanos por WhatsApp.`,
          },
          {
            q: `¿El establecimiento cuenta con áreas comunes o Wi-Fi?`,
            a: `Sí, contamos con espacios acondicionados, conexión Wi-Fi gratuita y áreas comunes para el disfrute de nuestros huéspedes.`,
          },
        ]
      : [
          {
            q: `¿Es necesario reservar con anticipación?`,
            a: `Recomendamos agendar con anticipación a través de nuestra plataforma online para asegurar la disponibilidad de tu profesional o servicio preferido.`,
          },
        ]),
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqList.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 antialiased">
      {/* JSON-LD Structured Data scripts */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(businessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ─── Hero Banner ─── */}
      <section className="relative overflow-hidden bg-slate-950 text-white min-h-[520px] flex items-center">
        {/* Ambient Glows */}
        <div className="absolute -top-32 -left-32 w-[450px] h-[450px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="absolute -bottom-32 -right-32 w-[450px] h-[450px] bg-sky-500/15 rounded-full blur-[120px] pointer-events-none z-0" />

        {tenant.coverUrl ? (
          <div className="absolute inset-0 z-0">
            <img src={tenant.coverUrl} alt={tenant.name} className="w-full h-full object-cover opacity-90 scale-105 transition-transform duration-1000" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-black/20" />
          </div>
        ) : (
          <div
            className="absolute inset-0 opacity-15 pointer-events-none z-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, white 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
        )}

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 w-full">
          <div className="max-w-3xl space-y-5">
            {/* Tag Badge - Standalone element */}
            <div>
              <div className="inline-flex items-center gap-2.5 rounded-full bg-slate-950/40 backdrop-blur-md px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-indigo-100 border border-white/20 shadow-md">
                <span className="text-base">{icon}</span>
                <span>{ti(industry as 'HOSTAL')}</span>
                <span className="text-white/40">•</span>
                <span className="text-white/90">{hero.tag}</span>
              </div>
            </div>

            {/* Title & Logo - Standalone element */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {tenant.logoUrl ? (
                <img
                  src={tenant.logoUrl}
                  alt={tenant.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-2 border-white/40 shadow-2xl bg-white shrink-0"
                />
              ) : null}
              <div>
                <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)] leading-[1.1]">
                  {tenant.name}
                </h1>
                {(tenant.comuna || tenant.parroquia || tenant.canton || tenant.provincia) && (
                  <div className="mt-2.5 inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-white/95 bg-slate-950/40 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full shadow-md">
                    <span>📍</span>
                    <span>
                      {[tenant.comuna ? `Comuna ${tenant.comuna}` : null, tenant.parroquia, tenant.canton, tenant.provincia]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Description - Standalone glass card */}
            {tenant.description && (
              <div>
                <div className="inline-block rounded-2xl bg-slate-950/35 backdrop-blur-md border border-white/15 p-4 sm:p-5 shadow-xl max-w-2xl">
                  <p className="text-base sm:text-lg text-white/95 leading-relaxed font-normal drop-shadow">
                    "{tenant.description}"
                  </p>
                </div>
              </div>
            )}

            {/* CTA & Trust Badges - Standalone floating elements */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link
                href={bookingUrl}
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 px-8 py-4 text-base font-extrabold shadow-2xl shadow-black/40 transition-all hover:scale-[1.02] active:scale-95"
              >
                <span>📅</span>
                <span>{isHostal ? 'Reservar Habitación Ahora' : t('title')}</span>
                <span className="text-slate-400 font-normal">→</span>
              </Link>

              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/90">
                <span className="inline-flex items-center gap-1.5 bg-slate-950/40 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/20 shadow-md">
                  ✨ Reserva Directa
                </span>
                <span className="inline-flex items-center gap-1.5 bg-slate-950/40 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/20 shadow-md">
                  ⚡ Confirmación Inmediata
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Contact & Location Card (Floating Bar) ─── */}
      <div className="-mt-8 relative z-30 mx-auto max-w-6xl px-4 sm:px-6 w-full">
        <div className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-xl shadow-slate-900/5 flex flex-col md:flex-row items-center justify-between gap-5 backdrop-blur-xl">
          <div className="flex items-center gap-4 text-sm text-slate-700 w-full md:w-auto">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 border border-indigo-100 flex items-center justify-center text-2xl shrink-0 text-indigo-600 shadow-xs">
              📍
            </div>
            <div>
              <div className="font-extrabold text-slate-900 text-base">{tenant.address || 'Dirección Principal'}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">{fullAddress}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 text-xs font-extrabold shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                <span className="text-base">💬</span>
                <span>WhatsApp {tenant.phone ? `(${tenant.phone})` : ''}</span>
              </a>
            )}

            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 text-xs font-extrabold shadow-md shadow-slate-900/10 transition-all hover:-translate-y-0.5 active:scale-95"
            >
              <span className="text-base">🗺️</span>
              <span>Abrir Mapa de Google</span>
            </a>
          </div>
        </div>
      </div>

      {/* ─── Why Book Direct Section (Value Pillars) ─── */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-8 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-white border border-slate-200/70 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold mb-3">
              ⚡
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Reserva Instantánea</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Consulta disponibilidad actualizada en tiempo real y confirma sin esperas.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200/70 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold mb-3">
              💰
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Mejor Precio Directo</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Trato directo con el establecimiento, sin comisiones de plataformas externas.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200/70 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center text-xl font-bold mb-3">
              💬
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Contacto Directo</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Resuelve tus dudas directamente por WhatsApp antes o después de tu reserva.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200/70 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl font-bold mb-3">
              🛡️
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Garantía y Confianza</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Tu reservación queda registrada oficialmente de forma inmediata.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Áreas Comunes / Galería de Instalaciones ─── */}
      {commonAreaPhotos.length > 0 && (
        <section className="bg-white border-y border-slate-200/80 py-14">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-2">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600">Instalaciones</span>
                <h2 className="text-3xl font-black text-slate-900 mt-1 flex items-center gap-2.5">
                  <span>{isHostal ? '🏊' : '📸'}</span>
                  <span>{isHostal ? 'Áreas Comunes e Instalaciones' : 'Galería del Establecimiento'}</span>
                </h2>
              </div>
              <p className="text-slate-500 text-sm max-w-md">
                {isHostal
                  ? 'Explora los espacios compartidos disponibles para nuestros huéspedes (piscina, terraza, recepción, áreas verdes).'
                  : 'Instalaciones equipadas para tu confort y la mejor atención.'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {commonAreaPhotos.map((url, idx) => (
                <div key={idx} className="group relative h-48 rounded-3xl overflow-hidden shadow-xs border border-slate-200 bg-slate-100">
                  <img
                    src={url}
                    alt={`Área común ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <span className="text-white text-xs font-bold">Ver imagen completa</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Services / Rooms Cards ─── */}
      {services.length > 0 && (
        <section id="servicios" className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-2">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600">
                {isHostal ? 'Alojamiento Disponible' : 'Catálogo de Servicios'}
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">
                {isHostal ? 'Habitaciones y Tarifas' : 'Nuestros Servicios'}
              </h2>
            </div>
            <p className="text-slate-500 text-sm max-w-md">
              {isHostal
                ? 'Selecciona la habitación que mejor se adapte a tus necesidades y consulta la tarifa en línea.'
                : 'Selecciona el servicio de tu preferencia y agenda tu cita en pocos clics.'}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <div
                key={s.id}
                className="group relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xs transition-all duration-300 hover:shadow-xl hover:shadow-slate-900/10 hover:border-indigo-300 hover:-translate-y-1.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${hero.gradient} text-2xl text-white shadow-md shadow-indigo-900/20 flex group-hover:scale-105 transition-transform`}>
                      {icon}
                    </div>
                    {s.priceCents > 0 && (
                      <div className="bg-emerald-50 border border-emerald-200/60 px-3.5 py-1 rounded-full text-emerald-700 font-extrabold text-sm shadow-2xs">
                        ${(s.priceCents / 100).toFixed(2)}
                        <span className="text-[10px] font-normal text-emerald-600"> {s.currency}</span>
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {s.name}
                  </h3>

                  {s.description && (
                    <p className="mt-2 text-sm text-slate-500 leading-relaxed line-clamp-3">
                      {s.description}
                    </p>
                  )}
                </div>

                <div className="mt-8 pt-5 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-4">
                    <span className="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl">
                      {isHostal
                        ? `📅 ${Math.max(1, Math.round(s.durationMin / 1440))} día(s)`
                        : `⏱ ${s.durationMin} min`}
                    </span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Disponible
                    </span>
                  </div>

                  <Link
                    href={bookingUrl}
                    className="w-full rounded-2xl bg-slate-900 group-hover:bg-indigo-600 py-3.5 text-center text-sm font-extrabold text-white shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>{isHostal ? 'Reservar Estancia' : 'Reservar Cita'}</span>
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Habitaciones Registradas con fotos ─── */}
      {isHostal && resources.length > 0 && (
        <section className="bg-slate-100/70 border-t border-slate-200/80 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-8">
              <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600">Galería de Habitaciones</span>
              <h2 className="text-3xl font-black text-slate-900 mt-1 flex items-center gap-2.5">
                <span>🔑</span> Detalle de Habitaciones
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((room) => {
                const roomMeta = (room.metadata as any) || {};
                const photos: string[] = roomMeta.photos || [];
                const description: string | null = roomMeta.description || null;
                return (
                  <div key={room.id} className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-lg transition-all">
                    {photos.length > 0 ? (
                      <div className="h-52 overflow-hidden relative group">
                        <img
                          src={photos[0]}
                          alt={room.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {photos.length > 1 && (
                          <span className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-xl shadow-xs">
                            📷 {photos.length} fotos
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="h-40 bg-slate-100 flex items-center justify-center text-slate-400 text-4xl">
                        🛏️
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="font-extrabold text-slate-900 text-lg">{room.name}</h3>
                      {description && (
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">{description}</p>
                      )}

                      <div className="mt-4 flex items-center justify-between text-xs font-bold pt-4 border-t border-slate-100">
                        <span className="text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">👥 Capacidad: {room.capacity} pers.</span>
                        <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200/50">🟢 Disponible</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── FAQ Section (Acordeón interactivo sin JS) ─── */}
      <section className="mx-auto max-w-4xl px-6 py-16 w-full">
        <div className="text-center mb-10">
          <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600">Resolvemos tus dudas</span>
          <h2 className="text-3xl font-black text-slate-900 mt-1">Preguntas Frecuentes</h2>
        </div>

        <div className="space-y-3">
          {faqList.map((faq, idx) => (
            <details
              key={idx}
              className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs [&_summary::-webkit-details-marker]:hidden transition-all hover:border-indigo-200"
            >
              <summary className="flex cursor-pointer items-center justify-between font-bold text-slate-900 hover:text-indigo-600 transition-colors text-base select-none">
                <span>{faq.q}</span>
                <span className="ml-4 shrink-0 transition-transform duration-300 group-open:-rotate-180 text-indigo-500 font-extrabold">
                  ↓
                </span>
              </summary>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ─── CTA Bottom ─── */}
      <section className="mx-auto max-w-6xl px-6 my-12 w-full">
        <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-10 sm:p-16 text-center text-white border border-slate-800 shadow-2xl shadow-slate-950/30">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/30 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              ¿Listo para asegurar tu reserva?
            </h2>
            <p className="mt-4 text-slate-300 text-base leading-relaxed">
              {isHostal
                ? 'Reserva tu estancia directamente con el establecimiento sin comisiones de intermediarios.'
                : 'Agenda tu cita en línea en cuestión de segundos.'}
            </p>
            <div className="mt-8">
              <Link
                href={bookingUrl}
                className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white px-9 py-4 font-black text-base shadow-xl shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95"
              >
                <span>📅</span>
                <span>{isHostal ? 'Reservar Habitación Ahora' : 'Reservar Cita Ahora'}</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
