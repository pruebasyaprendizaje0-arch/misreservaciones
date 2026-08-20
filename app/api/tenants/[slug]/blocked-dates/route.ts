import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';

async function getAuthenticatedTenant(slug: string) {
  const session = await auth();
  if (!session?.user) return null;
  const userId = (session.user as { id: string }).id;
  const tenant = await prismaControl.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.ownerId !== userId) return null;
  return tenant;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const tenant = await getAuthenticatedTenant(slug);
  if (!tenant) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const db = getTenantClient(tenant.dbUrl);
  const exceptions = await db.availabilityException.findMany({
    orderBy: { date: 'asc' },
  });

  return NextResponse.json({ exceptions });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const tenant = await getAuthenticatedTenant(slug);
  if (!tenant) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const body = await req.json();
    const { date, reason, blocked = true } = body;

    if (!date) {
      return NextResponse.json({ error: 'La fecha es obligatoria' }, { status: 400 });
    }

    const db = getTenantClient(tenant.dbUrl);
    const exception = await db.availabilityException.create({
      data: {
        date: new Date(date),
        reason: reason || 'Fecha bloqueada por administración',
        blocked,
      },
    });

    return NextResponse.json({ ok: true, exception }, { status: 201 });
  } catch (error) {
    console.error('Error al bloquear fecha:', error);
    return NextResponse.json({ error: 'Error al bloquear fecha' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const tenant = await getAuthenticatedTenant(slug);
  if (!tenant) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID de bloqueo requerido' }, { status: 400 });

    const db = getTenantClient(tenant.dbUrl);
    await db.availabilityException.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error al eliminar bloqueo:', error);
    return NextResponse.json({ error: 'Error al eliminar bloqueo' }, { status: 500 });
  }
}
