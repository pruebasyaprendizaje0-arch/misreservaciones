import { getTenantClient } from './db/tenant';
import type { Industry } from '@prisma/tenant';
import { addMinutes, isSameDay, startOfDay, endOfDay } from 'date-fns';

export type SlotInput = {
  dbUrl: string;
  serviceId: string;
  staffId?: string;
  resourceId?: string;
  date: Date; // Check-in date
  checkOutDate?: Date; // Check-out date
  timezone?: string; // IANA timezone, default APP_TIMEZONE
};

export type Slot = {
  startsAt: Date;
  endsAt: Date;
  staffId?: string;
  resourceId?: string;
  available: boolean;
};

/**
 * Computes bookable slots for a service on a given day.
 */
export async function computeSlots(input: SlotInput): Promise<Slot[]> {
  const db = getTenantClient(input.dbUrl);
  const service = await db.service.findUnique({ where: { id: input.serviceId } });
  if (!service || !service.active) return [];

  const dayStart = startOfDay(input.date);
  const dayEnd = endOfDay(input.date);

  if (service.industry === 'HOSTAL') {
    return computeHostalSlots(db, input, service.durationMin);
  }

  // Standard time-slot computation
  const rules = await db.availabilityRule.findMany({
    where: {
      active: true,
      ...(input.staffId ? { staffId: input.staffId } : { staffId: null }),
    },
  });

  const weekday = input.date.getDay();
  const windows = rules.filter((r) => r.weekday === weekday);
  if (windows.length === 0) return [];

  const exceptions = await db.availabilityException.findMany({
    where: {
      date: {
        gte: dayStart,
        lte: dayEnd,
      },
      ...(input.staffId ? { staffId: input.staffId } : { staffId: null }),
    },
  });

  const reservations = await db.reservation.findMany({
    where: {
      status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
      startsAt: { lt: dayEnd },
      endsAt: { gt: dayStart },
      ...(input.staffId ? { staffId: input.staffId } : {}),
      ...(input.resourceId ? { resourceId: input.resourceId } : {}),
    },
    select: { startsAt: true, endsAt: true, staffId: true, resourceId: true },
  });

  const bufferMin = service.industry === 'MEDICO' ? 5 : 0;
  const stepMin = service.durationMin;
  const slots: Slot[] = [];

  for (const window of windows) {
    let cursor = new Date(dayStart);
    cursor.setHours(0, 0, 0, 0);
    cursor = addMinutes(cursor, window.startMin);

    const windowEnd = new Date(dayStart);
    windowEnd.setHours(0, 0, 0, 0);
    windowEnd.setMinutes(windowEnd.getMinutes() + window.endMin);

    while (addMinutes(cursor, stepMin) <= windowEnd) {
      const slotStart = cursor;
      const slotEnd = addMinutes(cursor, stepMin);

      // Skip slots inside exception blocks
      const blocked = exceptions.some((ex) => {
        if (!ex.blocked) return false;
        if (!ex.startMin || !ex.endMin) {
          return isSameDay(ex.date, input.date);
        }
        const exStart = new Date(dayStart);
        exStart.setMinutes(ex.startMin);
        const exEnd = new Date(dayStart);
        exEnd.setMinutes(ex.endMin);
        return slotStart < exEnd && slotEnd > exStart;
      });

      if (!blocked && slotStart > new Date()) {
        const conflict = reservations.some((r) => {
          if (input.staffId && r.staffId && r.staffId !== input.staffId) return false;
          if (input.resourceId && r.resourceId && r.resourceId !== input.resourceId) return false;
          return slotStart < r.endsAt && slotEnd > r.startsAt;
        });

        slots.push({
          startsAt: slotStart,
          endsAt: addMinutes(slotEnd, bufferMin),
          staffId: input.staffId,
          resourceId: input.resourceId,
          available: !conflict,
        });
      }

      cursor = addMinutes(cursor, stepMin);
    }
  }

  return slots;
}

async function computeHostalSlots(
  db: ReturnType<typeof getTenantClient>,
  input: SlotInput,
  _durationMin: number
): Promise<Slot[]> {
  const checkIn = startOfDay(input.date);
  checkIn.setHours(12, 0, 0, 0);

  let checkOut = input.checkOutDate ? startOfDay(input.checkOutDate) : new Date(checkIn.getTime() + 24 * 60 * 60 * 1000);
  checkOut.setHours(12, 0, 0, 0);

  if (checkOut <= checkIn) {
    checkOut = new Date(checkIn.getTime() + 24 * 60 * 60 * 1000);
    checkOut.setHours(12, 0, 0, 0);
  }

  const rooms = await db.resource.findMany({
    where: { type: 'HABITACION', active: true, ...(input.resourceId ? { id: input.resourceId } : {}) },
  });

  const reservations = await db.reservation.findMany({
    where: {
      resourceId: { in: rooms.map((r) => r.id) },
      status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
      startsAt: { lt: checkOut },
      endsAt: { gt: checkIn },
    },
    select: { resourceId: true, startsAt: true, endsAt: true },
  });

  return rooms.map((room) => {
    const occupied = reservations.some(
      (r) => r.resourceId === room.id && checkIn < r.endsAt && checkOut > r.startsAt
    );
    return {
      startsAt: checkIn,
      endsAt: checkOut,
      resourceId: room.id,
      available: !occupied,
    };
  });
}

