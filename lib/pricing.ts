import { getTenantClient } from './db/tenant';
import { isNightlyIndustry } from './industries';

export type CustomSeason = {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  priceMultiplier: number; // 1.2 = +20%
  fixedPriceUSD?: number | null;
  active?: boolean; // default true if undefined
};

export type PricingRules = {
  weekendMultiplier: number; // 1.0 = normal, 1.2 = +20%
  customSeasons: CustomSeason[];
};

export type AppliedRule = {
  name: string;
  type: 'SEASON' | 'WEEKEND';
  multiplier: number;
  fixedPriceUSD?: number | null;
};

export type NightlyBreakdown = {
  date: string; // YYYY-MM-DD
  basePriceCents: number;
  finalPriceCents: number;
  isWeekend: boolean;
  appliedRules: AppliedRule[];
};

export type CalculatePriceParams = {
  basePriceCents: number;
  startsAt: Date | string;
  endsAt?: Date | string;
  industry?: string;
  pricingRules?: PricingRules | null;
};

export type CalculatedPriceResult = {
  basePriceCents: number;
  totalPriceCents: number;
  effectiveMultiplier: number;
  stayNights: number;
  isWeekendApplied: boolean;
  activeSeasonsApplied: AppliedRule[];
  nightlyBreakdown?: NightlyBreakdown[];
};

const SETTING_KEY = 'pricing_rules';

/**
 * Fetches tenant pricing rules from the tenant DB Setting table.
 */
export async function getPricingRules(dbUrl: string): Promise<PricingRules> {
  try {
    const db = getTenantClient(dbUrl);
    const setting = await db.setting.findUnique({ where: { key: SETTING_KEY } });
    if (!setting || !setting.value) {
      return { weekendMultiplier: 1.0, customSeasons: [] };
    }
    const val = setting.value as any;
    return {
      weekendMultiplier: typeof val.weekendMultiplier === 'number' ? val.weekendMultiplier : 1.0,
      customSeasons: Array.isArray(val.customSeasons) ? val.customSeasons : [],
    };
  } catch (error) {
    console.error('Error al obtener pricing_rules:', error);
    return { weekendMultiplier: 1.0, customSeasons: [] };
  }
}

/**
 * Normalizes input date/string to Date object at local 12:00:00 (noon).
 */
