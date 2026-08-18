import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';

const patchSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['PLATFORM_ADMIN', 'OWNER', 'STAFF', 'CUSTOMER']),
});

async function verifyAdmin() {
  const session = await auth();
  if (!session?.user) return false;
  const userRole = (session.user as { role?: string }).role;
  return userRole === 'PLATFORM_ADMIN';
}

export async function GET(_req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  // Fetch all platform users
  const users = await prismaControl.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: { ownedTenants: true },
      },
    },
  });

  return NextResponse.json({ users });
}

export async function PATCH(req: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });
  }

  const { userId, role } = parsed.data;

  // Make sure the target user exists
  const targetUser = await prismaControl.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
  }

  // Update role in control DB
  const updated = await prismaControl.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  });

  // Log this admin action
  await prismaControl.auditLog.create({
    data: {
      action: 'ADMIN_CHANGE_USER_ROLE',
      target: `user:${userId}`,
      metadata: { role, email: targetUser.email },
    },
  });

  return NextResponse.json({ user: updated });
}
