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

  const db = getTenantClient(ctx.dbUrl!);
  const industry = ctx.tenant.industry as 'HOSTAL' | 'MASAJE' | 'PELUQUERIA' | 'MEDICO';

  const [services, staff, resources, pricingRules] = await Promise.all([
    db.service.findMany({
      where: { industry, active: true },
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
    getPricingRules(ctx.dbUrl!),
  ]);

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
          serviceIds: s.services.map((ss) => ss.serviceId),
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
