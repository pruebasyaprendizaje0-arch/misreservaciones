import type { Tenant } from '@prisma/control';
import { getIndustryConfig } from './industries';

export type SeoLocationInfo = {
  address?: string | null;
  comuna?: string | null;
  parroquia?: string | null;
  canton?: string | null;
  provincia?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export function formatFullAddress(location: SeoLocationInfo): string {
  return [
    location.address,
    location.comuna ? `Comuna ${location.comuna}` : null,
    location.parroquia,
    location.canton,
    location.provincia,
    'Ecuador',
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * Retorna el tipo de Schema.org según el tipo de industria para máxima precisión en AEO/GEO
 */
export function getSchemaTypeForIndustry(industry: string): string {
  const ind = (industry || '').toUpperCase();
  switch (ind) {
    case 'HOSTAL':
      return 'LodgingBusiness';
    case 'RESTAURANTE':
    case 'CAFETERIA':
      return 'Restaurant';
    case 'MEDICO':
    case 'ODONTOLOGIA':
      return 'MedicalBusiness';
    case 'PELUQUERIA':
    case 'BARBERIA':
      return 'HairSalon';
    case 'MASAJE':
    case 'SPA':
      return 'DaySpa';
    default:
      return 'LocalBusiness';
  }
}

/**
 * Genera el esquema semántico Schema.org principal para el negocio (LocalBusiness, LodgingBusiness, etc.)
 */
export function buildBusinessSchema(tenant: Tenant | any, locale: string = 'es') {
  const isEs = locale === 'es';
  const schemaType = getSchemaTypeForIndustry(tenant.industry);
  const indConfig = getIndustryConfig(tenant.industry);
  const industryLabel = indConfig.name;

  const fullAddress = formatFullAddress(tenant);
  const locationShort = tenant.comuna || tenant.parroquia || tenant.canton || 'Santa Elena';
  const canonicalUrl = `https://${tenant.slug}.misreservaciones.com/${locale}`;
  const mapUrl =
    tenant.lat && tenant.lng
      ? `https://www.google.com/maps?q=${tenant.lat},${tenant.lng}`
      : `https://www.google.com/maps?q=${encodeURIComponent(`${tenant.name}, ${fullAddress}`)}`;

  const images = [tenant.coverUrl, tenant.logoUrl].filter(Boolean) as string[];

  return {
    '@context': 'https://schema.org',
    '@type': schemaType,
    '@id': `${canonicalUrl}#business`,
    name: tenant.name,
    legalName: tenant.name,
    description:
      tenant.description ||
      (isEs
        ? `${tenant.name} es un ${industryLabel.toLowerCase()} ubicado en ${locationShort}, ${tenant.provincia || 'Ecuador'}. Reserva directamente en línea sin comisiones de intermediarios.`
        : `${tenant.name} is a ${industryLabel.toLowerCase()} located in ${locationShort}, ${tenant.provincia || 'Ecuador'}. Book directly online with zero platform commissions.`),
    url: canonicalUrl,
    telephone: tenant.phone || undefined,
    image: images.length > 0 ? images : undefined,
    logo: tenant.logoUrl || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: tenant.address || undefined,
      addressLocality: tenant.comuna || tenant.parroquia || tenant.canton || undefined,
      addressRegion: tenant.provincia || 'Santa Elena',
      addressCountry: 'EC',
    },
    ...(tenant.lat && tenant.lng
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: Number(tenant.lat),
            longitude: Number(tenant.lng),
          },
        }
      : {}),
    hasMap: mapUrl,
    priceRange: '$$',
    currenciesAccepted: 'USD',
    paymentAccepted: 'Cash, Credit Card, Direct Transfer',
    areaServed: {
      '@type': 'AdministrativeArea',
      name: tenant.provincia || 'Santa Elena',
    },
    knowsLanguage: ['es', 'en'],
  };
}

/**
 * Genera esquemas tipo Service para los servicios u ofertas del negocio
 */
export function buildServicesSchema(services: any[], tenant: Tenant | any, locale: string = 'es') {
  if (!services || services.length === 0) return null;

  const canonicalUrl = `https://${tenant.slug}.misreservaciones.com/${locale}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${canonicalUrl}#services`,
    name: locale === 'es' ? `Servicios y Tarifas de ${tenant.name}` : `Services and Rates for ${tenant.name}`,
    numberOfItems: services.length,
    itemListElement: services.map((s, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Service',
        name: s.name,
        description: s.description || `${s.name} en ${tenant.name}`,
        provider: {
          '@type': 'LocalBusiness',
          name: tenant.name,
        },
        offers: {
          '@type': 'Offer',
          price: (s.priceCents / 100).toFixed(2),
          priceCurrency: s.currency || 'USD',
          availability: 'https://schema.org/InStock',
        },
      },
    })),
  };
}

/**
 * Genera esquema tipo FAQPage estructurado para extracción conversacional de motores de IA (AEO / GEO)
 */
export function buildFaqSchema(faqItems: Array<{ q: string; a: string }>) {
  if (!faqItems || faqItems.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

/**
 * Genera esquema tipo BreadcrumbList para navegación jerárquica
 */
export function buildBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
