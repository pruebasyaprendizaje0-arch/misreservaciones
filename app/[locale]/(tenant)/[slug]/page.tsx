import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getTenantContext } from '@/lib/tenant-context';
import { getTenantClient } from '@/lib/db/tenant';
import { getTranslations } from 'next-intl/server';
import { headers } from 'next/headers';
import { ThemeToggle } from '@/components/dashboard/ThemeToggle';
import { LanguageToggle } from '@/components/dashboard/LanguageToggle';
import { ShareBusinessButton } from '@/components/ShareBusinessButton';

const INDUSTRY_ICONS: Record<string, string> = {
  HOSTAL: '🏨',
  MASAJE: '💆',
  PELUQUERIA: '💈',
  MEDICO: '🩺',
};

const INDUSTRY_HERO: Record<string, { gradient: string; tagEs: string; tagEn: string; bgAccent: string }> = {
  HOSTAL: { gradient: 'from-sky-600 via-indigo-600 to-slate-900', bgAccent: 'bg-sky-500/20', tagEs: 'Tu Alojamiento de Confianza', tagEn: 'Your Trusted Accommodation' },
  MASAJE: { gradient: 'from-amber-500 via-rose-600 to-slate-900', bgAccent: 'bg-rose-500/20', tagEs: 'Bienestar y Relajación', tagEn: 'Wellness & Relaxation' },
  PELUQUERIA: { gradient: 'from-purple-600 via-pink-600 to-slate-900', bgAccent: 'bg-pink-500/20', tagEs: 'Estilo y Cuidado Personal', tagEn: 'Style & Personal Care' },
  MEDICO: { gradient: 'from-teal-600 via-emerald-600 to-slate-900', bgAccent: 'bg-teal-500/20', tagEs: 'Atención Médica Profesional', tagEn: 'Professional Medical Care' },
};