export function parseDateToLocalNoon(input: Date | string): Date {
  if (input instanceof Date) {
    const d = new Date(input.getTime());
    d.setHours(12, 0, 0, 0);
    return d;
  }
  const str = String(input).trim();
  if (str.includes('T')) {
    const d = new Date(str);
    d.setHours(12, 0, 0, 0);
    return d;
  }
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

/**
 * Helper to format a Date into YYYY-MM-DD.
 */
export function formatDateToYYYYMMDD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if a date falls on a weekend (Friday, Saturday, or Sunday).
 */
export function isWeekendDay(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 5 || day === 6; // 0=Sun, 5=Fri, 6=Sat
}

/**
 * Calculates final reservation price taking into account:
 * - Base price (per night for lodging/HOSTAL, or per appointment for others)
 * - Weekend multiplier (Friday, Saturday, Sunday)
 * - Active custom seasons matching the reservation date(s)
 */
export function calculateReservationPrice({
  basePriceCents,
  startsAt,
  endsAt,
  industry,
  pricingRules,
}: CalculatePriceParams): CalculatedPriceResult {
  const rules = pricingRules || { weekendMultiplier: 1.0, customSeasons: [] };
  const weekendMult = rules.weekendMultiplier > 0 ? rules.weekendMultiplier : 1.0;
  const activeSeasons = (rules.customSeasons || []).filter((s) => s.active !== false);

  const isNightly = isNightlyIndustry(industry);

  if (isNightly) {
    const startDate = parseDateToLocalNoon(startsAt);
    let endDate: Date;
    if (endsAt) {
      endDate = parseDateToLocalNoon(endsAt);
      if (endDate <= startDate) {
        endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
      }
    } else {
      endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    }

    // Calculate number of nights
    const diffMs = endDate.getTime() - startDate.getTime();
    const stayNights = Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)));

    let totalPriceCents = 0;
    const nightlyBreakdown: NightlyBreakdown[] = [];
    const allAppliedRulesMap = new Map<string, AppliedRule>();
    let anyWeekend = false;

    // Loop through each night
    for (let i = 0; i < stayNights; i++) {
      const currentNightDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = formatDateToYYYYMMDD(currentNightDate);
      const weekend = isWeekendDay(currentNightDate);
      if (weekend) anyWeekend = true;

      const appliedRules: AppliedRule[] = [];
      let nightBaseCents = basePriceCents;
      let seasonMult = 1.0;

      // Find matching seasons for this date
      for (const season of activeSeasons) {
        if (dateStr >= season.startDate && dateStr <= season.endDate) {
          if (season.fixedPriceUSD && season.fixedPriceUSD > 0) {
            nightBaseCents = Math.round(season.fixedPriceUSD * 100);
          }
          if (season.priceMultiplier && season.priceMultiplier > 1.0) {
            seasonMult *= season.priceMultiplier;
          }
          const ruleObj: AppliedRule = {
            name: season.name,
            type: 'SEASON',
            multiplier: season.priceMultiplier || 1.0,
            fixedPriceUSD: season.fixedPriceUSD,
          };
          appliedRules.push(ruleObj);
          allAppliedRulesMap.set(season.id || season.name, ruleObj);
        }
      }

      // Weekend rule
      let weekendMultToApply = 1.0;
      if (weekend && weekendMult > 1.0) {
        weekendMultToApply = weekendMult;
        const wkndRule: AppliedRule = {
          name: 'Fin de Semana (Viernes-Domingo)',
          type: 'WEEKEND',
          multiplier: weekendMult,
        };
        appliedRules.push(wkndRule);
        allAppliedRulesMap.set('WEEKEND', wkndRule);
      }

      const combinedMultiplier = seasonMult * weekendMultToApply;
      const finalNightCents = Math.round(nightBaseCents * combinedMultiplier);
      totalPriceCents += finalNightCents;

      nightlyBreakdown.push({
        date: dateStr,
        basePriceCents: nightBaseCents,
        finalPriceCents: finalNightCents,
        isWeekend: weekend,
        appliedRules,
      });
    }

    const effectiveMultiplier =
      basePriceCents * stayNights > 0
        ? totalPriceCents / (basePriceCents * stayNights)
        : 1.0;

    return {
      basePriceCents,
      totalPriceCents,
      effectiveMultiplier,
      stayNights,
      isWeekendApplied: anyWeekend && weekendMult > 1.0,
      activeSeasonsApplied: Array.from(allAppliedRulesMap.values()),
      nightlyBreakdown,
    };
  } else {
    // Single appointment service (MASAJE, PELUQUERIA, MEDICO, etc.)
    const startDate = typeof startsAt === 'string' ? parseDateToLocalNoon(startsAt) : startsAt;
    const dateStr = formatDateToYYYYMMDD(startDate);
    const weekend = isWeekendDay(startDate);
    const appliedRules: AppliedRule[] = [];
    let baseCents = basePriceCents;
    let seasonMult = 1.0;

    for (const season of activeSeasons) {
      if (dateStr >= season.startDate && dateStr <= season.endDate) {
        if (season.fixedPriceUSD && season.fixedPriceUSD > 0) {
          baseCents = Math.round(season.fixedPriceUSD * 100);
        }
        if (season.priceMultiplier && season.priceMultiplier > 1.0) {
          seasonMult *= season.priceMultiplier;
        }
        appliedRules.push({
          name: season.name,
          type: 'SEASON',
          multiplier: season.priceMultiplier || 1.0,
          fixedPriceUSD: season.fixedPriceUSD,
        });
      }
    }

    let weekendMultToApply = 1.0;
    if (weekend && weekendMult > 1.0) {
      weekendMultToApply = weekendMult;
      appliedRules.push({
        name: 'Fin de Semana (Viernes-Domingo)',
        type: 'WEEKEND',
        multiplier: weekendMult,
      });
    }

    const effectiveMultiplier = seasonMult * weekendMultToApply;
    const totalPriceCents = Math.round(baseCents * effectiveMultiplier);

    return {
      basePriceCents,
      totalPriceCents,
      effectiveMultiplier,
      stayNights: 1,
      isWeekendApplied: weekend && weekendMult > 1.0,
      activeSeasonsApplied: appliedRules,
    };
  }
}
