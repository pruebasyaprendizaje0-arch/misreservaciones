import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';

async function getAuthenticatedTenant(slug: string) {
  const session = await auth();
  if (!session?.user) return null;
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;
  const isPlatformAdmin = role === 'PLATFORM_ADMIN';
  const tenant = await prismaControl.tenant.findUnique({ where: { slug } });
  if (!tenant) return null;
  if (tenant.ownerId !== userId && !isPlatformAdmin) return null;
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
  const bookings = await db.reservation.findMany({
    orderBy: { startsAt: 'desc' },
    include: { customer: true, service: true, resource: true, staff: true },
    take: 100,
  });
  return NextResponse.json({ bookings });
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
    const { serviceId, customerId, staffId, resourceId, startsAt, notes, status } = body;

    if (!serviceId || !customerId || !startsAt) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const db = getTenantClient(tenant.dbUrl);
    const service = await db.service.findUnique({ where: { id: serviceId } });
    if (!service) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });

    const startDate = new Date(startsAt);
    const endDate = new Date(startDate.getTime() + service.durationMin * 60 * 1000);

    const reservation = await db.reservation.create({
      data: {
        serviceId,
        customerId,
        staffId: staffId || null,
        resourceId: resourceId || null,
        startsAt: startDate,
        endsAt: endDate,
        status: status || 'CONFIRMED',
        notes: notes || null,
      },
      include: { customer: true, service: true, resource: true, staff: true },
    });

    return NextResponse.json({ ok: true, reservation }, { status: 201 });
  } catch (error) {
    console.error('Error al crear reserva:', error);
    return NextResponse.json({ error: 'Error al procesar la reserva' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const tenant = await getAuthenticatedTenant(slug);
  if (!tenant) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  try {
    const body = await req.json();
    const { id, status, notes, startsAt, endsAt } = body;

    if (!id) return NextResponse.json({ error: 'ID de reserva requerido' }, { status: 400 });

    const db = getTenantClient(tenant.dbUrl);
    const updateData: any = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (startsAt) updateData.startsAt = new Date(startsAt);
    if (endsAt) updateData.endsAt = new Date(endsAt);

    const updated = await db.reservation.update({
      where: { id },
      data: updateData,
      include: { customer: true, service: true, resource: true, staff: true },
    });

    return NextResponse.json({ ok: true, reservation: updated });

  } catch (error) {
    console.error('Error al actualizar reserva:', error);
    return NextResponse.json({ error: 'Error al actualizar reserva' }, { status: 500 });
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

    if (!id) return NextResponse.json({ error: 'ID de reserva requerido' }, { status: 400 });

    const db = getTenantClient(tenant.dbUrl);
    await db.reservation.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error al eliminar reserva:', error);
    return NextResponse.json({ error: 'Error al eliminar reserva' }, { status: 500 });
  }
}