import { getIndustryConfig } from '@/lib/industries';

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
  const indConfig = getIndustryConfig(tenant.industry);
  const industryLabel = indConfig.name;

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
    if (ctx.dbUrl) {
      const db = getTenantClient(ctx.dbUrl);
      [services, staffList, resources] = await Promise.all([
        db.service.findMany({
          where: { active: true },
          orderBy: { createdAt: 'asc' },
        }),
        db.staff.findMany({ where: { active: true }, select: { id: true, name: true, role: true } }),
        db.resource.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      ]);
    } else {
      services = [
        {
          id: 'serv-central',
          name: 'Reservación / Atenciones',
          description: 'Reserva tu mesa, cita o espacio directamente en la sucursal.',
          durationMin: 60,
          priceCents: 0,
          currency: 'USD',
          active: true,
          industry: ctx.tenant?.industry || 'RESTAURANTE',
        },
      ];
    }
  } catch (err) {
    console.error(`[TenantHome] Warning: Could not fetch DB data for ${slug}:`, err);
  }


  const tenant = ctx.tenant;
  const industry = tenant.industry;
  const indConfig = getIndustryConfig(industry);
  const isHostal = indConfig.bookingMode === 'NIGHTLY';
  const isEn = locale === 'en';
  const icon = indConfig.icon;
  const heroInfo = INDUSTRY_HERO[industry] ?? {
    gradient: 'from-slate-800 via-indigo-950 to-slate-900',
    bgAccent: 'bg-indigo-500/20',
    tagEs: indConfig.description,
    tagEn: indConfig.description,
  };
  const heroTag = isEn ? heroInfo.tagEn : heroInfo.tagEs;

  const commonAreaPhotos: string[] = (tenant.metadata as any)?.commonAreaPhotos || [];
  const rawMapsEmbed: string | null = (tenant.metadata as any)?.googleMapsEmbed || null;
  const mapsSrc = (() => {
    if (!rawMapsEmbed) return null;
    const trimmed = rawMapsEmbed.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    return match ? match[1] : null;
  })();

  // WhatsApp Link
  const rawPhone = tenant.phone ? tenant.phone.replace(/[^0-9]/g, '') : null;
  const whatsappNumber = rawPhone
    ? rawPhone.startsWith('593')
      ? rawPhone
      : '593' + rawPhone.replace(/^0/, '')
    : null;
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        isEn
          ? `Hello ${tenant.name}, I would like to inquire about services and bookings.`
          : `Hola ${tenant.name}, me gustaría realizar una consulta sobre sus servicios y reservas.`
      )}`
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

  const faqList = isEn
    ? [
        {
          q: `How can I make a reservation at ${tenant.name}?`,
          a: `You can book directly online on our official website by selecting the "${isHostal ? 'Book Room' : 'Book Appointment'}" option at the top. You will receive an instant confirmation without paying extra platform fees.`,
        },
        {
          q: `Where is ${tenant.name} located?`,
          a: `${tenant.name} is located at ${fullAddress}. You can open our exact location on Google Maps using the direct button on this page.`,
        },
        ...(isHostal
          ? [
              {
                q: `What are the Check-in and Check-out times?`,
                a: `Our standard Check-in time starts at 12:00 PM and Check-out is up to 12:00 PM. If you need a special schedule, contact us directly via WhatsApp.`,
              },
              {
                q: `Does the establishment have common areas or Wi-Fi?`,
                a: `Yes, we offer air-conditioned spaces, free Wi-Fi connection, and common areas for our guests to enjoy.`,
              },
            ]
          : [
              {
                q: `Is advance booking required?`,
                a: `We recommend booking in advance through our online platform to guarantee availability for your preferred service or staff member.`,
              },
            ]),
      ]
    : [
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
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased transition-colors duration-300">
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
      <section className="relative overflow-hidden bg-slate-950 text-white min-h-[450px] sm:min-h-[500px] flex flex-col justify-between pt-6 pb-14 sm:pt-8 sm:pb-16">
        {/* Ambient Glows */}
        <div className="absolute -top-32 -left-32 w-[450px] h-[450px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="absolute -bottom-32 -right-32 w-[450px] h-[450px] bg-sky-500/15 rounded-full blur-[120px] pointer-events-none z-0" />

        {/* Cover Image Background with clear visibility */}
        {tenant.coverUrl ? (
          <div className="absolute inset-0 z-0">
            <img src={tenant.coverUrl} alt={tenant.name} className="w-full h-full object-cover opacity-95 scale-100 transition-transform duration-1000" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/30 to-slate-950/95" />
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

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 w-full flex flex-col justify-between flex-1 space-y-8 sm:space-y-12">
          {/* Top Section: Tag Badge & Title at the VERY TOP of cover image */}
          <div className="space-y-3.5 pt-1 sm:pt-2">
            <div>
              <div className="inline-flex items-center gap-2.5 rounded-full bg-slate-950/60 backdrop-blur-md px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-indigo-100 border border-white/20 shadow-md">
                <span className="text-base">{icon}</span>
                <span>{indConfig.name}</span>
                <span className="text-white/40">•</span>
                <span className="text-white/90">{heroTag}</span>
              </div>
            </div>

            {/* Title & Logo Header - Placed right at top */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 sm:gap-5">
              {tenant.logoUrl ? (
                <img
                  src={tenant.logoUrl}
                  alt={tenant.name}
                  className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/50 shadow-2xl bg-white shrink-0"
                />
              ) : null}
              <div>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] leading-[1.1]">
                  {tenant.name}
                </h1>
                {(tenant.comuna || tenant.parroquia || tenant.canton || tenant.provincia) && (
                  <div className="mt-2 inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-white/95 bg-slate-950/50 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full shadow-md">
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
          </div>

          {/* Bottom Section: Only CTA Button & Trust Badges */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4">
            <Link
              href={bookingUrl}
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 px-8 py-4 text-base font-extrabold shadow-2xl shadow-black/50 transition-all hover:scale-[1.02] active:scale-95"
            >
              <span>📅</span>
              <span>
                {isHostal
                  ? isEn
                    ? 'Book Room Now'
                    : 'Reservar Habitación Ahora'
                  : isEn
                  ? 'Book Appointment Now'
                  : 'Reservar Cita Ahora'}
              </span>
              <span className="text-slate-400 font-normal">→</span>
            </Link>

            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/90">
              <span className="inline-flex items-center gap-1.5 bg-slate-950/50 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/20 shadow-md">
                {isEn ? '✨ Direct Booking' : '✨ Reserva Directa'}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-slate-950/50 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/20 shadow-md">
                {isEn ? '⚡ Instant Confirmation' : '⚡ Confirmación Inmediata'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Contact & Location Card (Floating Bar) ─── */}
      <div className="-mt-8 relative z-30 mx-auto max-w-6xl px-4 sm:px-6 w-full">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xl shadow-slate-900/5 dark:shadow-black/40 flex flex-col md:flex-row items-center justify-between gap-5 backdrop-blur-xl">
          <div className="flex items-center gap-4 text-sm text-slate-700 dark:text-slate-300 w-full md:w-auto">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 dark:from-indigo-950/80 dark:to-sky-950/80 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-2xl shrink-0 text-indigo-600 dark:text-indigo-400 shadow-xs">
              📍
            </div>
            <div>
              <div className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                {tenant.address || (isEn ? 'Main Address' : 'Dirección Principal')}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{fullAddress}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
            <ShareBusinessButton tenantName={tenant.name} tenantSlug={slug} />
            <LanguageToggle currentLocale={locale} />
            <ThemeToggle />

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
              href={mapsSrc ? '#mapa' : mapUrl}
              target={mapsSrc ? undefined : '_blank'}
              rel={mapsSrc ? undefined : 'noopener noreferrer'}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-5 py-3 text-xs font-extrabold shadow-md shadow-slate-900/10 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <span className="text-base">🗺️</span>
              <span>
                {mapsSrc
                  ? isEn
                    ? 'View Map Below'
                    : 'Ver Mapa Abajo'
                  : isEn
                  ? 'Open Google Maps'
                  : 'Abrir Mapa de Google'}
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* ─── Description Section ─── */}
      {tenant.description && (
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 w-full">
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-md shadow-slate-900/5 dark:shadow-black/40">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl font-bold shrink-0">
                ℹ️
              </div>
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
                  {isEn ? `About ${tenant.name}` : `Sobre ${tenant.name}`}
                </h3>
                <p className="text-base sm:text-lg text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                  &quot;{tenant.description}&quot;
                </p>

              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── Why Book Direct Section (Value Pillars) ─── */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-8 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl font-bold mb-3">
              ⚡
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {isEn ? 'Instant Booking' : 'Reserva Instantánea'}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isEn
                ? 'Check real-time availability and confirm without waiting.'
                : 'Consulta disponibilidad actualizada en tiempo real y confirma sin esperas.'}
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl font-bold mb-3">
              💰
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {isEn ? 'Best Direct Price' : 'Mejor Precio Directo'}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isEn
                ? 'Deal directly with us, no third-party platform commissions.'
                : 'Trato directo con el establecimiento, sin comisiones de plataformas externas.'}
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center text-xl font-bold mb-3">
              💬
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {isEn ? 'Direct Contact' : 'Contacto Directo'}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isEn
                ? 'Resolve your questions directly via WhatsApp before or after booking.'
                : 'Resuelve tus dudas directamente por WhatsApp antes o después de tu reserva.'}
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl font-bold mb-3">
              🛡️
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {isEn ? 'Guarantee & Trust' : 'Garantía y Confianza'}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isEn
                ? 'Your reservation is officially registered right away.'
                : 'Tu reservación queda registrada oficialmente de forma inmediata.'}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Áreas Comunes / Galería de Instalaciones ─── */}
      {commonAreaPhotos.length > 0 && (
        <section className="bg-white dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800 py-14">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-2">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  {isEn ? 'Facilities' : 'Instalaciones'}
                </span>
                <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2.5">
                  <span>{isHostal ? '🏊' : '📸'}</span>
                  <span>
                    {isHostal
                      ? isEn
                        ? 'Common Areas & Facilities'
                        : 'Áreas Comunes e Instalaciones'
                      : isEn
                      ? 'Establishment Gallery'
                      : 'Galería del Establecimiento'}
                  </span>
                </h2>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md">
                {isHostal
                  ? isEn
                    ? 'Explore shared spaces available for our guests (pool, terrace, reception, garden).'
                    : 'Explora los espacios compartidos disponibles para nuestros huéspedes (piscina, terraza, recepción, áreas verdes).'
                  : isEn
                  ? 'Facilities equipped for your comfort and best care.'
                  : 'Instalaciones equipadas para tu confort y la mejor atención.'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {commonAreaPhotos.map((url, idx) => (
                <div key={idx} className="group relative h-48 rounded-3xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                  <img
                    src={url}
                    alt={`Área común ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <span className="text-white text-xs font-bold">
                      {isEn ? 'View full photo' : 'Ver imagen completa'}
                    </span>
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
              <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                {isHostal
                  ? isEn
                    ? 'Available Accommodation'
                    : 'Alojamiento Disponible'
                  : isEn
                  ? 'Services Catalog'
                  : 'Catálogo de Servicios'}
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {isHostal
                  ? isEn
                    ? 'Rooms & Rates'
                    : 'Habitaciones y Tarifas'
                  : isEn
                  ? 'Our Services'
                  : 'Nuestros Servicios'}
              </h2>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md">
              {isHostal
                ? isEn
                  ? 'Choose the room that best fits your needs and check online rates.'
                  : 'Selecciona la habitación que mejor se adapte a tus necesidades y consulta la tarifa en línea.'
                : isEn
                ? 'Choose your preferred service and book your appointment in a few clicks.'
                : 'Selecciona el servicio de tu preferencia y agenda tu cita en pocos clics.'}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <div
                key={s.id}
                className="group relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-xs transition-all duration-300 hover:shadow-xl hover:shadow-slate-900/10 dark:hover:shadow-black/50 hover:border-indigo-300 dark:hover:border-indigo-600 hover:-translate-y-1.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${heroInfo.gradient} text-2xl text-white shadow-md shadow-indigo-900/20 flex group-hover:scale-105 transition-transform`}>
                      {icon}
                    </div>
                    {s.priceCents > 0 && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200/60 dark:border-emerald-800 px-3.5 py-1 rounded-full text-emerald-700 dark:text-emerald-300 font-extrabold text-sm shadow-2xs">
                        ${(s.priceCents / 100).toFixed(2)}
                        <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400"> {s.currency}</span>
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {s.name}
                  </h3>

                  {s.description && (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                      {s.description}
                    </p>
                  )}
                </div>

                <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-4">
                    <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                      {isHostal
                        ? `📅 ${Math.max(1, Math.round(s.durationMin / 1440))} ${isEn ? 'day(s)' : 'día(s)'}`
                        : `⏱ ${s.durationMin} min`}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {isEn ? 'Available' : 'Disponible'}
                    </span>
                  </div>

                  <Link
                    href={bookingUrl}
                    className="w-full rounded-2xl bg-slate-900 dark:bg-indigo-600 hover:bg-indigo-600 dark:hover:bg-indigo-500 py-3.5 text-center text-sm font-extrabold text-white shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>
                      {isHostal
                        ? isEn
                          ? 'Book Stay'
                          : 'Reservar Estancia'
                        : isEn
                        ? 'Book Appointment'
                        : 'Reservar Cita'}
                    </span>
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
        <section className="bg-slate-100/70 dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-8">
              <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                {isEn ? 'Room Gallery' : 'Galería de Habitaciones'}
              </span>
              <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2.5">
                <span>🔑</span> {isEn ? 'Room Details & Amenities' : 'Detalle de Habitaciones'}
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((room) => {
                const roomMeta = (room.metadata as any) || {};
                const photos: string[] = roomMeta.photos || [];
                const description: string | null = roomMeta.description || null;
                return (
                  <div key={room.id} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:shadow-lg transition-all">
                    {photos.length > 0 ? (
                      <div className="h-52 overflow-hidden relative group">
                        <img
                          src={photos[0]}
                          alt={room.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {photos.length > 1 && (
                          <span className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-xl shadow-xs">
                            📷 {photos.length} {isEn ? 'photos' : 'fotos'}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="h-40 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-4xl">
                        🛏️
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">{room.name}</h3>
                      {description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">{description}</p>
                      )}

                      <div className="mt-4 flex items-center justify-between text-xs font-bold pt-4 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
                          👥 {isEn ? 'Capacity' : 'Capacidad'}: {room.capacity} {isEn ? 'guests' : 'pers.'}
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-3 py-1 rounded-xl border border-emerald-200/50 dark:border-emerald-800">
                          🟢 {isEn ? 'Available' : 'Disponible'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── Mapa Interactivo de Ubicación Google Maps ─── */}
      {mapsSrc && (
        <section id="mapa" className="bg-slate-900 text-white border-t border-slate-800 py-16 scroll-mt-6">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-400">
                  {isEn ? 'Map & Location' : 'Mapa e Instalaciones'}
                </span>
                <h2 className="text-3xl font-black text-white mt-1 flex items-center gap-2.5">
                  <span>📍</span> {isEn ? 'Location & Directions' : 'Ubicación y Cómo Llegar'}
                </h2>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {tenant.address && (
                  <p className="text-slate-300 text-sm max-w-md bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700/80 flex items-center gap-2">
                    <span>🗺️</span>
                    <span>{tenant.address}</span>
                  </p>
                )}
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 text-xs font-extrabold shadow-md transition"
                >
                  <span>📍 {isEn ? 'Open GPS' : 'Abrir GPS'}</span>
                  <span>↗</span>
                </a>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden border border-slate-700/80 shadow-2xl shadow-slate-950/50 bg-slate-950 h-96 sm:h-[450px] w-full">
              <iframe
                src={mapsSrc}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full"
                title={`Mapa de ubicación de ${tenant.name}`}
              />
            </div>
          </div>
        </section>
      )}

      {/* ─── FAQ Section (Acordeón interactivo sin JS) ─── */}
      <section className="mx-auto max-w-4xl px-6 py-16 w-full">
        <div className="text-center mb-10">
          <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            {isEn ? 'We answer your questions' : 'Resolvemos tus dudas'}
          </span>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {isEn ? 'Frequently Asked Questions' : 'Preguntas Frecuentes'}
          </h2>
        </div>

        <div className="space-y-3">
          {faqList.map((faq, idx) => (
            <details
              key={idx}
              className="group rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs [&_summary::-webkit-details-marker]:hidden transition-all hover:border-indigo-200 dark:hover:border-indigo-700"
            >
              <summary className="flex cursor-pointer items-center justify-between font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-base select-none">
                <span>{faq.q}</span>
                <span className="ml-4 shrink-0 transition-transform duration-300 group-open:-rotate-180 text-indigo-500 dark:text-indigo-400 font-extrabold">
                  ↓
                </span>
              </summary>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
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
              {isEn ? 'Ready to secure your reservation?' : '¿Listo para asegurar tu reserva?'}
            </h2>
            <p className="mt-4 text-slate-300 text-base leading-relaxed">
              {isHostal
                ? isEn
                  ? 'Book your stay directly with us without intermediary commissions.'
                  : 'Reserva tu estancia directamente con el establecimiento sin comisiones de intermediarios.'
                : isEn
                ? 'Book your appointment online in seconds.'
                : 'Agenda tu cita en línea en cuestión de segundos.'}
            </p>
            <div className="mt-8">
              <Link
                href={bookingUrl}
                className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white px-9 py-4 font-black text-base shadow-xl shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95"
              >
                <span>📅</span>
                <span>
                  {isHostal
                    ? isEn
                      ? 'Book Room Now'
                      : 'Reservar Habitación Ahora'
                    : isEn
                    ? 'Book Appointment Now'
                    : 'Reservar Cita Ahora'}
                </span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
