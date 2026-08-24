import { NextResponse, type NextRequest } from 'next/server';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';
import { getPricingRules, calculateReservationPrice } from '@/lib/pricing';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const tenant = await prismaControl.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: 'TENANT_NOT_FOUND' }, { status: 404 });

  const { searchParams } = req.nextUrl;
  const serviceId = searchParams.get('serviceId');
  const startsAtStr = searchParams.get('startsAt');
  const checkOutDateStr = searchParams.get('checkOutDate') || searchParams.get('endsAt');

  if (!serviceId || !startsAtStr) {
    return NextResponse.json({ error: 'MISSING_PARAMS' }, { status: 400 });
  }

  const startsAt = new Date(startsAtStr);
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: 'INVALID_DATE' }, { status: 400 });
  }

  try {
    const db = getTenantClient(tenant.dbUrl);
    const service = await db.service.findUnique({ where: { id: serviceId } });
    if (!service) return NextResponse.json({ error: 'SERVICE_NOT_FOUND' }, { status: 404 });

    const pricingRules = await getPricingRules(tenant.dbUrl);

    const calculation = calculateReservationPrice({
      basePriceCents: service.priceCents,
      startsAt,
      endsAt: checkOutDateStr ? new Date(checkOutDateStr) : undefined,
      industry: service.industry || tenant.industry,
      pricingRules,
    });

    return NextResponse.json({
      ok: true,
      service: {
        id: service.id,
        name: service.name,
        currency: service.currency,
        basePriceCents: service.priceCents,
      },
      calculation,
    });
  } catch (error) {
    console.error('Error al cotizar tarifa:', error);
    return NextResponse.json({ error: 'Error interno al cotizar la tarifa' }, { status: 500 });
  }
}
