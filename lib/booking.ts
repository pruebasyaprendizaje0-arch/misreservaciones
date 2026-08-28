import { getTenantClient } from './db/tenant';
import { Prisma, type ReservationStatus, type Industry } from '@prisma/tenant';
import { addMinutes } from 'date-fns';
import { z } from 'zod';
import { sendWhatsAppNotification, buildBookingConfirmationMessage } from './twilio';
import { getPricingRules, calculateReservationPrice } from './pricing';
import { isCentralApiEnabled, createCentralReservation, updateCentralReservationStatus } from './central-api';

export const createBookingSchema = z.object({
  serviceId: z.string().min(1),
  staffId: z.string().optional(),
  resourceId: z.string().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  customer: z.object({
    name: z.string().min(2).max(120),
    email: z.string().email().optional().nullable().or(z.literal('')),
    phone: z.string().min(5).max(40).optional().nullable().or(z.literal('')),
    notes: z.string().max(2000).optional().nullable(),
  }),
  notes: z.string().max(2000).optional().nullable(),
  locale: z.enum(['es', 'en']).default('es'),
  source: z.string().default('web'),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export type CreateBookingResult =
  | { ok: true; reservationId: string; endsAt: Date; startsAt: Date }
  | { ok: false; error: 'SERVICE_NOT_FOUND' | 'SLOT_TAKEN' | 'INVALID_INPUT' };

/**
 * Creates a reservation atomically with a conflict check.
 */
export async function createBooking(
  dbUrl: string | null | undefined,
  input: CreateBookingInput,
  meta?: {
    businessName?: string;
    centralBranchId?: string;
    serviceName?: string;
    resourceName?: string;
    staffName?: string;
  }
): Promise<CreateBookingResult> {
  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const data = parsed.data;

  const defaultDurationMin = 60;
  const endsAt = data.endsAt ? data.endsAt : addMinutes(data.startsAt, defaultDurationMin);

  // 1. Intentar creación en la API Central si hay sucursal central especificada o API activa
  if (meta?.centralBranchId || isCentralApiEnabled()) {
    const branchId = meta?.centralBranchId;
    if (branchId) {
      const centralRes = await createCentralReservation(branchId, {
        customerName: data.customer.name,
        customerEmail: data.customer.email || null,
        customerPhone: data.customer.phone || null,
        serviceName: meta?.serviceName || data.serviceId,
        resourceName: meta?.resourceName || data.resourceId || null,
        staffName: meta?.staffName || data.staffId || null,
        startsAt: data.startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        notes: data.notes || data.customer.notes || null,
      });

      if (centralRes.ok && centralRes.reservation) {
        return {
          ok: true,
          reservationId: centralRes.reservation.id,
          startsAt: new Date(centralRes.reservation.startsAt),
          endsAt: new Date(centralRes.reservation.endsAt),
        };
      } else {
        console.warn('[booking] Falló la creación central:', centralRes.error);
        if (!dbUrl) {
          return { ok: false, error: 'INVALID_INPUT' };
        }
      }
    }
  }

  // 2. Fallback local Prisma tenant
  if (!dbUrl) {
    return { ok: false, error: 'INVALID_INPUT' };
  }

  const db = getTenantClient(dbUrl);
  const service = await db.service.findUnique({ where: { id: data.serviceId } });
  if (!service || !service.active) return { ok: false, error: 'SERVICE_NOT_FOUND' };

  const computedEndsAt = data.endsAt ? data.endsAt : addMinutes(data.startsAt, service.durationMin);
  const status: ReservationStatus = 'CONFIRMED';

  const pricingRules = await getPricingRules(dbUrl);
  const pricingCalculation = calculateReservationPrice({
    basePriceCents: service.priceCents,
    startsAt: data.startsAt,
    endsAt: computedEndsAt,
    industry: service.industry,
    pricingRules,
  });

  const result = (await db.$transaction(async (tx) => {
    const overlapping = await tx.reservation.findFirst({
      where: {
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        startsAt: { lt: computedEndsAt },
        endsAt: { gt: data.startsAt },
        ...(data.staffId ? { staffId: data.staffId } : {}),
        ...(data.resourceId ? { resourceId: data.resourceId } : {}),
      },
      select: { id: true },
    });

    if (overlapping) {
      return { ok: false, error: 'SLOT_TAKEN' as const };
    }

    let customerId: string;
    if (data.customer.email) {
      const existing = await tx.customer.findFirst({
        where: { email: data.customer.email },
        select: { id: true },
      });
      if (existing) {
        customerId = existing.id;
        await tx.customer.update({
          where: { id: customerId },
          data: { name: data.customer.name, phone: data.customer.phone ?? undefined },
        });
      } else {
        const created = await tx.customer.create({
          data: {
            name: data.customer.name,
            email: data.customer.email,
            phone: data.customer.phone,
            notes: data.customer.notes,
            locale: data.locale,
          },
        });
        customerId = created.id;
      }
    } else {
      const created = await tx.customer.create({
        data: {
          name: data.customer.name,
          phone: data.customer.phone,
          notes: data.customer.notes,
          locale: data.locale,
        },
      });
      customerId = created.id;
    }

    const reservation = await tx.reservation.create({
      data: {
        customerId,
        serviceId: data.serviceId,
        staffId: data.staffId,
        resourceId: data.resourceId,
        startsAt: data.startsAt,
        endsAt: computedEndsAt,
        status,
        source: data.source,
        notes: data.notes,
        metadata: {
          pricing: pricingCalculation,
        },
      },
    });

    if (pricingCalculation.totalPriceCents > 0) {
      await tx.payment.create({
        data: {
          reservationId: reservation.id,
          amountCents: pricingCalculation.totalPriceCents,
          currency: service.currency || 'USD',
          status: 'PENDING',
          provider: 'manual',
          metadata: {
            pricingBreakdown: pricingCalculation,
          },
        },
      });
    }

    return { ok: true as const, reservationId: reservation.id, endsAt: computedEndsAt, startsAt: data.startsAt };
  })) as CreateBookingResult;

  if (result.ok && data.customer.phone) {
    const serviceName = service.name;
    const businessName = meta?.businessName ?? 'Tu negocio';
    const message = buildBookingConfirmationMessage({
      businessName,
      customerName: data.customer.name,
      serviceName,
      startsAt: result.startsAt,
      endsAt: result.endsAt,
      locale: data.locale,
      notes: data.notes,
    });
    sendWhatsAppNotification(data.customer.phone, message).catch((err) =>
      console.error('[booking] WhatsApp notification error', err)
    );
  }

  return result;
}

export async function cancelBooking(dbUrl: string | null | undefined, reservationId: string, token?: string): Promise<boolean> {
  if (token && isCentralApiEnabled()) {
    const res = await updateCentralReservationStatus(reservationId, 'CANCELLED', token);
    if (res.ok) return true;
  }

  if (!dbUrl) return false;
  const db = getTenantClient(dbUrl);
  try {
    await db.reservation.update({
      where: { id: reservationId },
      data: { status: 'CANCELLED' },
    });
    return true;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return false;
    }
    throw e;
  }
}

export type IndustryService = Industry;

