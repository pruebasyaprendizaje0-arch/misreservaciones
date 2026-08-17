import { NextResponse, type NextRequest } from 'next/server';
import { getTenantContext } from '@/lib/tenant-context';
import { createBooking, createBookingSchema } from '@/lib/booking';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantParam = searchParams.get('tenant') || undefined;
  const ctx = await getTenantContext(tenantParam);
  if (!ctx.dbUrl) {
    return NextResponse.json({ error: 'TENANT_NOT_FOUND' }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createBookingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'INVALID_INPUT', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const result = await createBooking(ctx.dbUrl, parsed.data, {
    businessName: ctx.tenant?.name,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json(
    { reservationId: result.reservationId, endsAt: result.endsAt },
    { status: 201 }
  );
}

