/**
 * Billing Period Utilities
 *
 * Provides consistent billing period calculations across the application.
 * Uses UTC timezone to ensure consistency across all server and client environments.
 */

/**
 * Get the current billing period in YYYY-MM format (UTC)
 *
 * @example
 * // If current UTC date is 2026-01-15
 * getCurrentBillingPeriod() // Returns "2026-01"
 */
export function getCurrentBillingPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Get the billing period for a specific date in YYYY-MM format (UTC)
 *
 * @param date - The date to get the billing period for
 * @returns Billing period in YYYY-MM format
 */
export function getBillingPeriodForDate(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/**
 * Check if a billing period string is valid (YYYY-MM format)
 *
 * @param period - The billing period string to validate
 * @returns true if valid, false otherwise
 */
export function isValidBillingPeriod(period: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return false;
  }

  const [year, month] = period.split('-').map(Number);
  return year >= 2020 && year <= 2100 && month >= 1 && month <= 12;
}

/**
 * Get the start date of a billing period (first day of month, UTC midnight)
 *
 * @param period - Billing period in YYYY-MM format
 * @returns Date object representing start of billing period
 */
export function getBillingPeriodStart(period: string): Date {
  if (!isValidBillingPeriod(period)) {
    throw new Error(`Invalid billing period: ${period}`);
  }
  return new Date(`${period}-01T00:00:00.000Z`);
}

/**
 * Get the end date of a billing period (last millisecond of last day, UTC)
 *
 * @param period - Billing period in YYYY-MM format
 * @returns Date object representing end of billing period
 */
export function getBillingPeriodEnd(period: string): Date {
  if (!isValidBillingPeriod(period)) {
    throw new Error(`Invalid billing period: ${period}`);
  }

  const [year, month] = period.split('-').map(Number);
  // Get last day by going to next month and subtracting 1 millisecond
  const nextMonth = new Date(Date.UTC(year, month, 1));
  return new Date(nextMonth.getTime() - 1);
}

/**
 * Check if a date falls within a billing period
 *
 * @param date - The date to check
 * @param period - Billing period in YYYY-MM format
 * @returns true if date is within the billing period
 */
export function isDateInBillingPeriod(date: Date, period: string): boolean {
  const datePeriod = getBillingPeriodForDate(date);
  return datePeriod === period;
}
