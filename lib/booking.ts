import { getTenantClient } from './db/tenant';
import { Prisma, type ReservationStatus, type Industry } from '@prisma/tenant';
import { addMinutes } from 'date-fns';
import { z } from 'zod';
import { sendWhatsAppNotification, buildBookingConfirmationMessage } from './twilio';

export const createBookingSchema = z.object({
  serviceId: z.string().min(1),
  staffId: z.string().optional(),
  resourceId: z.string().optional(),
  startsAt: z.coerce.date(),
  customer: z.object({
    name: z.string().min(2).max(120),
    email: z.string().email().optional(),
    phone: z.string().min(5).max(40).optional(),
    notes: z.string().max(2000).optional(),
  }),
  notes: z.string().max(2000).optional(),
  locale: z.enum(['es', 'en']).default('es'),
  source: z.string().default('web'),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export type CreateBookingResult =
  | { ok: true; reservationId: string; endsAt: Date; startsAt: Date }
  | { ok: false; error: 'SERVICE_NOT_FOUND' | 'SLOT_TAKEN' | 'INVALID_INPUT' };

/**
 * Creates a reservation atomically with a conflict check.
 * Uses a transaction + a server-side overlap query guarded by status filter
 * to prevent double-booking the same staff/resource.
 *
 * For HOSTAL, the full stay range is checked against overlapping reservations
 * on the same room.
 */
export async function createBooking(
  dbUrl: string,
  input: CreateBookingInput,
  meta?: { businessName?: string }
): Promise<CreateBookingResult> {
  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const data = parsed.data;

  const db = getTenantClient(dbUrl);
  const service = await db.service.findUnique({ where: { id: data.serviceId } });
  if (!service || !service.active) return { ok: false, error: 'SERVICE_NOT_FOUND' };

  const endsAt = addMinutes(data.startsAt, service.durationMin);
  const status: ReservationStatus = 'CONFIRMED';

  const result = (await db.$transaction(async (tx) => {
    const overlapping = await tx.reservation.findFirst({
      where: {
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        startsAt: { lt: endsAt },
        endsAt: { gt: data.startsAt },
        ...(data.staffId ? { staffId: data.staffId } : {}),
        ...(data.resourceId ? { resourceId: data.resourceId } : {}),
      },
      select: { id: true },
    });

    if (overlapping) {
      return { ok: false, error: 'SLOT_TAKEN' as const };
    }

    // Find or create customer by email (if provided)
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
        endsAt,
        status,
        source: data.source,
        notes: data.notes,
      },
    });

    return { ok: true as const, reservationId: reservation.id, endsAt, startsAt: data.startsAt };
  })) as CreateBookingResult;

  // Fire-and-forget: send WhatsApp confirmation if customer has phone
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
    // Do not await — run in background without blocking the HTTP response
    sendWhatsAppNotification(data.customer.phone, message).catch((err) =>
      console.error('[booking] WhatsApp notification error', err)
    );
  }

  return result;
}


export async function cancelBooking(dbUrl: string, reservationId: string): Promise<boolean> {
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
