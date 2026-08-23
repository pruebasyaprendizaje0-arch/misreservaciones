export type TenantPlan = 'FREE' | 'PRO' | 'BUSINESS';

export interface PlanConfig {
  key: TenantPlan;
  name: string;
  priceMonthly: number; // in USD
  priceYearly: number;  // in USD
  tagline: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  popular?: boolean;
  maxServices: number;
  maxStaff: number;
  maxResources: number;
  monthlyBookingLimit: number;
  features: {
    whatsappReminders: boolean;
    customDomainSubdomain: boolean;
    directoryPriority: boolean;
    qrDeunaPayments: boolean;
    googleCalendarExport: boolean;
    exportCustomersExcel: boolean;
    customConfirmationNotes: boolean;
    advancedAnalytics: boolean;
    multiLocationStaff: boolean;
    prioritySupport247: boolean;
    customBrandingLogo: boolean;
  };
  featureHighlights: string[];
}

export const PLAN_CONFIGS: Record<TenantPlan, PlanConfig> = {
  FREE: {
    key: 'FREE',
    name: 'Plan Gratuito (Prueba 30 Días)',
    priceMonthly: 0,
    priceYearly: 0,
    tagline: 'Ideal para pequeños emprendimientos o para conocer la plataforma.',
    badge: 'FREE',
    badgeBg: 'bg-slate-800 border-slate-700',
    badgeText: 'text-slate-300 font-bold',
    maxServices: 3,
    maxStaff: 1,
    maxResources: 2,
    monthlyBookingLimit: 30,
    features: {
      whatsappReminders: false,
      customDomainSubdomain: true,
      directoryPriority: false,
      qrDeunaPayments: true,
      googleCalendarExport: true,
      exportCustomersExcel: false,
      customConfirmationNotes: true,
      advancedAnalytics: false,
      multiLocationStaff: false,
      prioritySupport247: false,
      customBrandingLogo: true,
    },
    featureHighlights: [
      'Hasta 3 Servicios o Tarifas',
      '1 Miembro de Personal / Administrador',
      'Hasta 30 Reservas al mes',
      'Subdominio mi-negocio.ubicame.cc',
      'Página Web de Reservas Directas',
      'Presencia en el Directorio del Ecuador',
    ],
  },
  PRO: {
    key: 'PRO',
    name: 'Plan Profesional',
    priceMonthly: 10,
    priceYearly: 100,
    tagline: 'Para negocios en crecimiento que buscan automatizar reservas y cobros.',
    badge: '⭐ PRO',
    badgeBg: 'bg-amber-500/20 border-amber-500/40',
    badgeText: 'text-amber-300 font-black',
    popular: true,
    maxServices: 15,
    maxStaff: 5,
    maxResources: 10,
    monthlyBookingLimit: 300,
    features: {
      whatsappReminders: true,
      customDomainSubdomain: true,
      directoryPriority: true,
      qrDeunaPayments: true,
      googleCalendarExport: true,
      exportCustomersExcel: true,
      customConfirmationNotes: true,
      advancedAnalytics: true,
      multiLocationStaff: true,
      prioritySupport247: false,
      customBrandingLogo: true,
    },
    featureHighlights: [
      'Hasta 15 Servicios / Tarifas',
      'Hasta 5 Miembros de Personal / Especialistas',
      'Hasta 300 Reservas al mes',
      'Notificaciones & Recordatorios por WhatsApp',
      'Posicionamiento Destacado en Directorio (Badge ⭐ PRO)',
      'Exportación de Clientes a Excel / CSV',
      'Estadísticas Avanzadas de Reservas e Ingresos',
      'Cobros Inmediatos con QR Deuna & Transferencias',
    ],
  },
  BUSINESS: {
    key: 'BUSINESS',
    name: 'Plan Empresarial / Business',
    priceMonthly: 15,
    priceYearly: 150,
    tagline: 'Solución integral sin límites para cadenas, hoteles y clínicas.',
    badge: '🚀 BUSINESS',
    badgeBg: 'bg-indigo-500/20 border-indigo-500/40',
    badgeText: 'text-indigo-300 font-black',
    maxServices: 999,
    maxStaff: 25,
    maxResources: 50,
    monthlyBookingLimit: 9999,
    features: {
      whatsappReminders: true,
      customDomainSubdomain: true,
      directoryPriority: true,
      qrDeunaPayments: true,
      googleCalendarExport: true,
      exportCustomersExcel: true,
      customConfirmationNotes: true,
      advancedAnalytics: true,
      multiLocationStaff: true,
      prioritySupport247: true,
      customBrandingLogo: true,
    },
    featureHighlights: [
      'Servicios & Tarifas Ilimitados',
      'Hasta 25 Especialistas / Habitaciones',
      'Reservas Ilimitadas sin límite mensual',
      'Notificaciones WhatsApp Masivas & Automatizadas',
      'Máxima Destacación en Directorio (Badge 🚀 BUSINESS)',
      'Soporte Técnico VIP 24/7 Dedicado',
      'Exportación Completa de Clientes y Reportes',
      'Asistente Superadministrador & Configuración Personalizada',
    ],
  },
};

export function getPlanConfig(plan?: string | null): PlanConfig {
  const normalized = (plan || 'FREE').toUpperCase() as TenantPlan;
  return PLAN_CONFIGS[normalized] || PLAN_CONFIGS.FREE;
}
