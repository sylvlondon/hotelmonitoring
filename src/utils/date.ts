import { DateTime } from 'luxon';

export function buildTargetDates(lookahead: number, timezone: string): string[] {
  const base = DateTime.now().setZone(timezone).startOf('day');
  return Array.from({ length: lookahead }, (_, i) =>
    base.plus({ days: i }).toISODate() as string,
  );
}

export function formatRunTsLocal(isoUtc: string, timezone: string): string {
  return DateTime.fromISO(isoUtc, { zone: 'utc' })
    .setZone(timezone)
    .toISO({ suppressMilliseconds: true }) as string;
}

export function addOneNight(targetDate: string, timezone: string): string {
  return DateTime.fromISO(targetDate, { zone: timezone })
    .plus({ days: 1 })
    .toISODate() as string;
}

export function toFrenchDate(isoDate: string, timezone: string): string {
  return DateTime.fromISO(isoDate, { zone: timezone }).toFormat('dd/MM/yyyy');
}
