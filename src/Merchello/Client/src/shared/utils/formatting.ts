import { getCurrencySymbol } from "@api/store-settings.js";
import { InvoicePaymentStatus } from "@orders/types/order.types.js";

/**
 * Format a number as currency using store settings.
 * @param amount - The numeric amount to format
 * @returns Formatted currency string with symbol
 */
export function formatCurrency(amount: number): string {
  const symbol = getCurrencySymbol();
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Format a date string in a human-readable relative format.
 * Shows "Today", "Yesterday", weekday names for recent dates, or full date for older dates.
 * @param dateString - ISO date string to format
 * @returns Human-readable date string
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Today at ${formatTime(date)}`;
  } else if (diffDays === 1) {
    return `Yesterday at ${formatTime(date)}`;
  } else if (diffDays < 7) {
    return `${date.toLocaleDateString("en-US", { weekday: "long" })} at ${formatTime(date)}`;
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
 * Format a Date object to time string (e.g., "10:30 AM").
 * @param date - Date object to format
 * @returns Formatted time string
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
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
 * Get CSS class name for payment status badge.
 * @param status - The invoice payment status
 * @returns CSS class name to apply to the badge
 */
export function getPaymentStatusBadgeClass(status: InvoicePaymentStatus): string {
  switch (status) {
    case InvoicePaymentStatus.Paid:
      return "paid";
    case InvoicePaymentStatus.PartiallyPaid:
      return "partial";
    case InvoicePaymentStatus.Refunded:
    case InvoicePaymentStatus.PartiallyRefunded:
      return "refunded";
    case InvoicePaymentStatus.AwaitingPayment:
      return "awaiting";
    default:
      return "unpaid";
  }
}

/**
 * Get CSS class name for fulfillment status badge.
 * Normalizes the status string to a valid CSS class name.
 * @param status - The fulfillment status string
 * @returns CSS class name to apply to the badge
 */
export function getFulfillmentStatusBadgeClass(status: string): string {
  return status.toLowerCase().replace(/\s+/g, "-");
}

/**
 * Format item count with pluralization.
 * @param count - Number of items
 * @returns Formatted string like "1 item" or "5 items"
 */
export function formatItemCount(count: number): string {
  return `${count} item${count !== 1 ? "s" : ""}`;
}

