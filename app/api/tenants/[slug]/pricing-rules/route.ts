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

const SETTING_KEY = 'pricing_rules';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const tenant = await getAuthenticatedTenant(slug);
  if (!tenant) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const db = getTenantClient(tenant.dbUrl);
  const setting = await db.setting.findUnique({ where: { key: SETTING_KEY } });

  const rules = setting?.value || {
    weekendMultiplier: 1.0,
    customSeasons: [],
  };

  return NextResponse.json({ rules });
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
    const db = getTenantClient(tenant.dbUrl);

    const updatedSetting = await db.setting.upsert({
      where: { key: SETTING_KEY },
      update: { value: body },
      create: { key: SETTING_KEY, value: body },
    });

    return NextResponse.json({ ok: true, rules: updatedSetting.value });
  } catch (error) {
    console.error('Error al guardar tarifas:', error);
    return NextResponse.json({ error: 'Error al guardar configuración de tarifas' }, { status: 500 });
  }
}
