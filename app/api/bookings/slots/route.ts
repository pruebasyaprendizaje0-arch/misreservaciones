import { NextResponse, type NextRequest } from 'next/server';
import { getTenantContext } from '@/lib/tenant-context';
import { computeSlots } from '@/lib/availability';
import { getTenantClient } from '@/lib/db/tenant';

function parseLocalDate(dateStr: string): Date {
  if (dateStr.includes('T')) return new Date(dateStr);
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

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
  const date = parseLocalDate(dateStr);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: 'INVALID_DATE' }, { status: 400 });
  }

  const checkOutStr = searchParams.get('checkOutDate') || searchParams.get('checkOut');
  const checkOutDate = checkOutStr ? parseLocalDate(checkOutStr) : undefined;

  const slots = await computeSlots({
    dbUrl: ctx.dbUrl,
    serviceId,
    staffId,
    resourceId,
    date,
    checkOutDate,
  });

  let scheduleSuggestion = null;
  const hasAvailable = slots.some((s) => s.available);
  if (!hasAvailable) {
    const { computeScheduleSuggestion } = await import('@/lib/availability');
    scheduleSuggestion = await computeScheduleSuggestion({
      dbUrl: ctx.dbUrl,
      serviceId,
      staffId,
      resourceId,
      date,
      checkOutDate,
    });
  }

  return NextResponse.json({ slots, scheduleSuggestion });
}
