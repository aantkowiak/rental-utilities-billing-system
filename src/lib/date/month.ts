/**
 * Month utilities for converting between YYYY-MM string format and Date objects.
 * All dates are normalized to the first day of the month in UTC.
 */

export type YearMonth = string; // Format: 'YYYY-MM'

/**
 * Convert a Date to YYYY-MM format.
 * @param date - Date object to convert
 * @returns String in YYYY-MM format
 */
export function toYearMonth(date: Date): YearMonth {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Convert YYYY-MM string to Date object (first day of month, UTC).
 * @param ym - String in YYYY-MM format
 * @returns Date object set to first day of the month in UTC
 * @throws Error if format is invalid
 */
export function yearMonthToDate(ym: YearMonth): Date {
  const match = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!match) {
    throw new Error(`Invalid YearMonth format: ${ym}. Expected YYYY-MM.`);
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);

  if (month < 1 || month > 12) {
    throw new Error(`Invalid month in YearMonth: ${ym}. Month must be 01-12.`);
  }

  return new Date(Date.UTC(year, month - 1, 1));
}

/**
 * Convert YYYY-MM string to ISO date string (YYYY-MM-01) for database storage.
 * @param ym - String in YYYY-MM format
 * @returns ISO date string (YYYY-MM-DD format)
 */
export function yearMonthToISODate(ym: YearMonth): string {
  return yearMonthToDate(ym).toISOString().split("T")[0];
}

/**
 * Convert ISO date string to YYYY-MM format.
 * @param isoDate - ISO date string (YYYY-MM-DD)
 * @returns String in YYYY-MM format
 */
export function isoDateToYearMonth(isoDate: string): YearMonth {
  const match = /^(\d{4})-(\d{2})/.exec(isoDate);
  if (!match) {
    throw new Error(`Invalid ISO date format: ${isoDate}`);
  }
  return `${match[1]}-${match[2]}`;
}

/**
 * Get current month in YYYY-MM format.
 * @returns Current month as YearMonth string
 */
export function getCurrentYearMonth(): YearMonth {
  return toYearMonth(new Date());
}

/**
 * Add months to a YearMonth string.
 * @param ym - Base month in YYYY-MM format
 * @param months - Number of months to add (can be negative)
 * @returns New YearMonth string
 */
export function addMonths(ym: YearMonth, months: number): YearMonth {
  const date = yearMonthToDate(ym);
  date.setUTCMonth(date.getUTCMonth() + months);
  return toYearMonth(date);
}

/**
 * Compare two YearMonth strings.
 * @param a - First month
 * @param b - Second month
 * @returns Negative if a < b, 0 if equal, positive if a > b
 */
export function compareYearMonths(a: YearMonth, b: YearMonth): number {
  return a.localeCompare(b);
}

/**
 * Check if a YearMonth string is valid.
 * @param ym - String to validate
 * @returns true if valid YYYY-MM format with valid month
 */
export function isValidYearMonth(ym: string): ym is YearMonth {
  const match = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!match) return false;

  const month = parseInt(match[2], 10);
  return month >= 1 && month <= 12;
}

export interface AllowedMonth {
  token: YearMonth;
  label: string;
  date: Date;
}

export function formatYearMonthLabel(ym: YearMonth): string {
  const date = yearMonthToDate(ym);
  const formatter = new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return formatter.format(date);
}

export function getAllowedMonths(monthsBack = 6, now = new Date()): AllowedMonth[] {
  if (!Number.isInteger(monthsBack) || monthsBack < 0) {
    throw new Error("monthsBack must be a non-negative integer");
  }

  if (!(now instanceof Date) || Number.isNaN(now.valueOf())) {
    throw new Error("now must be a valid Date instance");
  }

  const allowedMonths: AllowedMonth[] = [];
  const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  for (let i = 0; i <= monthsBack; i += 1) {
    const date = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - i, 1));
    const token = toYearMonth(date);
    allowedMonths.push({
      token,
      label: formatYearMonthLabel(token),
      date,
    });
  }

  return allowedMonths;
}
