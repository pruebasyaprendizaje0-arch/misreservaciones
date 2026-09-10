import { prismaControl } from '@/lib/db/control';
import { getPlanConfig, type PlanConfig } from '@/lib/plans';
import { getTenantClient } from '@/lib/db/tenant';

export interface PlanGuardResult {
  allowed: boolean;
  reason?: string;
  planConfig: PlanConfig;
  currentCount?: number;
  maxAllowed?: number;
}

/**
 * Checks if a tenant can add more services based on its plan limits.
 */
export async function checkServiceLimit(slug: string): Promise<PlanGuardResult> {
  const tenant = await prismaControl.tenant.findUnique({
    where: { slug },
    select: { id: true, plan: true, dbUrl: true, isTrial: true },
  });

  if (!tenant) {
    return {
      allowed: false,
      reason: 'Tenant no encontrado',
      planConfig: getPlanConfig('FREE'),
    };
  }

  const planConfig = getPlanConfig(tenant.plan);
  const prismaTenant = getTenantClient(tenant.dbUrl);
  const currentCount = await prismaTenant.service.count();

  const maxAllowed = tenant.isTrial ? Math.max(planConfig.maxServices, 30) : planConfig.maxServices;

  if (currentCount >= maxAllowed) {
    return {
      allowed: false,
      reason: `Has alcanzado el límite de ${maxAllowed} servicio(s) de tu ${planConfig.name}. Actualiza a un plan superior para agregar más.`,
      planConfig,
      currentCount,
      maxAllowed,
    };
  }

  return {
    allowed: true,
    planConfig,
    currentCount,
    maxAllowed,
  };
}

/**
 * Checks if a tenant can add more staff members based on its plan limits.
 */
export async function checkStaffLimit(slug: string): Promise<PlanGuardResult> {
  const tenant = await prismaControl.tenant.findUnique({
    where: { slug },
    select: { id: true, plan: true, dbUrl: true, isTrial: true },
  });

  if (!tenant) {
    return {
      allowed: false,
      reason: 'Tenant no encontrado',
      planConfig: getPlanConfig('FREE'),
    };
  }

  const planConfig = getPlanConfig(tenant.plan);
  const prismaTenant = getTenantClient(tenant.dbUrl);
  const currentCount = await prismaTenant.staff.count();

  const maxAllowed = tenant.isTrial ? Math.max(planConfig.maxStaff, 20) : planConfig.maxStaff;

  if (currentCount >= maxAllowed) {
    return {
      allowed: false,
      reason: `Has alcanzado el límite de ${maxAllowed} miembro(s) de personal de tu ${planConfig.name}. Actualiza tu plan para agregar más especialistas.`,
      planConfig,
      currentCount,
      maxAllowed,
    };
  }

  return {
    allowed: true,
    planConfig,
    currentCount,
    maxAllowed,
  };
}

/**
 * Checks if a tenant can add more resources based on its plan limits.
 */
export async function checkResourceLimit(slug: string): Promise<PlanGuardResult> {
  const tenant = await prismaControl.tenant.findUnique({
    where: { slug },
    select: { id: true, plan: true, dbUrl: true, isTrial: true },
  });

  if (!tenant) {
    return {
      allowed: false,
      reason: 'Tenant no encontrado',
      planConfig: getPlanConfig('FREE'),
    };
  }

  const planConfig = getPlanConfig(tenant.plan);
  const prismaTenant = getTenantClient(tenant.dbUrl);
  const currentCount = await prismaTenant.resource.count();

  // If in trial mode, allow up to 30 resources
  const maxAllowed = tenant.isTrial ? Math.max(planConfig.maxResources, 30) : planConfig.maxResources;

  if (currentCount >= maxAllowed) {
    return {
      allowed: false,
      reason: `Has alcanzado el límite de ${maxAllowed} recurso(s) o habitación(es) de tu ${planConfig.name}. Actualiza a un plan superior para registrar más.`,
      planConfig,
      currentCount,
      maxAllowed,
    };
  }

  return {
    allowed: true,
    planConfig,
    currentCount,
    maxAllowed,
  };
}

/**
 * Checks feature permission for a tenant (e.g. exportCustomersExcel, whatsappReminders).
 */
export async function checkFeatureAccess(
  slug: string,
  feature: keyof PlanConfig['features']
): Promise<PlanGuardResult> {
  const tenant = await prismaControl.tenant.findUnique({
    where: { slug },
    select: { id: true, plan: true },
  });

  if (!tenant) {
    return {
      allowed: false,
      reason: 'Tenant no encontrado',
      planConfig: getPlanConfig('FREE'),
    };
  }

  const planConfig = getPlanConfig(tenant.plan);
  const isFeatureEnabled = planConfig.features[feature];

  if (!isFeatureEnabled) {
    return {
      allowed: false,
      reason: `La función requerida no está disponible en tu ${planConfig.name}. Actualiza a PRO ($10/m) o BUSINESS ($15/m) para desbloquearla.`,
      planConfig,
    };
  }

  return {
    allowed: true,
    planConfig,
  };
}
