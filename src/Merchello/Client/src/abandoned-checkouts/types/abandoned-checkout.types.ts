// Abandoned checkout types

import type { AddressDto } from "@shared/types/address.types.js";

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

export interface AbandonedCheckoutLineItemDto {
  id: string;
  productId: string | null;
  sku: string | null;
  name: string | null;
  productRootName: string;
  selectedOptions: { optionName: string; valueName: string }[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  formattedUnitPrice: string;
  formattedLineTotal: string;
  imageUrl: string | null;
}

export interface AbandonedCheckoutDetailDto {
  id: string;
  basketId: string | null;
  customerId: string | null;
  customerEmail: string | null;
  customerName: string | null;
  status: AbandonedCheckoutStatus;
  statusDisplay: string;
  statusCssClass: string;
  dateCreated: string;
  lastActivityUtc: string;
  dateAbandoned: string | null;
  dateRecovered: string | null;
  dateConverted: string | null;
  dateExpired: string | null;
  recoveredInvoiceId: string | null;
  recoveryLink: string | null;
  recoveryTokenExpiresUtc: string | null;
  recoveryEmailsSent: number;
  lastRecoveryEmailSentUtc: string | null;
  basketTotal: number;
  formattedTotal: string;
  itemCount: number;
  currencyCode: string | null;
  currencySymbol: string | null;
  billingAddress: AddressDto | null;
  shippingAddress: AddressDto | null;
  lineItems: AbandonedCheckoutLineItemDto[];
}

export interface AbandonedCheckoutDetailModalData {
  checkoutId: string;
}

export interface AbandonedCheckoutDetailModalValue {
  resent?: boolean;
}

export interface RegenerateRecoveryLinkResultDto {
  recoveryLink: string;
}

export interface ResendRecoveryEmailResultDto {
  success: boolean;
  message: string;
}
