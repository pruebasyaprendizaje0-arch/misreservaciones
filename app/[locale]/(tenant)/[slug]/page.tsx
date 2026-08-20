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

const INDUSTRY_HERO: Record<string, { gradient: string; tag: string }> = {
  HOSTAL: { gradient: 'from-sky-600 to-indigo-700', tag: 'Tu alojamiento de confianza' },
  MASAJE: { gradient: 'from-orange-500 to-rose-600', tag: 'Relájate y renueva energías' },
  PELUQUERIA: { gradient: 'from-purple-600 to-pink-600', tag: 'Estilo y confianza' },
  MEDICO: { gradient: 'from-teal-600 to-emerald-700', tag: 'Tu salud, primero' },
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
    `${tenant.name} es un ${industryLabel.toLowerCase()} ubicado en ${locationStr}. Consulta habitaciones disponibles, tarifas y reserva tu estadía online en tiempo real sin intermediarios.`;

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

  const t = await getTranslations();
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
  const hero = INDUSTRY_HERO[industry] ?? { gradient: 'from-slate-700 to-slate-900', tag: 'Tu negocio de confianza' };

  const commonAreaPhotos: string[] = (tenant.metadata as any)?.commonAreaPhotos || [];

  // WhatsApp Link
  const rawPhone = tenant.phone ? tenant.phone.replace(/[^0-9]/g, '') : null;
  const whatsappNumber = rawPhone
    ? rawPhone.startsWith('593')
      ? rawPhone
      : '593' + rawPhone.replace(/^0/, '')
    : null;
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola ${tenant.name}, quisiera consultar sobre sus reservaciones.`)}`
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

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `¿Dónde está ubicado ${tenant.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${tenant.name} está ubicado en ${fullAddress}. Puedes consultar su ubicación en el mapa interactivo.`,
        },
      },
      {
        '@type': 'Question',
        name: `¿Cómo hacer una reserva directa en ${tenant.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Puedes realizar tu reserva directa online sin comisiones seleccionando la fecha deseada en la página web oficial.`,
        },
      },
      ...(isHostal
        ? [
            {
              '@type': 'Question',
              name: `¿Cuáles son los horarios de Check-in y Check-out en ${tenant.name}?`,
              acceptedAnswer: {
                '@type': 'Answer',
                text: `El horario de Check-in es a partir de las 12:00 PM y el Check-out es hasta las 12:00 PM.`,
              },
            },
          ]
        : []),
    ],
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
      {/* JSON-LD Structured Data scripts for Search Engines & AI Assistants */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(businessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ─── Hero Banner ─── */}
      <section className={`relative overflow-hidden bg-gradient-to-br ${hero.gradient} text-white min-h-[400px]`}>
        {tenant.coverUrl ? (
          <div className="absolute inset-0 z-0">
            <img src={tenant.coverUrl} alt={tenant.name} className="w-full h-full object-cover opacity-35" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
          </div>
        ) : (
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 70% 40%, white 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
        )}

        <div className="relative z-10 mx-auto max-w-6xl px-6 py-20 sm:py-28 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-white/90 mb-4 border border-white/20">
              <span>{icon}</span>
              <span>{ti(industry as 'HOSTAL')}</span>
              <span className="text-white/40">·</span>
              <span>{hero.tag}</span>
            </div>

            <div className="flex items-center gap-4">
              {tenant.logoUrl ? (
                <img
                  src={tenant.logoUrl}
                  alt={tenant.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-white/30 shadow-2xl bg-white"
                />
              ) : null}
              <div>
                <h1 className="text-4xl sm:text-6xl font-black tracking-tight drop-shadow-md">
                  {tenant.name}
                </h1>
                {(tenant.comuna || tenant.parroquia || tenant.canton || tenant.provincia) && (
                  <p className="mt-1 text-sm font-semibold text-white/90 flex items-center gap-1.5">
                    <span>📍</span>
                    {[tenant.comuna ? `Comuna ${tenant.comuna}` : null, tenant.parroquia, tenant.canton, tenant.provincia]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>
            </div>

            {tenant.description && (
              <p className="mt-4 max-w-2xl text-base sm:text-lg text-white/85 leading-relaxed drop-shadow">
                "{tenant.description}"
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={bookingUrl}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-extrabold text-slate-900 shadow-xl transition hover:bg-slate-100 hover:-translate-y-0.5"
              >
                📅 {isHostal ? 'Reservar Habitación' : t('booking.title')}
              </Link>

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl transition hover:-translate-y-0.5"
                >
                  💬 WhatsApp
                </a>
              )}

              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
              >
                📍 Ver en Mapa
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Contact & Location Bar ─── */}
      <div className="bg-white border-b border-slate-200 shadow-sm relative z-20">
        <div className="mx-auto max-w-6xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl shrink-0">
              📍
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">{tenant.address || 'Dirección Principal'}</div>
              <div className="text-xs text-slate-500 font-medium">{fullAddress}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition"
              >
                <span>💬</span> WhatsApp {tenant.phone ? `(${tenant.phone})` : ''}
              </a>
            )}

            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 px-5 py-2.5 text-xs font-bold text-slate-800 transition"
            >
              <span>🗺️</span> Abrir Mapa de Google
            </a>
          </div>
        </div>
      </div>

      {/* ─── Áreas Comunes (For Hostales / Businesses with gallery) ─── */}
      {commonAreaPhotos.length > 0 && (
        <section className="bg-white border-b border-slate-100 py-12">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <span>{isHostal ? '🏊' : '📸'}</span>{' '}
              {isHostal ? 'Áreas Comunes e Instalaciones' : 'Galería del Establecimiento'}
            </h2>
            <p className="mt-1 text-slate-500 text-sm">
              {isHostal
                ? 'Conoce los espacios compartidos disponibles para nuestros huéspedes (piscina, terraza, cocina, recepción).'
                : 'Imágenes de nuestro local e instalaciones.'}
            </p>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {commonAreaPhotos.map((url, idx) => (
                <div key={idx} className="group relative h-44 rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-slate-100">
                  <img
                    src={url}
                    alt={`Área común ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Services / Rooms ─── */}
      {services.length > 0 && (
        <section id="servicios" className="mx-auto w-full max-w-6xl px-6 py-16">
          <h2 className="text-3xl font-extrabold text-slate-900">
            {isHostal ? 'Habitaciones y Tarifas' : 'Nuestros Servicios'}
          </h2>
          <p className="mt-2 text-slate-500 max-w-lg">
            {isHostal
              ? 'Selecciona tu tipo de habitación y consulta la disponibilidad en línea.'
              : 'Selecciona el servicio de tu preferencia y programa tu cita en minutos.'}
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <div
                key={s.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg hover:-translate-y-0.5 flex flex-col justify-between"
              >
                <div>
                  <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${hero.gradient} text-2xl text-white shadow-sm`}>
                    {icon}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{s.name}</h3>
                  {s.description && (
                    <p className="mt-1 text-sm text-slate-500 line-clamp-3">{s.description}</p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                      {isHostal
                        ? `📅 ${Math.max(1, Math.round(s.durationMin / 1440))} día(s)`
                        : `⏱ ${s.durationMin} min`}
                    </span>
                    {s.priceCents > 0 && (
                      <span className="text-lg font-extrabold text-slate-900">
                        ${(s.priceCents / 100).toFixed(2)}
                        <span className="text-xs font-normal text-slate-400"> {s.currency}</span>
                      </span>
                    )}
                  </div>
                  <Link
                    href={bookingUrl}
                    className={`block w-full rounded-xl bg-gradient-to-r ${hero.gradient} py-2.5 text-center text-sm font-bold text-white shadow-sm transition hover:opacity-90`}
                  >
                    {isHostal ? 'Reservar Estancia →' : 'Reservar Cita →'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Habitaciones Registradas / Fotos de Habitaciones ─── */}
      {isHostal && resources.length > 0 && (
        <section className="bg-slate-50 border-t border-slate-200/80 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <span>🔑</span> Galería de Habitaciones
            </h2>
            <p className="mt-1 text-slate-500 text-sm">
              Fotos y detalles de las habitaciones disponibles en el hostal.
            </p>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((room) => {
                const roomMeta = (room.metadata as any) || {};
                const photos: string[] = roomMeta.photos || [];
                const description: string | null = roomMeta.description || null;
                return (
                  <div key={room.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    {photos.length > 0 ? (
                      <div className="h-48 overflow-hidden relative">
                        <img src={photos[0]} alt={room.name} className="w-full h-full object-cover" />
                        {photos.length > 1 && (
                          <span className="absolute bottom-2 right-2 bg-slate-950/70 text-white text-xs font-bold px-2 py-1 rounded-md">
                            📷 {photos.length} fotos
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="h-36 bg-slate-100 flex items-center justify-center text-slate-400 text-3xl">
                        🛏️
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="font-bold text-slate-900 text-lg">{room.name}</h3>
                      {description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{description}</p>
                      )}

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-600 font-semibold pt-3 border-t border-slate-100">
                        <span>👥 Capacidad: {room.capacity} persona(s)</span>
                        <span className="text-emerald-600 font-bold">Disponible</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── Staff ─── */}
      {staffList.length > 0 && (
        <section className="bg-slate-100/60 border-t border-slate-200/80">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <h2 className="text-2xl font-extrabold text-slate-900">
              Nuestro <span className={`bg-gradient-to-r ${hero.gradient} bg-clip-text text-transparent`}>Equipo</span>
            </h2>
            <div className="mt-6 flex flex-wrap gap-4">
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
      <section className={`bg-gradient-to-br ${hero.gradient} mt-auto`}>
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2 className="text-3xl font-extrabold text-white">¿Listo para hacer tu reserva?</h2>
          <p className="mt-3 text-white/80">
            {isHostal ? 'Reserva tu habitación directamente sin comisiones ni intermediarios.' : 'Agenda tu cita ahora mismo en minutos.'}
          </p>
          <Link
            href={bookingUrl}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-extrabold text-slate-900 shadow-xl transition hover:-translate-y-0.5"
          >
            📅 {isHostal ? 'Reservar Habitación Ahora' : 'Reservar Cita Ahora'}
          </Link>
        </div>
      </section>
    </div>
  );
}
