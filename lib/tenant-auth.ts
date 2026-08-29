import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { isCentralApiEnabled, resolveCentralTenantBySlug } from '@/lib/central-api';
import type { Tenant } from '@prisma/control';

export type AuthenticatedTenantResult =
  | { success: true; tenant: Tenant; isSuperAdmin: boolean; userId: string }
  | { success: false; error: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND'; status: number };

/**
 * Resolves and validates access for a tenant by slug.
 * Access is granted if:
 * 1. The user is logged in AND is the owner of the tenant (tenant.ownerId === userId)
 * 2. OR the user is logged in AND has the role PLATFORM_ADMIN or is fhernandezcalle@gmail.com (Superadmin)
 */
export async function getAuthenticatedTenant(slug: string): Promise<AuthenticatedTenantResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED', status: 401 };
  }

  const userId = (session.user as { id: string }).id || 'superadmin-id';
  const userEmail = session.user.email?.toLowerCase();
  const userRole = (session.user as { role?: string }).role;
  const isSuperAdmin = userRole === 'PLATFORM_ADMIN' || userEmail === 'fhernandezcalle@gmail.com';

  let tenant: Tenant | null = null;

  if (isCentralApiEnabled()) {
    try {
      const centralResult = await resolveCentralTenantBySlug(slug);
      if (centralResult) {
        tenant = {
          id: centralResult.business.id,
          slug: centralResult.business.slug,
          name: centralResult.business.name,
          industry: centralResult.business.industry || 'RESTAURANTE',
          dbUrl: '',
          status: 'ACTIVE',
          plan: (centralResult.business.plan as any) || 'FREE',
          isTrial: false,
          trialEndsAt: null,
          ownerId: centralResult.business.ownerId || '',
          metadata: null,
          createdAt: new Date(centralResult.business.createdAt),
          updatedAt: new Date(centralResult.business.updatedAt),
          provincia: centralResult.branch.provincia || null,
          canton: centralResult.branch.city || null,
          parroquia: null,
          comuna: null,
          address: centralResult.branch.address || null,
          lat: centralResult.branch.lat || null,
          lng: centralResult.branch.lng || null,
          phone: centralResult.branch.phone || centralResult.business.whatsapp || null,
          description: centralResult.business.description || null,
          logoUrl: centralResult.business.logoUrl || null,
          coverUrl: centralResult.business.coverUrl || null,
        };
      }
    } catch (err) {
      console.warn('[tenant-auth] Central API resolution error, trying local fallback:', err);
    }
  }

  if (!tenant) {
    try {
      tenant = await prismaControl.tenant.findUnique({
        where: { slug },
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    } catch (err) {
      console.warn('[tenant-auth] Local Prisma resolution failed:', err);
    }
  }

  if (!tenant) {
    return { success: false, error: 'NOT_FOUND', status: 404 };
  }

  const isOwner = tenant.ownerId === userId;
  if (!isOwner && !isSuperAdmin) {
    return { success: false, error: 'FORBIDDEN', status: 403 };
  }

  return {
    success: true,
    tenant,
    isSuperAdmin,
    userId,
  };
}

