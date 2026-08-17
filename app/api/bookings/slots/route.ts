import { NextResponse, type NextRequest } from 'next/server';
import { getTenantContext } from '@/lib/tenant-context';
import { computeSlots } from '@/lib/availability';
import { getTenantClient } from '@/lib/db/tenant';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const tenantParam = searchParams.get('tenant') || undefined;
  const ctx = await getTenantContext(tenantParam);
  if (!ctx.dbUrl) {
    return NextResponse.json({ error: 'TENANT_NOT_FOUND' }, { status: 404 });
  }

  const serviceId = searchParams.get('serviceId');
  const dateStr = searchParams.get('date');
  const staffId = searchParams.get('staffId') ?? undefined;
  const resourceId = searchParams.get('resourceId') ?? undefined;

  if (!serviceId || !dateStr) {
    return NextResponse.json({ error: 'MISSING_PARAMS' }, { status: 400 });
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: 'INVALID_DATE' }, { status: 400 });
  }

  const slots = await computeSlots({
    dbUrl: ctx.dbUrl,
    serviceId,
    staffId,
    resourceId,
    date,
  });

  return NextResponse.json({ slots });
}
