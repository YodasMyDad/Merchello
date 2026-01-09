// Abandoned checkout types

export type AbandonedCheckoutStatus = "Active" | "Abandoned" | "Recovered" | "Converted" | "Expired";

export interface AbandonedCheckoutListItemDto {
  id: string;
  customerEmail: string | null;
  customerName: string | null;
  basketTotal: number;
  formattedTotal: string;
  itemCount: number;
  status: AbandonedCheckoutStatus;
  statusDisplay: string;
  statusCssClass: string;
  lastActivityUtc: string;
  dateAbandoned: string | null;
  recoveryEmailsSent: number;
  currencyCode: string | null;
}

export interface AbandonedCheckoutPageDto {
  items: AbandonedCheckoutListItemDto[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface AbandonedCheckoutStatsDto {
  totalAbandoned: number;
  totalRecovered: number;
  totalConverted: number;
  recoveryRate: number;
  conversionRate: number;
  totalValueAbandoned: number;
  totalValueRecovered: number;
  formattedValueAbandoned: string;
  formattedValueRecovered: string;
  currencyCode?: string | null;
  currencySymbol?: string | null;
}

export interface AbandonedCheckoutQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AbandonedCheckoutStatus;
  fromDate?: string;
  toDate?: string;
  orderBy?: "DateAbandoned" | "LastActivity" | "Total" | "Email";
  descending?: boolean;
}

export interface RegenerateRecoveryLinkResultDto {
  recoveryLink: string;
}

export interface ResendRecoveryEmailResultDto {
  success: boolean;
  message: string;
}
