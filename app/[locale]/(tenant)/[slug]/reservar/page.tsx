import { notFound } from 'next/navigation';
import { getTenantContext } from '@/lib/tenant-context';
import { getTenantClient } from '@/lib/db/tenant';
import { BookingFlow } from '@/components/booking/booking-flow';
import { getPricingRules } from '@/lib/pricing';

export default async function ReservarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getTenantContext(slug);
  if (!ctx.tenant) notFound();

  const industry = (ctx.tenant.industry as any) || 'RESTAURANTE';
  let services: any[] = [];
  let staff: any[] = [];
  let resources: any[] = [];
  let pricingRules: any = { rules: [] };

  if (ctx.dbUrl) {
    try {
      const db = getTenantClient(ctx.dbUrl);
      const [sList, stList, rList, pRules] = await Promise.all([
        db.service.findMany({
          where: { active: true },
          orderBy: { name: 'asc' },
        }),
        db.staff.findMany({
          where: { active: true },
          orderBy: { name: 'asc' },
          include: { services: { include: { service: true } } },
        }),
        industry === 'HOSTAL' || industry === 'MASAJE'
          ? db.resource.findMany({ where: { active: true }, orderBy: { name: 'asc' } })
          : Promise.resolve([]),
        getPricingRules(ctx.dbUrl),
      ]);
      services = sList;
      staff = stList;
      resources = rList;
      pricingRules = pRules;
    } catch (e) {
      console.warn('[ReservarPage] Warning: Error fetching DB data:', e);
    }
  }

  if (services.length === 0) {
    services = [
      {
        id: 'serv-general',
        name: 'Reservación de Mesa / Servicio',
        description: 'Reserva tu atención directa.',
        durationMin: 60,
        priceCents: 0,
        currency: 'USD',
      },
    ];
  }


  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <BookingFlow
        tenantSlug={slug}
        tenantName={ctx.tenant.name}
        businessPhone={ctx.tenant.phone || undefined}
        paymentDetails={(ctx.tenant.metadata as any)?.paymentDetails}
        pricingRules={pricingRules}
        industry={industry}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          durationMin: s.durationMin,
          priceCents: s.priceCents,
          currency: s.currency,
        }))}
        staff={staff.map((s) => ({
          id: s.id,
          name: s.name,
          role: s.role,
          email: s.email,
          phone: s.phone,
          serviceIds: (s.services || []).map((ss: any) => ss.serviceId),

        }))}
        resources={resources.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          capacity: r.capacity,
        }))}
      />
    </div>
  );
}
