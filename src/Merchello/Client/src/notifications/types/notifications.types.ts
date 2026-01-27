/**
 * Result of notification discovery containing all notifications grouped by domain.
 */
export interface NotificationDiscoveryResultDto {
  /** Notifications grouped by domain (Order, Payment, etc.). */
  domains: NotificationDomainGroupDto[];
  /** Total number of notification types discovered. */
  totalNotifications: number;
  /** Total number of handler registrations across all notifications. */
  totalHandlers: number;
}

/**
 * A group of notifications belonging to the same domain (e.g., Order, Payment).
 */
export interface NotificationDomainGroupDto {
  /** The domain name (e.g., "Order", "Payment", "Checkout"). */
  domain: string;
  /** The notifications in this domain. */
  notifications: NotificationInfoDto[];
  /** Total number of notifications in this domain. */
  notificationCount: number;
  /** Total number of handler registrations across all notifications in this domain. */
  handlerCount: number;
}

/**
 * Information about a notification type and its registered handlers.
 */
export interface NotificationInfoDto {
  /** The notification class name (e.g., "OrderCreatedNotification"). */
  typeName: string;
  /** The full type name including namespace. */
  fullTypeName: string;
  /** The domain/category this notification belongs to (e.g., "Order", "Payment"). */
  domain: string;
  /** Whether this notification can be cancelled by handlers. */
  isCancelable: boolean;
  /** The registered handlers for this notification, sorted by execution order. */
  handlers: NotificationHandlerInfoDto[];
  /** Whether any handlers are registered for this notification. */
  hasHandlers: boolean;
}

/**
 * Information about a notification handler including its priority and execution order.
 */
export interface NotificationHandlerInfoDto {
  /** The handler class name (e.g., "EmailNotificationHandler"). */
  typeName: string;
  /** The full type name including namespace. */
  fullTypeName: string;
  /** The assembly containing this handler, if external. */
  assemblyName: string | null;
  /** The handler priority from NotificationHandlerPriorityAttribute (default: 1000). Lower values execute first. */
  priority: number;
  /** Human-readable priority category (Validation, Early, Default, Processing, Business Logic, External Sync). */
  priorityCategory: string;
  /** The 1-based execution order within the notification's handler chain. */
  executionOrder: number;
  /** Whether another handler for the same notification shares this priority value. */
  hasDuplicatePriority: boolean;
}

/**
 * Priority category colors for visual styling.
 */
export type PriorityCategory =
  | "Validation"
  | "Early Processing"
  | "Default"
  | "Core Processing"
  | "Business Rules"
  | "Late / External";

/**
 * Helper function to get the CSS class for a priority category.
 */
export function getPriorityCategoryClass(category: string): string {
  switch (category) {
    case "Validation":
      return "priority-validation";
    case "Early Processing":
      return "priority-early";
    case "Default":
      return "priority-default";
    case "Core Processing":
      return "priority-processing";
    case "Business Rules":
      return "priority-business";
    case "Late / External":
      return "priority-external";
    default:
      return "priority-default";
  }
}

/**
 * Priority legend items for the UI.
 */
export const PRIORITY_LEGEND = [
  { category: "Validation", range: "<500", description: "Pre-checks and validation before processing" },
  { category: "Early Processing", range: "500-999", description: "Runs before default handlers" },
  { category: "Default", range: "1000", description: "Standard priority for most handlers" },
  { category: "Core Processing", range: "1001-1499", description: "Main business processing after defaults" },
  { category: "Business Rules", range: "1500-1999", description: "Domain rules, fulfilment, digital delivery" },
  { category: "Late / External", range: "2000+", description: "Emails, webhooks, external system sync" },
] as const;
