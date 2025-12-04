// Simple API service - no code generation needed

const API_BASE = '/umbraco/api/v1';

// Configuration that can be set from the entrypoint
let apiConfig = {
  token: undefined as (() => Promise<string | undefined>) | undefined,
  baseUrl: '',
  credentials: 'same-origin' as RequestCredentials,
};

export function setApiConfig(config: {
  token?: () => Promise<string | undefined>;
  baseUrl?: string;
  credentials?: RequestCredentials;
}): void {
  apiConfig = { ...apiConfig, ...config };
}

async function getHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add auth token if available
  if (apiConfig.token) {
    const token = await apiConfig.token();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

async function apiGet<T>(endpoint: string): Promise<{ data?: T; error?: Error }> {
  try {
    const headers = await getHeaders();
    const baseUrl = apiConfig.baseUrl || '';
    const response = await fetch(`${baseUrl}${API_BASE}/${endpoint}`, {
      method: 'GET',
      credentials: apiConfig.credentials,
      headers,
    });

    if (!response.ok) {
      return { error: new Error(`HTTP ${response.status}: ${response.statusText}`) };
    }

    // Handle both JSON and plain text responses
    const contentType = response.headers.get('content-type') || '';
    let data: T;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text() as T;
    }
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

async function apiPost<T>(endpoint: string, body?: unknown): Promise<{ data?: T; error?: Error }> {
  try {
    const headers = await getHeaders();
    const baseUrl = apiConfig.baseUrl || '';
    const response = await fetch(`${baseUrl}${API_BASE}/${endpoint}`, {
      method: 'POST',
      credentials: apiConfig.credentials,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: new Error(errorText || `HTTP ${response.status}: ${response.statusText}`) };
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return { data };
    }
    return { data: undefined };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

async function apiPut<T>(endpoint: string, body?: unknown): Promise<{ data?: T; error?: Error }> {
  try {
    const headers = await getHeaders();
    const baseUrl = apiConfig.baseUrl || '';
    const response = await fetch(`${baseUrl}${API_BASE}/${endpoint}`, {
      method: 'PUT',
      credentials: apiConfig.credentials,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: new Error(errorText || `HTTP ${response.status}: ${response.statusText}`) };
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return { data };
    }
    return { data: undefined };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

async function apiDelete(endpoint: string): Promise<{ error?: Error }> {
  try {
    const headers = await getHeaders();
    const baseUrl = apiConfig.baseUrl || '';
    const response = await fetch(`${baseUrl}${API_BASE}/${endpoint}`, {
      method: 'DELETE',
      credentials: apiConfig.credentials,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: new Error(errorText || `HTTP ${response.status}: ${response.statusText}`) };
    }

    return {};
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

// Types (only what we actually use)
export interface UserGroup {
  name: string;
}

export interface UserModel {
  name?: string;
  email: string;
  groups: UserGroup[];
}

// Import order types
import type {
  OrderListResponse,
  OrderDetailDto,
  OrderListParams,
  OrderStatsDto,
  DashboardStatsDto,
  FulfillmentSummaryDto,
  CreateShipmentRequest,
  UpdateShipmentRequest,
  ShipmentDetailDto,
  PaymentDto,
  PaymentStatusDto,
  RecordManualPaymentDto,
  ProcessRefundDto,
  InvoiceNoteDto,
  AddInvoiceNoteRequest,
  AddressDto,
} from '../orders/types/order.types.js';

// Import payment provider types
import type {
  PaymentProviderDto,
  PaymentProviderSettingDto,
  PaymentProviderFieldDto,
  CreatePaymentProviderSettingDto,
  UpdatePaymentProviderSettingDto,
} from '../payment-providers/types.js';

// Helper to build query string from params
function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  }
  return searchParams.toString();
}

// Store settings type
export interface StoreSettingsDto {
  currencyCode: string;
  currencySymbol: string;
  invoiceNumberPrefix: string;
}

// Country type for dropdowns
export interface CountryDto {
  code: string;
  name: string;
}

// API methods
export const MerchelloApi = {
  ping: () => apiGet<string>('ping'),
  whatsMyName: () => apiGet<string>('whatsMyName'),
  whatsTheTimeMrWolf: () => apiGet<string>('whatsTheTimeMrWolf'),
  whoAmI: () => apiGet<UserModel>('whoAmI'),

  // Store Settings
  getSettings: () => apiGet<StoreSettingsDto>('settings'),
  getCountries: () => apiGet<CountryDto[]>('countries'),

  // Orders API
  getOrders: (params?: OrderListParams) => {
    const queryString = buildQueryString(params as Record<string, unknown>);
    return apiGet<OrderListResponse>(`orders${queryString ? `?${queryString}` : ''}`);
  },
  getOrder: (id: string) => apiGet<OrderDetailDto>(`orders/${id}`),
  addInvoiceNote: (invoiceId: string, data: AddInvoiceNoteRequest) =>
    apiPost<InvoiceNoteDto>(`orders/${invoiceId}/notes`, data),
  updateBillingAddress: (invoiceId: string, address: AddressDto) =>
    apiPut<AddressDto>(`orders/${invoiceId}/billing-address`, address),
  updateShippingAddress: (invoiceId: string, address: AddressDto) =>
    apiPut<AddressDto>(`orders/${invoiceId}/shipping-address`, address),
  getOrderStats: () => apiGet<OrderStatsDto>('orders/stats'),
  getDashboardStats: () => apiGet<DashboardStatsDto>('orders/dashboard-stats'),

  /** Soft-delete multiple orders/invoices */
  deleteOrders: (ids: string[]) =>
    apiPost<{ deletedCount: number }>('orders/delete', { ids }),

  // Fulfillment API
  /** Get fulfillment summary for an invoice (used in fulfillment dialog) */
  getFulfillmentSummary: (invoiceId: string) =>
    apiGet<FulfillmentSummaryDto>(`orders/${invoiceId}/fulfillment-summary`),

  /** Create a shipment for an order */
  createShipment: (orderId: string, request: CreateShipmentRequest) =>
    apiPost<ShipmentDetailDto>(`orders/${orderId}/shipments`, request),

  /** Update shipment tracking information */
  updateShipment: (shipmentId: string, request: UpdateShipmentRequest) =>
    apiPut<ShipmentDetailDto>(`shipments/${shipmentId}`, request),

  /** Delete a shipment (releases items back to unfulfilled) */
  deleteShipment: (shipmentId: string) =>
    apiDelete(`shipments/${shipmentId}`),

  // ============================================
  // Payment Providers API
  // ============================================

  /** Get all available payment providers (discovered from assemblies) */
  getAvailablePaymentProviders: () =>
    apiGet<PaymentProviderDto[]>('payment-providers/available'),

  /** Get all configured payment provider settings */
  getPaymentProviders: () =>
    apiGet<PaymentProviderSettingDto[]>('payment-providers'),

  /** Get a specific payment provider setting by ID */
  getPaymentProvider: (id: string) =>
    apiGet<PaymentProviderSettingDto>(`payment-providers/${id}`),

  /** Get configuration fields for a payment provider */
  getPaymentProviderFields: (alias: string) =>
    apiGet<PaymentProviderFieldDto[]>(`payment-providers/${alias}/fields`),

  /** Create/enable a payment provider */
  createPaymentProvider: (data: CreatePaymentProviderSettingDto) =>
    apiPost<PaymentProviderSettingDto>('payment-providers', data),

  /** Update a payment provider setting */
  updatePaymentProvider: (id: string, data: UpdatePaymentProviderSettingDto) =>
    apiPut<PaymentProviderSettingDto>(`payment-providers/${id}`, data),

  /** Delete a payment provider setting */
  deletePaymentProvider: (id: string) =>
    apiDelete(`payment-providers/${id}`),

  /** Toggle payment provider enabled status */
  togglePaymentProvider: (id: string, isEnabled: boolean) =>
    apiPut<PaymentProviderSettingDto>(`payment-providers/${id}/toggle`, { isEnabled }),

  /** Reorder payment providers */
  reorderPaymentProviders: (orderedIds: string[]) =>
    apiPut<void>('payment-providers/reorder', { orderedIds }),

  // ============================================
  // Payments API
  // ============================================

  /** Get all payments for an invoice */
  getInvoicePayments: (invoiceId: string) =>
    apiGet<PaymentDto[]>(`invoices/${invoiceId}/payments`),

  /** Get payment status for an invoice */
  getPaymentStatus: (invoiceId: string) =>
    apiGet<PaymentStatusDto>(`invoices/${invoiceId}/payment-status`),

  /** Get a specific payment by ID */
  getPayment: (id: string) =>
    apiGet<PaymentDto>(`payments/${id}`),

  /** Record a manual/offline payment */
  recordManualPayment: (invoiceId: string, data: RecordManualPaymentDto) =>
    apiPost<PaymentDto>(`invoices/${invoiceId}/payments/manual`, data),

  /** Process a refund */
  processRefund: (paymentId: string, data: ProcessRefundDto) =>
    apiPost<PaymentDto>(`payments/${paymentId}/refund`, data),
};
