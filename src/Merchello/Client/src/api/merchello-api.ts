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
  OrderPageDto,
  OrderDetailDto,
  OrderListItemDto,
  OrderListParams,
  OrderStatsDto,
  DashboardStatsDto,
  FulfillmentSummaryDto,
  CreateShipmentDto,
  UpdateShipmentDto,
  ShipmentDetailDto,
  PaymentDto,
  PaymentStatusDto,
  RecordManualPaymentDto,
  ProcessRefundDto,
  InvoiceNoteDto,
  AddInvoiceNoteDto,
  AddressDto,
  ExportOrderDto,
  OrderExportItemDto,
  InvoiceForEditDto,
  EditInvoiceDto,
  EditInvoiceResultDto,
  PreviewEditResultDto,
  TaxGroupDto,
  CreateDraftOrderDto,
  CreateDraftOrderResultDto,
  CustomerLookupResultDto,
} from '@orders/types/order.types.js';

// Import payment provider types
import type {
  PaymentProviderDto,
  PaymentProviderSettingDto,
  PaymentProviderFieldDto,
  CreatePaymentProviderDto,
  UpdatePaymentProviderDto,
  TestPaymentProviderRequestDto,
  TestPaymentProviderResponseDto,
} from '@payment-providers/types.js';

// Import shipping provider types
import type {
  ShippingProviderDto,
  ShippingProviderConfigurationDto,
  ShippingProviderFieldDto,
  CreateShippingProviderDto,
  UpdateShippingProviderDto,
  WarehouseDto,
  ShippingOptionDto,
  ShippingOptionDetailDto,
  CreateShippingOptionDto,
  ShippingCostDto,
  CreateShippingCostDto,
  ShippingWeightTierDto,
  CreateShippingWeightTierDto,
  ProviderMethodConfigDto,
  AvailableProviderDto,
  TestShippingProviderRequestDto,
  TestShippingProviderResponseDto,
} from '@shipping/types.js';

// Import product types
import type {
  ProductPageDto,
  ProductListParams,
  ProductTypeDto,
  ProductCategoryDto,
  ProductRootDetailDto,
  ProductOptionSettingsDto,
  DescriptionEditorSettingsDto,
  CreateProductRootRequest,
  UpdateProductRootRequest,
  ProductVariantDto,
  UpdateVariantRequest,
  ProductOptionDto,
  SaveProductOptionRequest,
} from '@products/types/product.types.js';

// Import warehouse types
import type {
  WarehouseListDto,
  WarehouseDetailDto,
  CreateWarehouseDto,
  UpdateWarehouseDto,
  ServiceRegionDto,
  CreateServiceRegionDto,
  CreateSupplierDto,
  CountryInfo,
  SubdivisionInfo,
} from '@warehouses/types.js';

// Import supplier types
import type {
  SupplierListItemDto,
  UpdateSupplierDto,
} from '@suppliers/types.js';

