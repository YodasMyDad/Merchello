// Outstanding types - imports shared order types
import type { OrderListItemDto } from "@orders/types/order.types.js";

// Outstanding invoices query parameters
export interface OutstandingInvoicesQueryParams {
  page?: number;
  pageSize?: number;
  accountCustomersOnly?: boolean;
  overdueOnly?: boolean;
  /** Filter invoices due within this many days from now */
  dueWithinDays?: number;
  /** Search by invoice number, customer name, or customer email */
  search?: string;
  sortBy?: "dueDate" | "amount" | "customer" | "invoiceNumber";
  sortDir?: "asc" | "desc";
}

// Outstanding balance summary for a customer
export interface OutstandingBalanceDto {
  totalOutstanding: number;
  totalOverdue: number;
  invoiceCount: number;
  overdueCount: number;
  nextDueDate: string | null;
  currencyCode: string;
  creditLimit: number | null;
  creditLimitExceeded: boolean;
  availableCredit: number | null;
  creditUtilizationPercent: number | null;
  creditWarningLevel: "ok" | "warning" | "exceeded";
}

// Paginated outstanding invoices result
export interface OutstandingInvoicesPageDto {
  items: OrderListItemDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

// Batch mark as paid request
export interface BatchMarkAsPaidDto {
  invoiceIds: string[];
  paymentMethod: string;
  reference?: string | null;
  dateReceived?: string | null;
}

// Batch mark as paid result
export interface BatchMarkAsPaidResultDto {
  successCount: number;
  messages: string[];
  paymentIds: string[];
}

export interface PaymentCreatedDto {
  paymentId: string;
  invoiceId: string;
  amount: number;
}
