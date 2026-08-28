import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';
import { getPricingRules, calculateReservationPrice } from '@/lib/pricing';
import {
  isCentralApiEnabled,
  resolveCentralTenantBySlug,
  getCentralBranchReservations,
  createCentralReservation,
  updateCentralReservationStatus,
} from '@/lib/central-api';

async function getAuthenticatedTenant(slug: string) {
  const session = await auth();
  if (!session?.user) return null;
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;
  const isPlatformAdmin = role === 'PLATFORM_ADMIN';

  // 1. Si la API Central está activa, resolver mediante Central
  if (isCentralApiEnabled()) {
    const central = await resolveCentralTenantBySlug(slug);
    if (central) {
      return {
        id: central.business.id,
        slug: central.business.slug,
        name: central.business.name,
        industry: central.business.industry || 'RESTAURANTE',
        dbUrl: '',
        centralBusinessId: central.business.id,
        centralBranchId: central.branch.id,
        sessionToken: (session as any).accessToken || null,
      };
    }
  }

  // 2. Fallback local Prisma
  const tenant = await prismaControl.tenant.findUnique({ where: { slug } });
  if (!tenant) return null;
  if (tenant.ownerId !== userId && !isPlatformAdmin) return null;
  return {
    ...tenant,
    centralBusinessId: tenant.id,
    centralBranchId: null,
    sessionToken: (session as any).accessToken || null,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const tenant = await getAuthenticatedTenant(slug);
  if (!tenant) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  // 1. API Central si está habilitada y existe sucursal central
  if (isCentralApiEnabled() && tenant.centralBranchId && tenant.sessionToken) {
    try {
      const centralBookings = await getCentralBranchReservations(tenant.centralBranchId, tenant.sessionToken);
      const bookingsMapped = centralBookings.map((b) => ({
        id: b.id,
        customerId: b.customerId || '',
        serviceId: '',
        resourceId: null,
        staffId: null,
        startsAt: b.startsAt,
        endsAt: b.endsAt,
        status: b.status,
        notes: b.notes || '',
        customer: {
          id: b.customerId || '',
          name: b.customerName,
          email: b.customerEmail,
          phone: b.customerPhone,
        },
        service: b.serviceName ? { name: b.serviceName } : null,
        resource: b.resourceName ? { name: b.resourceName } : null,
        staff: b.staffName ? { name: b.staffName } : null,
        payments: [],
      }));

      return NextResponse.json({ bookings: bookingsMapped });
    } catch (err) {
      console.warn('[api/bookings] Error consultando API Central, usando fallback local:', err);
    }
  }

  // 2. Fallback Prisma local
  if (!tenant.dbUrl) {
    return NextResponse.json({ bookings: [] });
  }

  const db = getTenantClient(tenant.dbUrl);
  const bookings = await db.reservation.findMany({
    orderBy: { startsAt: 'desc' },
    include: { customer: true, service: true, resource: true, staff: true, payments: true },
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
    const { serviceId, customerName, customerEmail, customerPhone, startsAt, endsAt, notes, serviceName } = body;

    if (!startsAt || (!customerName && !body.customerId)) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // 1. API Central
    if (isCentralApiEnabled() && tenant.centralBranchId) {
      const startIso = new Date(startsAt).toISOString();
      const endIso = endsAt ? new Date(endsAt).toISOString() : new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();

      const centralRes = await createCentralReservation(tenant.centralBranchId, {
        customerName: customerName || 'Cliente',
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        serviceName: serviceName || serviceId || 'Servicio General',
        startsAt: startIso,
        endsAt: endIso,
        notes: notes || null,
      });

      if (centralRes.ok && centralRes.reservation) {
        return NextResponse.json({ ok: true, reservation: centralRes.reservation }, { status: 201 });
      }
    }

    // 2. Fallback Prisma Local
    if (!tenant.dbUrl) {
      return NextResponse.json({ error: 'No se configuró base local para fallback' }, { status: 400 });
    }

    const db = getTenantClient(tenant.dbUrl);
    const service = await db.service.findUnique({ where: { id: serviceId } });
    if (!service) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });

    const startDate = new Date(startsAt);
    const endDate = new Date(startDate.getTime() + service.durationMin * 60 * 1000);

    const pricingRules = await getPricingRules(tenant.dbUrl);
    const pricingCalculation = calculateReservationPrice({
      basePriceCents: service.priceCents,
      startsAt: startDate,
      endsAt: endDate,
      industry: service.industry || tenant.industry,
      pricingRules,
    });

    const reservation = await db.reservation.create({
      data: {
        serviceId,
        customerId: body.customerId,
        staffId: body.staffId || null,
        resourceId: body.resourceId || null,
        startsAt: startDate,
        endsAt: endDate,
        status: body.status || 'CONFIRMED',
        notes: notes || null,
        metadata: { pricing: pricingCalculation },
      },
      include: { customer: true, service: true, resource: true, staff: true, payments: true },
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
    const { id, status, notes } = body;

    if (!id) return NextResponse.json({ error: 'ID de reserva requerido' }, { status: 400 });

    // 1. API Central si hay token de sesión
    if (isCentralApiEnabled() && tenant.sessionToken && status) {
      const centralRes = await updateCentralReservationStatus(id, status, tenant.sessionToken);
      if (centralRes.ok && centralRes.reservation) {
        return NextResponse.json({ ok: true, reservation: centralRes.reservation });
      }
    }

    // 2. Fallback Prisma local
    if (!tenant.dbUrl) {
      return NextResponse.json({ error: 'No se pudo actualizar la reservación en API Central ni base local' }, { status: 400 });
    }

    const db = getTenantClient(tenant.dbUrl);
    const updateData: any = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

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

    if (isCentralApiEnabled() && tenant.sessionToken) {
      const centralRes = await updateCentralReservationStatus(id, 'CANCELLED', tenant.sessionToken);
      if (centralRes.ok) {
        return NextResponse.json({ ok: true });
      }
    }

    if (!tenant.dbUrl) {
      return NextResponse.json({ ok: true });
    }

    const db = getTenantClient(tenant.dbUrl);
    await db.reservation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error al eliminar reserva:', error);
    return NextResponse.json({ error: 'Error al eliminar reserva' }, { status: 500 });
  }
}

