import { getCurrencySymbol, getCurrencyCode } from "@api/store-settings.js";

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
const UTC_SUFFIX_REGEX = /(?:[zZ]|[+-]\d{2}:\d{2})$/;

/**
 * Format a number as currency using store settings.
 * Always includes thousand separators for consistency.
 * @param amount - The numeric amount to format
 * @param currencyCode - Optional currency code (e.g., "USD", "GBP"). Falls back to store settings.
 * @param currencySymbol - Optional currency symbol. Only used if currencyCode fails.
 * @returns Formatted currency string with symbol and thousand separators
 */
export function formatCurrency(amount: number, currencyCode?: string, currencySymbol?: string): string {
  const code = currencyCode ?? getCurrencyCode();

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback if currency code is invalid - still use thousand separators
    const symbol = currencySymbol ?? getCurrencySymbol();
    const formattedNumber = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${symbol}${formattedNumber}`;
  }
}

/**
 * Format a number with thousand separators (no currency).
 * @param value - The numeric value to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string with thousand separators
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a date string in a human-readable relative format.
 * Shows "Today", "Yesterday", weekday names for recent dates, or full date for older dates.
 * @param dateString - ISO date string to format
 * @returns Human-readable date string
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const useUtc = UTC_SUFFIX_REGEX.test(dateString);
  const now = new Date();
  const diffDays = useUtc
    ? Math.round(
        (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
          Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) /
          MILLISECONDS_IN_DAY
      )
    : Math.round(
        (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
          new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) /
          MILLISECONDS_IN_DAY
      );

  if (diffDays === 0) {
    return `Today at ${formatTime(date, useUtc ? "UTC" : undefined)}`;
  } else if (diffDays === 1) {
    return `Yesterday at ${formatTime(date, useUtc ? "UTC" : undefined)}`;
  } else if (diffDays < 7) {
    return `${date.toLocaleDateString("en-US", { weekday: "long", timeZone: useUtc ? "UTC" : undefined })} at ${formatTime(date, useUtc ? "UTC" : undefined)}`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: useUtc ? "UTC" : undefined,
    });
  }
}

/**
 * Format a date string with full date and time.
 * @param dateString - ISO date string to format
 * @returns Formatted date string like "1 January 2024 at 10:30 AM"
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return (
    date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }) +
    " at " +
    formatTime(date)
  );
}

/**
 * Format a date string as short date (e.g., "Jan 1, 2024").
 * @param dateString - ISO date string to format
 * @returns Formatted short date string
 */
export function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a date string as a localized date (e.g., "1/15/2024").
 * @param dateString - ISO date string to format
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

/**
 * Format a Date object to time string (e.g., "10:30 AM").
 * @param date - Date object to format
 * @returns Formatted time string
 */
function formatTime(date: Date, timeZone?: string): string {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone });
}

/**
 * Format a number as a percentage with sign prefix.
 * @param value - The percentage value
 * @returns Formatted percentage string with + or - prefix
 */
export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value}%`;
}

/**
 * Format item count with pluralization.
 * @param count - Number of items
 * @returns Formatted string like "1 item" or "5 items"
 */
export function formatItemCount(count: number): string {
  return `${count} item${count !== 1 ? "s" : ""}`;
}