// Import analytics types
import type {
  AnalyticsSummaryDto,
  TimeSeriesDataPointDto,
  SalesBreakdownDto,
} from '../analytics/types/analytics.types.js';

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
  getTaxGroups: () => apiGet<TaxGroupDto[]>('tax-groups'),

  // Orders API
  getOrders: (params?: OrderListParams) => {
    const queryString = buildQueryString(params as Record<string, unknown>);
    return apiGet<OrderPageDto>(`orders${queryString ? `?${queryString}` : ''}`);
  },
  getOrder: (id: string) => apiGet<OrderDetailDto>(`orders/${id}`),
  addInvoiceNote: (invoiceId: string, data: AddInvoiceNoteDto) =>
    apiPost<InvoiceNoteDto>(`orders/${invoiceId}/notes`, data),
  updateBillingAddress: (invoiceId: string, address: AddressDto) =>
    apiPut<AddressDto>(`orders/${invoiceId}/billing-address`, address),
  updateShippingAddress: (invoiceId: string, address: AddressDto) =>
    apiPut<AddressDto>(`orders/${invoiceId}/shipping-address`, address),
  updatePurchaseOrder: (invoiceId: string, purchaseOrder: string | null) =>
    apiPut<{ purchaseOrder: string | null }>(`orders/${invoiceId}/purchase-order`, { purchaseOrder }),
  getOrderStats: () => apiGet<OrderStatsDto>('orders/stats'),
  getDashboardStats: () => apiGet<DashboardStatsDto>('orders/dashboard-stats'),

  /** Create a draft order from the admin backoffice */
  createDraftOrder: (request: CreateDraftOrderDto) =>
    apiPost<CreateDraftOrderResultDto>('orders/draft', request),

  /** Search for customers by email or name (returns matching customers with their past shipping addresses) */
  searchCustomers: (email?: string, name?: string) => {
    const params = new URLSearchParams();
    if (email) params.set('email', email);
    if (name) params.set('name', name);
    const query = params.toString();
    return apiGet<CustomerLookupResultDto[]>(`orders/customer-lookup${query ? `?${query}` : ''}`);
  },

  /** Get all orders for a customer by their billing email address */
  getCustomerOrders: (email: string) =>
    apiGet<OrderListItemDto[]>(`orders/customer/${encodeURIComponent(email)}`),

  /** Export orders within a date range for CSV generation */
  exportOrders: (request: ExportOrderDto) =>
    apiPost<OrderExportItemDto[]>('orders/export', request),

  /** Soft-delete multiple orders/invoices */
  deleteOrders: (ids: string[]) =>
    apiPost<{ deletedCount: number }>('orders/delete', { ids }),

  // Invoice Editing API
  /** Get invoice data prepared for editing */
  getInvoiceForEdit: (invoiceId: string) =>
    apiGet<InvoiceForEditDto>(`orders/${invoiceId}/edit`),

  /** Edit an invoice (update quantities, apply discounts, add custom items) */
  editInvoice: (invoiceId: string, request: EditInvoiceDto) =>
    apiPut<EditInvoiceResultDto>(`orders/${invoiceId}/edit`, request),

  /** Preview calculated totals for proposed invoice changes without persisting.
   * This is the single source of truth for all invoice calculations.
   * Frontend should call this instead of calculating locally. */
  previewInvoiceEdit: (invoiceId: string, request: EditInvoiceDto) =>
    apiPost<PreviewEditResultDto>(`orders/${invoiceId}/preview-edit`, request),

  // Fulfillment API
  /** Get fulfillment summary for an invoice (used in fulfillment dialog) */
  getFulfillmentSummary: (invoiceId: string) =>
    apiGet<FulfillmentSummaryDto>(`orders/${invoiceId}/fulfillment-summary`),

  /** Create a shipment for an order */
  createShipment: (orderId: string, request: CreateShipmentDto) =>
    apiPost<ShipmentDetailDto>(`orders/${orderId}/shipments`, request),

  /** Update shipment tracking information */
  updateShipment: (shipmentId: string, request: UpdateShipmentDto) =>
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
  createPaymentProvider: (data: CreatePaymentProviderDto) =>
    apiPost<PaymentProviderSettingDto>('payment-providers', data),

  /** Update a payment provider setting */
  updatePaymentProvider: (id: string, data: UpdatePaymentProviderDto) =>
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

  /** Test a payment provider configuration */
  testPaymentProvider: (settingId: string, request: TestPaymentProviderRequestDto) =>
    apiPost<TestPaymentProviderResponseDto>(`payment-providers/${settingId}/test`, request),

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

  // ============================================
  // Shipping Providers API
  // ============================================

  /** Get all available shipping providers (discovered from assemblies) */
  getAvailableShippingProviders: () =>
    apiGet<ShippingProviderDto[]>('shipping-providers/available'),

  /** Get all configured shipping provider settings */
  getShippingProviders: () =>
    apiGet<ShippingProviderConfigurationDto[]>('shipping-providers'),

  /** Get a specific shipping provider configuration by ID */
  getShippingProvider: (id: string) =>
    apiGet<ShippingProviderConfigurationDto>(`shipping-providers/${id}`),

  /** Get configuration fields for a shipping provider */
  getShippingProviderFields: (key: string) =>
    apiGet<ShippingProviderFieldDto[]>(`shipping-providers/${key}/fields`),

  /** Create/enable a shipping provider */
  createShippingProvider: (data: CreateShippingProviderDto) =>
    apiPost<ShippingProviderConfigurationDto>('shipping-providers', data),

  /** Update a shipping provider configuration */
  updateShippingProvider: (id: string, data: UpdateShippingProviderDto) =>
    apiPut<ShippingProviderConfigurationDto>(`shipping-providers/${id}`, data),

  /** Delete a shipping provider configuration */
  deleteShippingProvider: (id: string) =>
    apiDelete(`shipping-providers/${id}`),

  /** Toggle shipping provider enabled status */
  toggleShippingProvider: (id: string, isEnabled: boolean) =>
    apiPut<ShippingProviderConfigurationDto>(`shipping-providers/${id}/toggle`, { isEnabled }),

  /** Reorder shipping providers */
  reorderShippingProviders: (orderedIds: string[]) =>
    apiPut<void>('shipping-providers/reorder', { orderedIds }),

  /** Get method configuration fields and capabilities for a shipping provider */
  getShippingProviderMethodConfig: (providerKey: string) =>
    apiGet<ProviderMethodConfigDto>(`shipping-providers/${providerKey}/method-config`),

  /** Get providers available for adding shipping methods to a warehouse */
  getAvailableProvidersForWarehouse: () =>
    apiGet<AvailableProviderDto[]>('shipping-providers/available-for-warehouse'),

  /** Test a shipping provider configuration with sample data */
  testShippingProvider: (configurationId: string, request: TestShippingProviderRequestDto) =>
    apiPost<TestShippingProviderResponseDto>(`shipping-providers/${configurationId}/test`, request),

  // ============================================
  // Products API
  // ============================================

  /** Get paginated list of products */
  getProducts: (params?: ProductListParams) => {
    const queryString = buildQueryString(params as Record<string, unknown>);
    return apiGet<ProductPageDto>(`products${queryString ? `?${queryString}` : ''}`);
  },

  /** Get all product types for filtering */
  getProductTypes: () => apiGet<ProductTypeDto[]>('products/types'),

  /** Get all product categories for filtering */
  getProductCategories: () => apiGet<ProductCategoryDto[]>('products/categories'),

  /** Get product option settings (available type and UI aliases) */
  getProductOptionSettings: () => apiGet<ProductOptionSettingsDto>('settings/product-options'),

  /** Get description editor settings (DataType key for TipTap rich text editor) */
  getDescriptionEditorSettings: () => apiGet<DescriptionEditorSettingsDto>('settings/description-editor'),

  /** Get full product root with all variants and options */
  getProductDetail: (id: string) => apiGet<ProductRootDetailDto>(`products/${id}`),

  /** Create new product root with default variant */
  createProduct: (request: CreateProductRootRequest) => 
    apiPost<ProductRootDetailDto>('products', request),

  /** Update product root */
  updateProduct: (id: string, request: UpdateProductRootRequest) => 
    apiPut<ProductRootDetailDto>(`products/${id}`, request),

  /** Delete product root and all variants */
  deleteProduct: (id: string) => apiDelete(`products/${id}`),

  // Variant operations
  /** Get a specific variant */
  getVariant: (productRootId: string, variantId: string) => 
    apiGet<ProductVariantDto>(`products/${productRootId}/variants/${variantId}`),

  /** Update a variant */
  updateVariant: (productRootId: string, variantId: string, request: UpdateVariantRequest) => 
    apiPut<ProductVariantDto>(`products/${productRootId}/variants/${variantId}`, request),

  /** Set a variant as the default */
  setDefaultVariant: (productRootId: string, variantId: string) => 
    apiPut(`products/${productRootId}/variants/${variantId}/set-default`),

  // Options operations
  /** Save all product options (replaces existing). Variants are automatically regenerated. */
  saveProductOptions: (productRootId: string, options: SaveProductOptionRequest[]) =>
    apiPut<ProductOptionDto[]>(`products/${productRootId}/options`, options),

  // ============================================
  // Shipping Options API
  // ============================================

  /** Get all warehouses for dropdown selection */
  getWarehouses: () => apiGet<WarehouseDto[]>('warehouses'),

  /** Get all shipping options */
  getShippingOptions: () => apiGet<ShippingOptionDto[]>('shipping-options'),

  /** Get a single shipping option with costs and weight tiers */
  getShippingOption: (id: string) => apiGet<ShippingOptionDetailDto>(`shipping-options/${id}`),

  /** Create a new shipping option */
  createShippingOption: (data: CreateShippingOptionDto) =>
    apiPost<ShippingOptionDetailDto>('shipping-options', data),

  /** Update a shipping option */
  updateShippingOption: (id: string, data: CreateShippingOptionDto) =>
    apiPut<ShippingOptionDetailDto>(`shipping-options/${id}`, data),

  /** Delete a shipping option */
  deleteShippingOption: (id: string) => apiDelete(`shipping-options/${id}`),

  /** Add a cost to a shipping option */
  addShippingCost: (optionId: string, data: CreateShippingCostDto) =>
    apiPost<ShippingCostDto>(`shipping-options/${optionId}/costs`, data),

  /** Update a shipping cost */
  updateShippingCost: (costId: string, data: CreateShippingCostDto) =>
    apiPut<ShippingCostDto>(`shipping-costs/${costId}`, data),

  /** Delete a shipping cost */
  deleteShippingCost: (costId: string) => apiDelete(`shipping-costs/${costId}`),

  /** Add a weight tier to a shipping option */
  addShippingWeightTier: (optionId: string, data: CreateShippingWeightTierDto) =>
    apiPost<ShippingWeightTierDto>(`shipping-options/${optionId}/weight-tiers`, data),

  /** Update a weight tier */
  updateShippingWeightTier: (tierId: string, data: CreateShippingWeightTierDto) =>
    apiPut<ShippingWeightTierDto>(`shipping-weight-tiers/${tierId}`, data),

  /** Delete a weight tier */
  deleteShippingWeightTier: (tierId: string) => apiDelete(`shipping-weight-tiers/${tierId}`),

  // ============================================
  // Warehouses Management API
  // ============================================

  /** Get all warehouses with summary data for list view */
  getWarehousesList: () => apiGet<WarehouseListDto[]>('warehouses'),

  /** Get a warehouse with full detail including service regions */
  getWarehouseDetail: (id: string) => apiGet<WarehouseDetailDto>(`warehouses/${id}`),

  /** Create a new warehouse */
  createWarehouse: (data: CreateWarehouseDto) =>
    apiPost<WarehouseDetailDto>('warehouses', data),

  /** Update a warehouse */
  updateWarehouse: (id: string, data: UpdateWarehouseDto) =>
    apiPut<WarehouseDetailDto>(`warehouses/${id}`, data),

  /** Delete a warehouse */
  deleteWarehouse: (id: string, force = false) =>
    apiDelete(`warehouses/${id}${force ? '?force=true' : ''}`),

  // ============================================
  // Service Regions API
  // ============================================

  /** Add a service region to a warehouse */
  addServiceRegion: (warehouseId: string, data: CreateServiceRegionDto) =>
    apiPost<ServiceRegionDto>(`warehouses/${warehouseId}/service-regions`, data),

  /** Update a service region */
  updateServiceRegion: (warehouseId: string, regionId: string, data: CreateServiceRegionDto) =>
    apiPut<ServiceRegionDto>(`warehouses/${warehouseId}/service-regions/${regionId}`, data),

  /** Delete a service region */
  deleteServiceRegion: (warehouseId: string, regionId: string) =>
    apiDelete(`warehouses/${warehouseId}/service-regions/${regionId}`),

  // ============================================
  // Warehouse Available Destinations API
  // ============================================

  /** Get countries that a warehouse can service based on its service regions */
  getAvailableDestinationsForWarehouse: (warehouseId: string) =>
    apiGet<{ code: string; name: string }[]>(`warehouses/${warehouseId}/available-destinations`),

  /** Get regions that a warehouse can service for a given country */
  getAvailableRegionsForWarehouse: (warehouseId: string, countryCode: string) =>
    apiGet<{ regionCode: string; name: string }[]>(`warehouses/${warehouseId}/available-destinations/${countryCode}/regions`),

  // ============================================
  // Suppliers API
  // ============================================

  /** Get all suppliers with warehouse count */
  getSuppliers: () => apiGet<SupplierListItemDto[]>('suppliers'),

  /** Create a new supplier */
  createSupplier: (data: CreateSupplierDto) =>
    apiPost<SupplierListItemDto>('suppliers', data),

  /** Update an existing supplier */
  updateSupplier: (id: string, data: UpdateSupplierDto) =>
    apiPut<SupplierListItemDto>(`suppliers/${id}`, data),

  /** Delete a supplier */
  deleteSupplier: (id: string, force = false) =>
    apiDelete(`suppliers/${id}${force ? '?force=true' : ''}`),

  // ============================================
  // Locality API (Countries & Regions)
  // ============================================

  /** Get all countries for warehouse service region selection */
  getLocalityCountries: () => apiGet<CountryInfo[]>('countries'),

  /** Get regions/states for a country */
  getLocalityRegions: (countryCode: string) =>
    apiGet<SubdivisionInfo[]>(`countries/${countryCode}/regions`),

  // ============================================
  // Analytics & Reporting API
  // ============================================

  /** Get analytics summary for KPI cards */
  getAnalyticsSummary: (startDate: string, endDate: string) =>
    apiGet<AnalyticsSummaryDto>(`reporting/summary?startDate=${startDate}&endDate=${endDate}`),

  /** Get daily sales time series data */
  getSalesTimeSeries: (startDate: string, endDate: string) =>
    apiGet<TimeSeriesDataPointDto[]>(`reporting/sales-timeseries?startDate=${startDate}&endDate=${endDate}`),

  /** Get daily average order value time series data */
  getAovTimeSeries: (startDate: string, endDate: string) =>
    apiGet<TimeSeriesDataPointDto[]>(`reporting/aov-timeseries?startDate=${startDate}&endDate=${endDate}`),

  /** Get sales breakdown (gross, discounts, returns, net, shipping, taxes) */
  getSalesBreakdown: (startDate: string, endDate: string) =>
    apiGet<SalesBreakdownDto>(`reporting/breakdown?startDate=${startDate}&endDate=${endDate}`),
};
