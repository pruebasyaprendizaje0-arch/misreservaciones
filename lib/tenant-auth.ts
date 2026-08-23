import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import type { Tenant } from '@prisma/control';

export type AuthenticatedTenantResult =
  | { success: true; tenant: Tenant; isSuperAdmin: boolean; userId: string }
  | { success: false; error: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND'; status: number };

/**
 * Resolves and validates access for a tenant by slug.
 * Access is granted if:
 * 1. The user is logged in AND is the owner of the tenant (tenant.ownerId === userId)
 * 2. OR the user is logged in AND has the role PLATFORM_ADMIN (Superadmin)
 */
export async function getAuthenticatedTenant(slug: string): Promise<AuthenticatedTenantResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED', status: 401 };
  }

  const userId = (session.user as { id: string }).id;
  const userRole = (session.user as { role?: string }).role;
  const isSuperAdmin = userRole === 'PLATFORM_ADMIN';

  const tenant = await prismaControl.tenant.findUnique({
    where: { slug },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
    },
  });

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
