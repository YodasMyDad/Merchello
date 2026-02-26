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

async function apiPostMultipart<T>(endpoint: string, formData: FormData): Promise<{ data?: T; error?: Error }> {
  try {
    const headers = await getHeaders();
    const requestHeaders = { ...(headers as Record<string, string>) };
    delete requestHeaders['Content-Type'];
    delete requestHeaders['content-type'];

    const baseUrl = apiConfig.baseUrl || '';
    const response = await fetch(`${baseUrl}${API_BASE}/${endpoint}`, {
      method: 'POST',
      credentials: apiConfig.credentials,
      headers: requestHeaders,
      body: formData,
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
// Import order types
import type {
  OrderPageDto,
  OrderDetailDto,
  OrderListItemDto,
  OrderListParams,
  OrderStatsDto,
  DashboardStatsDto,
  FulfillmentSummaryDto,
  ReleaseFulfillmentResultDto,
  CreateShipmentDto,
  UpdateShipmentDto,
  UpdateShipmentStatusDto,
  ShipmentDetailDto,
  PaymentDto,
  PaymentStatusDto,
  RecordManualPaymentDto,
  ProcessRefundDto,
  PreviewRefundRequestDto,
  RefundPreviewDto,
  InvoiceNoteDto,
  AddInvoiceNoteDto,
  AddressDto,
  ExportOrderDto,
  OrderExportItemDto,
  InvoiceForEditDto,
  EditInvoiceDto,
  EditInvoiceResultDto,
  PreviewEditResultDto,
  PreviewDiscountRequestDto,
  PreviewDiscountResultDto,
  TaxGroupDto,
  CreateManualOrderDto,
  CreateManualOrderResultDto,
  CustomerLookupResultDto,
  OrderProductAutocompleteDto,
} from '@orders/types/order.types.js';

// Import payment provider types
import type {
  PaymentProviderDto,
  PaymentProviderSettingDto,
  PaymentProviderFieldDto,
  CreatePaymentProviderDto,
  UpdatePaymentProviderDto,
  TestPaymentProviderDto,
  TestPaymentProviderResultDto,
  CheckoutPaymentPreviewDto,
  PaymentMethodSettingDto,
  UpdatePaymentMethodSettingDto,
  ProcessTestPaymentDto,
  PaymentResultDto,
  ExpressCheckoutClientConfigDto,
  WebhookEventTemplateDto,
  SimulateWebhookDto,
  WebhookSimulationResultDto,
  CreatePaymentLinkDto,
  PaymentLinkInfoDto,
  PaymentLinkProviderDto,
  CheckoutFormFieldDto,
} from '@payment-providers/types/payment-providers.types.js';

// Import fulfilment provider types
import type {
  FulfilmentProviderDto,
  FulfilmentProviderListItemDto,
  FulfilmentProviderConfigurationDto,
  FulfilmentProviderFieldDto,
  CreateFulfilmentProviderDto,
  UpdateFulfilmentProviderDto,
  TestFulfilmentProviderResultDto,
  TestFulfilmentOrderSubmissionDto,
  TestFulfilmentOrderSubmissionResultDto,
  FulfilmentWebhookEventTemplateDto,
  SimulateFulfilmentWebhookDto,
  FulfilmentWebhookSimulationResultDto,
  FulfilmentSyncLogDto,
  FulfilmentSyncLogPageDto,
  FulfilmentSyncLogQueryParams,
  FulfilmentProviderOptionDto,
} from '@fulfilment-providers/types/fulfilment-providers.types.js';

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
  ShippingPostcodeRuleDto,
  CreateShippingPostcodeRuleDto,
  ProviderMethodConfigDto,
  AvailableProviderDto,
  TestShippingProviderDto,
  TestShippingProviderResultDto,
} from '@shipping/types/shipping.types.js';

// Import product types
import type {
  ProductPageDto,
  ProductListParams,
  ProductTypeDto,
  ProductCollectionDto,
  CreateProductCollectionDto,
  UpdateProductCollectionDto,
  ProductRootDetailDto,
  ProductOptionSettingsDto,
  DescriptionEditorSettingsDto,
  CreateProductRootDto,
  UpdateProductRootDto,
  ProductVariantDto,
  UpdateVariantDto,
  ProductOptionDto,
  SaveProductOptionDto,
  ProductViewDto,
  GoogleShoppingCategoryResultDto,
  ElementTypeListItemDto,
  ShippingOptionExclusionDto,
  UpdateShippingExclusionsDto,
  VariantLookupDto,
} from '@products/types/product.types.js';

// Import product feed types
import type {
  ProductFeedListItemDto,
  ProductFeedDetailDto,
  CreateProductFeedDto,
  UpdateProductFeedDto,
  ProductFeedRebuildResultDto,
  ProductFeedPreviewDto,
  ProductFeedValidationDto,
  ValidateProductFeedDto,
  ProductFeedResolverDescriptorDto,
} from '@product-feed/types/product-feed.types.js';

// Import product import/export types
import type {
  ProductImportValidationDto,
  ProductSyncIssuePageDto,
  ProductSyncIssueQueryParams,
  ProductSyncRunDto,
  ProductSyncRunPageDto,
  ProductSyncRunQueryParams,
  StartProductExportDto,
  StartProductImportDto,
  ValidateProductImportDto,
} from '@product-import-export/types/product-import-export.types.js';

// Import element type types
import type { ElementTypeDto } from '@products/types/element-type.types.js';

// Import warehouse types
import type {
  WarehouseListDto,
  WarehouseDetailDto,
  CreateWarehouseDto,
  UpdateWarehouseDto,
  ServiceRegionDto,
  CreateServiceRegionDto,
  CountryInfo,
  SubdivisionInfo,
  WarehouseShippingOptionsResultDto,
  ProductFulfillmentOptionsDto,
} from '@warehouses/types/warehouses.types.js';

// Import supplier types
import type {
  CreateSupplierDto,
  SupplierDetailDto,
  SupplierListItemDto,
  TestSupplierFtpConnectionDto,
  TestSupplierFtpConnectionResultDto,
  UpdateSupplierDto,
} from '@suppliers/types/suppliers.types.js';

// Import customer types
import type {
  CustomerListItemDto,
  CustomerPageDto,
  CustomerListParams,
  UpdateCustomerDto,
} from '@customers/types/customer.types.js';

// Import customer segment types
import type {
  CustomerSegmentListItemDto,
  CustomerSegmentDetailDto,
  CreateCustomerSegmentDto,
  UpdateCustomerSegmentDto,
  SegmentMembersResponseDto,
  AddSegmentMembersDto,
  RemoveSegmentMembersDto,
  CustomerPreviewResponseDto,
  SegmentStatisticsDto,
  CriteriaFieldMetadataDto,
  CriteriaValidationResultDto,
  SegmentCriteriaDto,
  CustomerSegmentBadgeDto,
} from '@customers/types/segment.types.js';

// Import health check types
import type {
  HealthCheckMetadataDto,
  HealthCheckResultDto,
  HealthCheckDetailPageDto,
} from '@health-checks/types/health-check.types.js';

// Import analytics types
import type {
  AnalyticsSummaryDto,
  TimeSeriesDataPointDto,
  TimeSeriesResultDto,
  SalesBreakdownDto,
} from '@analytics/types/analytics.types.js';

// Import tax types
import type {
  CreateTaxGroupDto,
  UpdateTaxGroupDto,
  PreviewCustomItemTaxRequestDto,
  PreviewCustomItemTaxResultDto,
  TaxGroupRateDto,
  CreateTaxGroupRateDto,
  UpdateTaxGroupRateDto,
  TaxProviderDto,
  TaxProviderFieldDto,
  SaveTaxProviderSettingsDto,
  TestTaxProviderResultDto,
  ShippingTaxOverrideDto,
  CreateShippingTaxOverrideDto,
  UpdateShippingTaxOverrideDto,
} from '@tax/types/tax.types.js';

// Import exchange rate provider types
import type {
  ExchangeRateProviderDto,
  ExchangeRateProviderFieldDto,
  TestExchangeRateProviderResultDto,
  ExchangeRateSnapshotDto,
  SaveExchangeRateProviderSettingsDto,
} from '@exchange-rate-providers/types/exchange-rate-providers.types.js';

// Import address lookup provider types
import type {
  AddressLookupProviderDto,
  AddressLookupProviderFieldDto,
  SaveAddressLookupProviderSettingsDto,
  TestAddressLookupProviderResultDto,
  AddressLookupClientConfigDto,
  AddressLookupSuggestionsRequestDto,
  AddressLookupSuggestionsResponseDto,
  AddressLookupResolveRequestDto,
  AddressLookupResolveResponseDto,
} from '@address-lookup-providers/types/address-lookup-providers.types.js';

// Import filter types
import type {
  ProductFilterGroupDto,
  ProductFilterDto,
  CreateFilterGroupDto,
  UpdateFilterGroupDto,
  CreateFilterDto,
  UpdateFilterDto,
  AssignFiltersDto,
} from '@filters/types/filters.types.js';

// Import discount types
import type {
  DiscountDetailDto,
  DiscountPageDto,
  DiscountQueryParams,
  CreateDiscountDto,
  UpdateDiscountDto,
  DiscountPerformanceDto,
} from '@discounts/types/discount.types.js';

// Import upsell types
import type {
  UpsellDetailDto,
  UpsellPageDto,
  UpsellQueryParams,
  CreateUpsellDto,
  UpdateUpsellDto,
  UpsellPerformanceDto,
  UpsellDashboardDto,
  UpsellSummaryDto,
} from '@upsells/types/upsell.types.js';

// Import email types
import type {
  EmailConfigurationDto,
  EmailConfigurationDetailDto,
  EmailConfigurationPageDto,
  EmailConfigurationListParams,
  CreateEmailConfigurationDto,
  UpdateEmailConfigurationDto,
  SendTestEmailDto,
  EmailTopicDto,
  EmailTopicCategoryDto,
  TokenInfoDto,
  EmailTemplateDto,
  EmailPreviewDto,
  EmailSendTestResultDto,
  EmailAttachmentDto,
} from '@email/types/email.types.js';

// Import webhook types
import type {
  WebhookSubscriptionDto,
  WebhookSubscriptionDetailDto,
  WebhookSubscriptionPageDto,
  CreateWebhookSubscriptionDto,
  UpdateWebhookSubscriptionDto,
  WebhookSubscriptionQueryParams,
  WebhookTopicDto,
  WebhookTopicCategoryDto,
  OutboundDeliveryDetailDto,
  OutboundDeliveryPageDto,
  OutboundDeliveryQueryParams,
  WebhookStatsDto,
  OutboundDeliveryResultDto,
} from '@webhooks/types/webhooks.types.js';

// Import abandoned checkout types
import type {
  AbandonedCheckoutPageDto,
  AbandonedCheckoutDetailDto,
  AbandonedCheckoutStatsDto,
  AbandonedCheckoutQueryParams,
  RegenerateRecoveryLinkResultDto,
  ResendRecoveryEmailResultDto,
} from '@abandoned-checkouts/types/abandoned-checkout.types.js';
import type {
  InstallSeedDataResultDto,
  SeedDataStatusDto,
} from '@seed-data/types/seed-data.types.js';

// Import notifications discovery types (developer tools)
import type { NotificationDiscoveryResultDto } from '@notifications/types/notifications.types.js';

// Import apply discount result from order types (for invoices)
interface ApplyDiscountResultDto {
  success: boolean;
  errorMessage?: string | null;
  newTotal?: number | null;
}

// Addon price preview types (for product picker modal)
interface AddonPricePreviewRequestDto {
  selectedAddons: AddonSelectionDto[];
}

interface AddonSelectionDto {
  optionId: string;
  valueId: string;
}

interface AddonPricePreviewDto {
  basePrice: number;
  addonsTotal: number;
  totalPrice: number;
}

// Helper to build query string from params
function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== '') {
          searchParams.append(key, String(item));
        }
      }
      continue;
    }

    searchParams.append(key, String(value));
  }
  return searchParams.toString();
}

// Store settings type
export interface StoreSettingsDto {
  currencyCode: string;
  currencySymbol: string;
  invoiceNumberPrefix: string;
  lowStockThreshold: number;
  /** Default length for auto-generated discount codes. */
  discountCodeLength: number;
  /** Default priority for newly created discounts. Lower numbers = higher priority. */
  defaultDiscountPriority: number;
  /** Default number of items per page in list views. */
  defaultPaginationPageSize: number;
  /** Quick-select refund amount percentages shown in the refund modal. */
  refundQuickAmountPercentages: number[];
}

export interface StoreConfigurationStorePanelDto {
  invoiceNumberPrefix: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  address: string;
  logoMediaKey?: string | null;
  logoUrl?: string | null;
  displayPricesIncTax: boolean;
  showStockLevels: boolean;
  lowStockThreshold: number;
}

export interface StoreConfigurationInvoiceRemindersDto {
  reminderDaysBeforeDue: number;
  overdueReminderIntervalDays: number;
  maxOverdueReminders: number;
  checkIntervalHours: number;
}

export interface StoreConfigurationPoliciesDto {
  termsContent?: string | null;
  privacyContent?: string | null;
}

export interface StoreConfigurationOrderTermsDto {
  showCheckbox: boolean;
  checkboxText: string;
  checkboxRequired: boolean;
}

export interface StoreConfigurationCheckoutDto {
  headerBackgroundImageMediaKey?: string | null;
  headerBackgroundImageUrl?: string | null;
  headerBackgroundColor?: string | null;
  logoPosition: string;
  logoMaxWidth: number;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  errorColor: string;
  headingFontFamily: string;
  bodyFontFamily: string;
  billingPhoneRequired: boolean;
  confirmationRedirectUrl?: string | null;
  customScriptUrl?: string | null;
  orderTerms: StoreConfigurationOrderTermsDto;
}

export interface StoreConfigurationAbandonedCheckoutDto {
  abandonmentThresholdHours: number;
  recoveryExpiryDays: number;
  checkIntervalMinutes: number;
  firstEmailDelayHours: number;
  reminderEmailDelayHours: number;
  finalEmailDelayHours: number;
  maxRecoveryEmails: number;
}

export interface StoreConfigurationEmailThemeDto {
  primaryColor: string;
  textColor: string;
  backgroundColor: string;
  fontFamily: string;
  secondaryTextColor: string;
  contentBackgroundColor: string;
}

export interface StoreConfigurationEmailDto {
  defaultFromAddress?: string | null;
  defaultFromName?: string | null;
  theme: StoreConfigurationEmailThemeDto;
}

export interface StoreConfigurationUcpDto {
  termsUrl?: string | null;
  privacyUrl?: string | null;
  publicBaseUrl?: string | null;
  allowedAgents?: string[] | null;
  capabilityCheckout?: boolean | null;
  capabilityOrder?: boolean | null;
  capabilityIdentityLinking?: boolean | null;
  extensionDiscount?: boolean | null;
  extensionFulfillment?: boolean | null;
  extensionBuyerConsent?: boolean | null;
  extensionAp2Mandates?: boolean | null;
  webhookTimeoutSeconds?: number | null;
}

export interface StoreConfigurationDto {
  storeKey: string;
  store: StoreConfigurationStorePanelDto;
  invoiceReminders: StoreConfigurationInvoiceRemindersDto;
  policies: StoreConfigurationPoliciesDto;
  checkout: StoreConfigurationCheckoutDto;
  abandonedCheckout: StoreConfigurationAbandonedCheckoutDto;
  email: StoreConfigurationEmailDto;
  ucp: StoreConfigurationUcpDto;
}

export interface UcpFlowDiagnosticsDto {
  protocolVersion: string;
  capabilities: string[];
  extensions: string[];
  requireHttps: boolean;
  minimumTlsVersion: string;
  publicBaseUrl?: string | null;
  effectiveBaseUrl?: string | null;
  strictModeAvailable: boolean;
  strictModeBlockReason?: string | null;
  strictFallbackMode: string;
  simulatedAgentId: string;
  simulatedAgentProfileUrl?: string | null;
  timestampUtc: string;
}

export interface UcpFlowRequestSnapshotDto {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string | null;
  timestampUtc: string;
}

export interface UcpFlowResponseSnapshotDto {
  statusCode: number;
  headers: Record<string, string>;
  body?: string | null;
  timestampUtc: string;
}

export interface UcpFlowStepResultDto {
  step: string;
  success: boolean;
  modeRequested: string;
  modeExecuted: string;
  fallbackApplied: boolean;
  fallbackReason?: string | null;
  dryRun: boolean;
  dryRunSkippedExecution: boolean;
  timestampUtc: string;
  durationMs: number;
  request?: UcpFlowRequestSnapshotDto | null;
  response?: UcpFlowResponseSnapshotDto | null;
  sessionId?: string | null;
  status?: string | null;
  orderId?: string | null;
  responseData?: unknown;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export interface UcpFlowTestAddressDto {
  givenName?: string | null;
  familyName?: string | null;
  organization?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  locality?: string | null;
  administrativeArea?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  phone?: string | null;
}

export interface UcpFlowTestBuyerInfoDto {
  email?: string | null;
  phone?: string | null;
  billingAddress?: UcpFlowTestAddressDto | null;
  shippingAddress?: UcpFlowTestAddressDto | null;
  shippingSameAsBilling?: boolean | null;
}

export interface UcpFlowTestDiscountsDto {
  codes?: string[] | null;
}

export interface UcpFlowTestFulfillmentDestinationDto {
  type?: string | null;
  address?: UcpFlowTestAddressDto | null;
}

export interface UcpFlowTestFulfillmentGroupSelectionDto {
  id?: string | null;
  selectedOptionId?: string | null;
}

export interface UcpFlowTestFulfillmentMethodDto {
  type?: string | null;
  destinations?: UcpFlowTestFulfillmentDestinationDto[] | null;
  groups?: UcpFlowTestFulfillmentGroupSelectionDto[] | null;
}

export interface UcpFlowTestFulfillmentDto {
  methods?: UcpFlowTestFulfillmentMethodDto[] | null;
  groups?: UcpFlowTestFulfillmentGroupSelectionDto[] | null;
}

export interface UcpFlowTestItemOptionDto {
  name?: string | null;
  value?: string | null;
}

export interface UcpFlowTestItemInfoDto {
  id?: string | null;
  title?: string | null;
  price: number;
  imageUrl?: string | null;
  url?: string | null;
  options?: UcpFlowTestItemOptionDto[] | null;
}

export interface UcpFlowTestLineItemDto {
  id?: string | null;
  item?: UcpFlowTestItemInfoDto | null;
  quantity: number;
}

export interface UcpFlowTestPaymentInstrumentDto {
  type?: string | null;
  token?: string | null;
  data?: Record<string, unknown> | null;
}

export interface UcpFlowTestCreateSessionPayloadDto {
  lineItems?: UcpFlowTestLineItemDto[] | null;
  currency?: string | null;
  buyer?: UcpFlowTestBuyerInfoDto | null;
  discounts?: UcpFlowTestDiscountsDto | null;
  fulfillment?: UcpFlowTestFulfillmentDto | null;
}

export interface UcpFlowTestUpdateSessionPayloadDto {
  lineItems?: UcpFlowTestLineItemDto[] | null;
  buyer?: UcpFlowTestBuyerInfoDto | null;
  discounts?: UcpFlowTestDiscountsDto | null;
  fulfillment?: UcpFlowTestFulfillmentDto | null;
}

export interface UcpFlowTestCompleteSessionPayloadDto {
  paymentHandlerId?: string | null;
  paymentInstrument?: UcpFlowTestPaymentInstrumentDto | null;
}

export interface UcpTestManifestRequestDto {
  modeRequested?: string | null;
  agentId?: string | null;
}

export interface UcpTestCreateSessionRequestDto {
  modeRequested?: string | null;
  agentId?: string | null;
  request?: UcpFlowTestCreateSessionPayloadDto | null;
}

export interface UcpTestGetSessionRequestDto {
  modeRequested?: string | null;
  agentId?: string | null;
  sessionId: string;
}

export interface UcpTestUpdateSessionRequestDto {
  modeRequested?: string | null;
  agentId?: string | null;
  sessionId: string;
  request?: UcpFlowTestUpdateSessionPayloadDto | null;
}

export interface UcpTestCompleteSessionRequestDto {
  modeRequested?: string | null;
  agentId?: string | null;
  sessionId: string;
  dryRun?: boolean;
  request?: UcpFlowTestCompleteSessionPayloadDto | null;
}

export interface UcpTestCancelSessionRequestDto {
  modeRequested?: string | null;
  agentId?: string | null;
  sessionId: string;
}

export interface UcpTestGetOrderRequestDto {
  modeRequested?: string | null;
  agentId?: string | null;
  orderId: string;
}

// Country type for dropdowns
export interface CountryDto {
  code: string;
  name: string;
}

// API methods
export const MerchelloApi = {
  ping: () => apiGet<string>('ping'),

  // Store Settings
  getSettings: () => apiGet<StoreSettingsDto>('settings'),
  getStoreConfiguration: () => apiGet<StoreConfigurationDto>('settings/store-configuration'),
  saveStoreConfiguration: (configuration: StoreConfigurationDto) =>
    apiPut<StoreConfigurationDto>('settings/store-configuration', configuration),
  getCountries: () => apiGet<CountryDto[]>('countries'),
  getUcpFlowDiagnostics: () => apiGet<UcpFlowDiagnosticsDto>('ucp-test/diagnostics'),
  ucpTestManifest: (request: UcpTestManifestRequestDto) =>
    apiPost<UcpFlowStepResultDto>('ucp-test/manifest', request),
  ucpTestCreateSession: (request: UcpTestCreateSessionRequestDto) =>
    apiPost<UcpFlowStepResultDto>('ucp-test/sessions/create', request),
  ucpTestGetSession: (request: UcpTestGetSessionRequestDto) =>
    apiPost<UcpFlowStepResultDto>('ucp-test/sessions/get', request),
  ucpTestUpdateSession: (request: UcpTestUpdateSessionRequestDto) =>
    apiPost<UcpFlowStepResultDto>('ucp-test/sessions/update', request),
  ucpTestCompleteSession: (request: UcpTestCompleteSessionRequestDto) =>
    apiPost<UcpFlowStepResultDto>('ucp-test/sessions/complete', request),
  ucpTestCancelSession: (request: UcpTestCancelSessionRequestDto) =>
    apiPost<UcpFlowStepResultDto>('ucp-test/sessions/cancel', request),
  ucpTestGetOrder: (request: UcpTestGetOrderRequestDto) =>
    apiPost<UcpFlowStepResultDto>('ucp-test/orders/get', request),

  // Seed Data
  getSeedDataStatus: () => apiGet<SeedDataStatusDto>('seed-data/status'),
  installSeedData: () => apiPost<InstallSeedDataResultDto>('seed-data/install'),

  // ============================================
  // Tax Groups API
  // ============================================

  /** Get all tax groups */
  getTaxGroups: () => apiGet<TaxGroupDto[]>('tax-groups'),

  /** Get a single tax group by ID */
  getTaxGroup: (id: string) => apiGet<TaxGroupDto>(`tax-groups/${id}`),

  /** Create a new tax group */
  createTaxGroup: (data: CreateTaxGroupDto) =>
    apiPost<TaxGroupDto>('tax-groups', data),

  /** Update an existing tax group */
  updateTaxGroup: (id: string, data: UpdateTaxGroupDto) =>
    apiPut<TaxGroupDto>(`tax-groups/${id}`, data),

  /** Delete a tax group */
  deleteTaxGroup: (id: string) => apiDelete(`tax-groups/${id}`),

  /**
   * Preview tax calculation for a custom item.
   * Used by add-custom-item modal to show tax preview.
   */
  previewCustomItemTax: (request: PreviewCustomItemTaxRequestDto) =>
    apiPost<PreviewCustomItemTaxResultDto>('tax-groups/preview-custom-item', request),

  // ============================================
  // Tax Group Rates API (Geographic Tax Rates)
  // ============================================

  /** Get all geographic rates for a tax group */
  getTaxGroupRates: (taxGroupId: string) =>
    apiGet<TaxGroupRateDto[]>(`tax-groups/${taxGroupId}/rates`),

  /** Create a new geographic tax rate for a tax group */
  createTaxGroupRate: (taxGroupId: string, data: CreateTaxGroupRateDto) =>
    apiPost<TaxGroupRateDto>(`tax-groups/${taxGroupId}/rates`, data),

  /** Update an existing geographic tax rate */
  updateTaxGroupRate: (rateId: string, data: UpdateTaxGroupRateDto) =>
    apiPut<TaxGroupRateDto>(`tax-groups/rates/${rateId}`, data),

  /** Delete a geographic tax rate */
  deleteTaxGroupRate: (rateId: string) =>
    apiDelete(`tax-groups/rates/${rateId}`),

  // ============================================
  // Tax Providers API
  // ============================================

  /** Get all available tax providers */
  getTaxProviders: () =>
    apiGet<TaxProviderDto[]>('tax-providers'),

  /** Get the currently active tax provider */
  getActiveTaxProvider: () =>
    apiGet<TaxProviderDto>('tax-providers/active'),

  /** Get configuration fields for a tax provider */
  getTaxProviderFields: (alias: string) =>
    apiGet<TaxProviderFieldDto[]>(`tax-providers/${alias}/fields`),

  /** Activate a tax provider (only one can be active at a time) */
  activateTaxProvider: (alias: string) =>
    apiPut<{ message: string }>(`tax-providers/${alias}/activate`),

  /** Save tax provider configuration settings */
  saveTaxProviderSettings: (alias: string, settings: SaveTaxProviderSettingsDto) =>
    apiPut<{ message: string }>(`tax-providers/${alias}/settings`, settings),

  /** Test/validate a tax provider's configuration */
  testTaxProvider: (alias: string) =>
    apiPost<TestTaxProviderResultDto>(`tax-providers/${alias}/test`),

  // ============================================
  // Shipping Tax Overrides API
  // ============================================

  /** Get all shipping tax overrides */
  getShippingTaxOverrides: () =>
    apiGet<ShippingTaxOverrideDto[]>('shipping-tax-overrides'),

  /** Get a single shipping tax override by ID */
  getShippingTaxOverride: (id: string) =>
    apiGet<ShippingTaxOverrideDto>(`shipping-tax-overrides/${id}`),

  /** Create a new shipping tax override */
  createShippingTaxOverride: (data: CreateShippingTaxOverrideDto) =>
    apiPost<ShippingTaxOverrideDto>('shipping-tax-overrides', data),

  /** Update an existing shipping tax override */
  updateShippingTaxOverride: (id: string, data: UpdateShippingTaxOverrideDto) =>
    apiPut<ShippingTaxOverrideDto>(`shipping-tax-overrides/${id}`, data),

  /** Delete a shipping tax override */
  deleteShippingTaxOverride: (id: string) =>
    apiDelete(`shipping-tax-overrides/${id}`),

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

  /** Create a manual order from the admin backoffice */
  createManualOrder: (request: CreateManualOrderDto) =>
    apiPost<CreateManualOrderResultDto>('orders/manual', request),

  /** Search for customers by email or name (returns matching customers with their past shipping addresses) */
  searchCustomers: (email?: string, name?: string) => {
    const params = new URLSearchParams();
    if (email) params.set('email', email);
    if (name) params.set('name', name);
    const query = params.toString();
    return apiGet<CustomerLookupResultDto[]>(`orders/customer-lookup${query ? `?${query}` : ''}`);
  },

  /** Product variant autocomplete for add custom item in order edit (search by name or SKU) */
  searchOrderProducts: (query: string, limit: number = 10) => {
    const params = new URLSearchParams();
    params.set('query', query);
    params.set('limit', limit.toString());
    return apiGet<OrderProductAutocompleteDto[]>(`orders/product-autocomplete?${params.toString()}`);
  },

  /** Get all orders for a customer by their billing email address */
  getCustomerOrders: (email: string) =>
    apiGet<OrderListItemDto[]>(`orders/customer/${encodeURIComponent(email)}`),

  // Address Lookup (Backoffice) API
  /** Get address lookup configuration for the backoffice order creation UI */
  getOrderAddressLookupConfig: () =>
    apiGet<AddressLookupClientConfigDto>('orders/address-lookup/config'),

  /** Get address lookup suggestions for a query (backoffice - no rate limiting) */
  getOrderAddressLookupSuggestions: (request: AddressLookupSuggestionsRequestDto) =>
    apiPost<AddressLookupSuggestionsResponseDto>('orders/address-lookup/suggestions', request),

  /** Resolve an address lookup suggestion into a full address (backoffice - no rate limiting) */
  resolveOrderAddressLookup: (request: AddressLookupResolveRequestDto) =>
    apiPost<AddressLookupResolveResponseDto>('orders/address-lookup/resolve', request),

  /** Export orders within a date range for CSV generation */
  exportOrders: (request: ExportOrderDto) =>
    apiPost<OrderExportItemDto[]>('orders/export', request),

  /** Soft-delete multiple orders/invoices */
  deleteOrders: (ids: string[]) =>
    apiPost<{ deletedCount: number }>('orders/delete', { ids }),

  /** Cancel an invoice and all its unfulfilled orders */
  cancelInvoice: (invoiceId: string, reason: string) =>
    apiPost<{ success: boolean; cancelledOrderCount: number; errorMessage?: string }>(
      `orders/${invoiceId}/cancel`,
      { reason }
    ),

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

  /** Preview calculated discount amount for a line item.
   * This is the single source of truth for discount calculations.
   * Frontend should call this instead of calculating locally. */
  previewDiscount: (request: PreviewDiscountRequestDto) =>
    apiPost<PreviewDiscountResultDto>('orders/preview-discount', request),

  // Fulfillment API
  /** Get fulfillment summary for an invoice (used in fulfillment dialog) */
  getFulfillmentSummary: (invoiceId: string) =>
    apiGet<FulfillmentSummaryDto>(`orders/${invoiceId}/fulfillment-summary`),

  /** Explicitly release an order to Supplier Direct fulfilment. */
  releaseOrderFulfillment: (orderId: string) =>
    apiPost<ReleaseFulfillmentResultDto>(`orders/${orderId}/fulfillment/release`),

  /** Create a shipment for an order */
  createShipment: (orderId: string, request: CreateShipmentDto) =>
    apiPost<ShipmentDetailDto>(`orders/${orderId}/shipments`, request),

  /** Update shipment tracking information */
  updateShipment: (shipmentId: string, request: UpdateShipmentDto) =>
    apiPut<ShipmentDetailDto>(`shipments/${shipmentId}`, request),

  /** Update shipment status (e.g., Preparing -> Shipped -> Delivered) */
  updateShipmentStatus: (shipmentId: string, request: UpdateShipmentStatusDto) =>
    apiPut<ShipmentDetailDto>(`shipments/${shipmentId}/status`, request),

  /** Delete a shipment (releases items back to unfulfilled) */
  deleteShipment: (shipmentId: string) =>
    apiDelete(`shipments/${shipmentId}`),

  // ============================================
  // Outstanding Invoices API
  // ============================================

  /** Get paginated outstanding invoices across all customers */
  getOutstandingInvoices: (params?: {
    page?: number;
    pageSize?: number;
    accountCustomersOnly?: boolean;
    overdueOnly?: boolean;
    dueWithinDays?: number;
    search?: string;
    sortBy?: string;
    sortDir?: string;
  }) => {
    const queryString = buildQueryString(params as Record<string, unknown>);
    return apiGet<{
      items: OrderListItemDto[];
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    }>(`orders/outstanding${queryString ? `?${queryString}` : ''}`);
  },

  /** Batch mark multiple invoices as paid */
  batchMarkAsPaid: (data: {
    invoiceIds: string[];
    paymentMethod: string;
    reference?: string | null;
    dateReceived?: string | null;
  }) => apiPost<{
    successCount: number;
    messages: string[];
    paymentIds: string[];
  }>('orders/batch-mark-paid', data),

  /** Get outstanding balance summary for a customer */
  getCustomerOutstandingBalance: (customerId: string) =>
    apiGet<{
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
      creditWarningLevel: string;
    }>(`customers/${customerId}/outstanding`),

  /** Get outstanding invoices for a specific customer */
  getCustomerOutstandingInvoices: (customerId: string) =>
    apiGet<OrderListItemDto[]>(`customers/${customerId}/outstanding/invoices`),

  /** Download a customer statement PDF */
  downloadCustomerStatement: async (
    customerId: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<{ blob?: Blob; filename?: string; error?: Error }> => {
    try {
      const headers = await getHeaders();
      const baseUrl = apiConfig.baseUrl || '';
      const params = new URLSearchParams();
      if (periodStart) params.append('periodStart', periodStart);
      if (periodEnd) params.append('periodEnd', periodEnd);
      const queryString = params.toString();
      const url = `${baseUrl}${API_BASE}/customers/${customerId}/statement${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        credentials: apiConfig.credentials,
        headers: { ...headers, 'Content-Type': '' }, // Remove content-type for file download
      });

      if (!response.ok) {
        return { error: new Error(`HTTP ${response.status}: ${response.statusText}`) };
      }

      const blob = await response.blob();

      // Extract filename from Content-Disposition header if available
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'statement.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '');
        }
      }

      return { blob, filename };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

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
  testPaymentProvider: (settingId: string, request: TestPaymentProviderDto) =>
    apiPost<TestPaymentProviderResultDto>(`payment-providers/${settingId}/test`, request),

  /** Process a test payment (for hosted fields/widget integration types) */
  processTestPayment: (settingId: string, request: ProcessTestPaymentDto) =>
    apiPost<PaymentResultDto>(`payment-providers/${settingId}/test/process-payment`, request),

  /** Get express checkout client configuration for testing */
  getTestExpressConfig: (settingId: string, methodAlias: string, amount: number = 100) =>
    apiGet<ExpressCheckoutClientConfigDto>(`payment-providers/${settingId}/test/express-config?methodAlias=${methodAlias}&amount=${amount}`),

  /** Get available webhook event templates for simulation */
  getWebhookEventTemplates: (settingId: string) =>
    apiGet<WebhookEventTemplateDto[]>(`payment-providers/${settingId}/test/webhook-events`),

  /** Simulate a webhook event for testing */
  simulateWebhook: (settingId: string, request: SimulateWebhookDto) =>
    apiPost<WebhookSimulationResultDto>(`payment-providers/${settingId}/test/simulate-webhook`, request),

  /** Test payment link generation for a provider */
  testPaymentLink: (settingId: string, request: { amount: number }) =>
    apiPost<{ success: boolean; paymentUrl?: string; errorMessage?: string }>(`payment-providers/${settingId}/test/payment-link`, request),

  /** Test vault setup session creation */
  testVaultSetup: (settingId: string, request: Record<string, unknown>) =>
    apiPost<{ success: boolean; setupSessionId?: string; clientSecret?: string; redirectUrl?: string; providerCustomerId?: string; errorMessage?: string }>(`payment-providers/${settingId}/test/vault-setup`, request),

  /** Test vault setup confirmation */
  testVaultConfirm: (settingId: string, request: { setupSessionId: string; paymentMethodToken?: string; providerCustomerId?: string }) =>
    apiPost<{ success: boolean; providerMethodId?: string; providerCustomerId?: string; displayLabel?: string; cardBrand?: string; last4?: string; expiryMonth?: number; expiryYear?: number; errorMessage?: string }>(`payment-providers/${settingId}/test/vault-confirm`, request),

  /** Test charging a vaulted payment method */
  testVaultCharge: (settingId: string, request: { providerMethodId: string; providerCustomerId?: string; amount: number; currencyCode: string }) =>
    apiPost<{ success: boolean; transactionId?: string; errorMessage?: string }>(`payment-providers/${settingId}/test/vault-charge`, request),

  /** Delete a vaulted payment method (for testing) */
  testVaultDelete: (settingId: string, providerMethodId: string) =>
    apiDelete(`payment-providers/${settingId}/test/vault/${providerMethodId}`),

  /** Get checkout preview showing which payment methods will appear and their deduplication status */
  getCheckoutPaymentPreview: () =>
    apiGet<CheckoutPaymentPreviewDto>('payment-providers/checkout-preview'),

  // ============================================
  // Payment Method Settings API
  // ============================================

  /** Get all payment methods for a provider with their settings */
  getPaymentProviderMethods: (providerSettingId: string) =>
    apiGet<PaymentMethodSettingDto[]>(`payment-providers/${providerSettingId}/methods`),

  /** Update a payment method setting (enable/disable) */
  updatePaymentMethodSetting: (providerSettingId: string, methodAlias: string, data: UpdatePaymentMethodSettingDto) =>
    apiPut<PaymentMethodSettingDto[]>(`payment-providers/${providerSettingId}/methods/${methodAlias}`, data),

  /** Reorder payment methods for a provider */
  reorderPaymentMethods: (providerSettingId: string, orderedMethodAliases: string[]) =>
    apiPut<void>(`payment-providers/${providerSettingId}/methods/reorder`, orderedMethodAliases),

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

  /** Get form fields for manual payments (payment method options, etc.) */
  getManualPaymentFormFields: () =>
    apiGet<CheckoutFormFieldDto[]>('payments/manual/form-fields'),

  /** Process a refund */
  processRefund: (paymentId: string, data: ProcessRefundDto) =>
    apiPost<PaymentDto>(`payments/${paymentId}/refund`, data),

  /** Preview a refund calculation without processing it */
  previewRefund: (paymentId: string, data?: PreviewRefundRequestDto) =>
    apiPost<RefundPreviewDto>(`payments/${paymentId}/preview-refund`, data ?? {}),

  // ============================================
  // Payment Links API
  // ============================================

  /** Get payment providers that support payment links */
  getPaymentLinkProviders: () =>
    apiGet<PaymentLinkProviderDto[]>('payment-links/providers'),

  /** Create a payment link for an invoice */
  createPaymentLink: (data: CreatePaymentLinkDto) =>
    apiPost<PaymentLinkInfoDto>('payment-links', data),

  /** Get the current payment link for an invoice */
  getPaymentLink: (invoiceId: string) =>
    apiGet<PaymentLinkInfoDto>(`invoices/${invoiceId}/payment-link`),

  /** Deactivate the payment link for an invoice */
  deactivatePaymentLink: (invoiceId: string) =>
    apiPost<{ success: boolean }>(`invoices/${invoiceId}/payment-link/deactivate`),

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
  testShippingProvider: (configurationId: string, request: TestShippingProviderDto) =>
    apiPost<TestShippingProviderResultDto>(`shipping-providers/${configurationId}/test`, request),

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

  /** Create a new product type */
  createProductType: (data: { name: string }) =>
    apiPost<ProductTypeDto>('products/types', data),

  /** Update an existing product type */
  updateProductType: (id: string, data: { name: string }) =>
    apiPut<ProductTypeDto>(`products/types/${id}`, data),

  /** Delete a product type */
  deleteProductType: (id: string) =>
    apiDelete(`products/types/${id}`),

  /** Get all product collections with product counts */
  getProductCollections: () => apiGet<ProductCollectionDto[]>('products/collections'),

  /** Create a new product collection */
  createProductCollection: (data: CreateProductCollectionDto) =>
    apiPost<ProductCollectionDto>('products/collections', data),

  /** Update a product collection */
  updateProductCollection: (id: string, data: UpdateProductCollectionDto) =>
    apiPut<ProductCollectionDto>(`products/collections/${id}`, data),

  /** Delete a product collection */
  deleteProductCollection: (id: string) =>
    apiDelete(`products/collections/${id}`),

  /** Get product option settings (available type and UI aliases) */
  getProductOptionSettings: () => apiGet<ProductOptionSettingsDto>('settings/product-options'),

  /** Get description editor settings (DataType key for TipTap rich text editor) */
  getDescriptionEditorSettings: () => apiGet<DescriptionEditorSettingsDto>('settings/description-editor'),

  /** Get available Element Types for product content properties */
  getElementTypes: () => apiGet<ElementTypeListItemDto[]>('products/element-types'),

  /** Get the Element Type structure for product content properties by alias */
  getProductElementType: (alias: string) =>
    apiGet<ElementTypeDto | null>(`products/element-type?alias=${encodeURIComponent(alias)}`),

  /** Get available product views for the view selection dropdown */
  getProductViews: () => apiGet<ProductViewDto[]>('products/views'),

  /** Get Google Shopping categories for autocomplete (country resolved by backend settings). */
  getGoogleShoppingCategories: (params?: {
    query?: string;
    countryCode?: string;
    limit?: number;
  }) => {
    const queryString = buildQueryString(params as Record<string, unknown>);
    return apiGet<GoogleShoppingCategoryResultDto>(`products/google-shopping-categories${queryString ? `?${queryString}` : ''}`);
  },

  /** Get full product root with all variants and options */
  getProductDetail: (id: string) => apiGet<ProductRootDetailDto>(`products/${id}`),

  /** Create new product root with default variant */
  createProduct: (request: CreateProductRootDto) =>
    apiPost<ProductRootDetailDto>('products', request),

  /** Update product root */
  updateProduct: (id: string, request: UpdateProductRootDto) =>
    apiPut<ProductRootDetailDto>(`products/${id}`, request),

  /** Delete product root and all variants */
  deleteProduct: (id: string) => apiDelete(`products/${id}`),

  // Variant operations
  /** Get a specific variant */
  getVariant: (productRootId: string, variantId: string) => 
    apiGet<ProductVariantDto>(`products/${productRootId}/variants/${variantId}`),

  /** Update a variant */
  updateVariant: (productRootId: string, variantId: string, request: UpdateVariantDto) =>
    apiPut<ProductVariantDto>(`products/${productRootId}/variants/${variantId}`, request),

  /** Set a variant as the default */
  setDefaultVariant: (productRootId: string, variantId: string) =>
    apiPut(`products/${productRootId}/variants/${variantId}/set-default`),

  /**
   * Get product variants by their IDs for property editors.
   * Returns lookup results with a 'found' flag to detect deleted products.
   */
  getVariantsByIds: (variantIds: string[]) =>
    apiPost<VariantLookupDto[]>('products/variants/by-ids', variantIds),

  // Options operations
  /** Save all product options (replaces existing). Variants are automatically regenerated. */
  saveProductOptions: (productRootId: string, options: SaveProductOptionDto[]) =>
    apiPut<ProductOptionDto[]>(`products/${productRootId}/options`, options),

  // Shipping Exclusions
  /** Get available shipping options for a product with their exclusion status */
  getProductShippingOptions: (productRootId: string) =>
    apiGet<ShippingOptionExclusionDto[]>(`products/${productRootId}/shipping-options`),

  /** Update shipping exclusions for all variants (bulk mode) */
  updateProductShippingExclusions: (productRootId: string, excludedIds: string[]) =>
    apiPut<void>(`products/${productRootId}/shipping-exclusions`, {
      excludedShippingOptionIds: excludedIds,
    } as UpdateShippingExclusionsDto),

  /** Update shipping exclusions for a specific variant */
  updateVariantShippingExclusions: (productRootId: string, variantId: string, excludedIds: string[]) =>
    apiPut<void>(`products/${productRootId}/variants/${variantId}/shipping-exclusions`, {
      excludedShippingOptionIds: excludedIds,
    } as UpdateShippingExclusionsDto),

  /**
   * Get fulfillment options for a product variant to a destination.
   * Returns the best warehouse that can fulfill based on priority, region eligibility, and stock.
   * This is a single API call replacement for frontend warehouse iteration.
   */
  getProductFulfillmentOptions: (variantId: string, destinationCountryCode: string, destinationStateCode?: string) => {
    const params = new URLSearchParams();
    params.set('destinationCountryCode', destinationCountryCode);
    if (destinationStateCode) params.set('destinationStateCode', destinationStateCode);
    return apiGet<ProductFulfillmentOptionsDto>(`products/variants/${variantId}/fulfillment-options?${params.toString()}`);
  },

  /**
   * Get the default fulfilling warehouse for a product variant based on priority and stock.
   * Used when no destination address is known (e.g., browsing products before checkout).
   * Unlike getProductFulfillmentOptions, this does NOT check region serviceability.
   */
  getDefaultFulfillingWarehouse: (variantId: string) =>
    apiGet<ProductFulfillmentOptionsDto>(`products/variants/${variantId}/default-warehouse`),

  /**
   * Preview addon price calculation for a variant.
   * Returns base price, addon total, and combined total calculated by backend.
   * This is the single source of truth for addon pricing - frontend should use this.
   */
  previewAddonPrice: (variantId: string, request: AddonPricePreviewRequestDto) =>
    apiPost<AddonPricePreviewDto>(`products/variants/${variantId}/preview-addon-price`, request),

  // ============================================
  // Product Feeds API
  // ============================================

  /** Get all configured product feeds */
  getProductFeeds: () =>
    apiGet<ProductFeedListItemDto[]>('product-feeds'),

  /** Get a product feed by ID */
  getProductFeed: (id: string) =>
    apiGet<ProductFeedDetailDto>(`product-feeds/${id}`),

  /** Create a product feed */
  createProductFeed: (request: CreateProductFeedDto) =>
    apiPost<ProductFeedDetailDto>('product-feeds', request),

  /** Update a product feed */
  updateProductFeed: (id: string, request: UpdateProductFeedDto) =>
    apiPut<ProductFeedDetailDto>(`product-feeds/${id}`, request),

  /** Delete a product feed */
  deleteProductFeed: (id: string) =>
    apiDelete(`product-feeds/${id}`),

  /** Rebuild product and promotions XML snapshots for a feed */
  rebuildProductFeed: (id: string) =>
    apiPost<ProductFeedRebuildResultDto>(`product-feeds/${id}/rebuild`),

  /** Preview feed generation diagnostics */
  previewProductFeed: (id: string) =>
    apiGet<ProductFeedPreviewDto>(`product-feeds/${id}/preview`),

  /** Validate feed output and run Google spec checks */
  validateProductFeed: (id: string, request: ValidateProductFeedDto) =>
    apiPost<ProductFeedValidationDto>(`product-feeds/${id}/validate`, request),

  /** Get available dynamic value resolvers for custom labels/fields */
  getProductFeedResolvers: () =>
    apiGet<ProductFeedResolverDescriptorDto[]>('product-feeds/resolvers'),

  // ============================================
  // Product Import / Export API
  // ============================================

  /** Validate an import CSV without mutating products. */
  validateProductImport: (file: File, request: ValidateProductImportDto) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('profile', String(request.profile));
    if (request.maxIssues !== null && request.maxIssues !== undefined) {
      formData.append('maxIssues', String(request.maxIssues));
    }

    return apiPostMultipart<ProductImportValidationDto>('product-sync/imports/validate', formData);
  },

  /** Queue a product import run after validation. */
  startProductImport: (file: File, request: StartProductImportDto) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('profile', String(request.profile));
    formData.append('continueOnImageFailure', String(request.continueOnImageFailure));
    if (request.maxIssues !== null && request.maxIssues !== undefined) {
      formData.append('maxIssues', String(request.maxIssues));
    }

    return apiPostMultipart<ProductSyncRunDto>('product-sync/imports/start', formData);
  },

  /** Queue a product export run. */
  startProductExport: (request: StartProductExportDto) =>
    apiPost<ProductSyncRunDto>('product-sync/exports/start', request),

  /** Get paginated sync run history. */
  getProductSyncRuns: (params?: ProductSyncRunQueryParams) => {
    const queryString = buildQueryString(params as Record<string, unknown>);
    return apiGet<ProductSyncRunPageDto>(`product-sync/runs${queryString ? `?${queryString}` : ''}`);
  },

  /** Get a single sync run by id. */
  getProductSyncRun: (id: string) =>
    apiGet<ProductSyncRunDto>(`product-sync/runs/${id}`),

  /** Get paginated issues for a run. */
  getProductSyncRunIssues: (id: string, params?: ProductSyncIssueQueryParams) => {
    const queryString = buildQueryString(params as Record<string, unknown>);
    return apiGet<ProductSyncIssuePageDto>(`product-sync/runs/${id}/issues${queryString ? `?${queryString}` : ''}`);
  },

  /** Download completed export CSV artifact for a run. */
  downloadProductSyncExport: async (
    runId: string
  ): Promise<{ blob?: Blob; fileName?: string; error?: Error }> => {
    try {
      const headers = await getHeaders();
      const requestHeaders = { ...(headers as Record<string, string>) };
      delete requestHeaders['Content-Type'];
      delete requestHeaders['content-type'];

      const baseUrl = apiConfig.baseUrl || '';
      const response = await fetch(`${baseUrl}${API_BASE}/product-sync/runs/${runId}/download`, {
        method: 'GET',
        credentials: apiConfig.credentials,
        headers: requestHeaders,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { error: new Error(errorText || `HTTP ${response.status}: ${response.statusText}`) };
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = `product-sync-${runId}.csv`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          fileName = match[1].replace(/['"]/g, '');
        }
      }

      return { blob, fileName };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

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

  /** Add a postcode rule to a shipping option */
  addShippingPostcodeRule: (optionId: string, data: CreateShippingPostcodeRuleDto) =>
    apiPost<ShippingPostcodeRuleDto>(`shipping-options/${optionId}/postcode-rules`, data),

  /** Update a postcode rule */
  updateShippingPostcodeRule: (ruleId: string, data: CreateShippingPostcodeRuleDto) =>
    apiPut<ShippingPostcodeRuleDto>(`shipping-postcode-rules/${ruleId}`, data),

  /** Delete a postcode rule */
  deleteShippingPostcodeRule: (ruleId: string) => apiDelete(`shipping-postcode-rules/${ruleId}`),

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
  // Warehouse Products API
  // ============================================

  /** Get paginated products assigned to a warehouse */
  getWarehouseProducts: (warehouseId: string, page = 1, pageSize = 20, search?: string) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set('search', search);
    return apiGet<ProductPageDto>(`warehouses/${warehouseId}/products?${params.toString()}`);
  },

  /** Add products to a warehouse */
  addProductsToWarehouse: (warehouseId: string, productRootIds: string[]) =>
    apiPost<number>(`warehouses/${warehouseId}/products`, { productRootIds }),

  /** Remove products from a warehouse */
  removeProductsFromWarehouse: (warehouseId: string, productRootIds: string[]) =>
    apiPost<void>(`warehouses/${warehouseId}/products/remove`, { productRootIds }),

  // ============================================
  // Warehouse Available Destinations API
  // ============================================

  /** Get countries that a warehouse can service based on its service regions */
  getAvailableDestinationsForWarehouse: (warehouseId: string) =>
    apiGet<{ code: string; name: string }[]>(`warehouses/${warehouseId}/available-destinations`),

  /** Get regions that a warehouse can service for a given country */
  getAvailableRegionsForWarehouse: (warehouseId: string, countryCode: string) =>
    apiGet<{ regionCode: string; name: string }[]>(`warehouses/${warehouseId}/available-destinations/${countryCode}/regions`),

  /** Get available shipping options for a warehouse and destination */
  getShippingOptionsForWarehouse: (warehouseId: string, destinationCountryCode: string, destinationStateCode?: string) => {
    const params = new URLSearchParams();
    params.set('destinationCountryCode', destinationCountryCode);
    if (destinationStateCode) params.set('destinationStateCode', destinationStateCode);
    return apiGet<WarehouseShippingOptionsResultDto>(`warehouses/${warehouseId}/shipping-options?${params.toString()}`);
  },

  // ============================================
  // Suppliers API
  // ============================================

  /** Get all suppliers with warehouse count */
  getSuppliers: () => apiGet<SupplierListItemDto[]>('suppliers'),

  /** Get a single supplier by ID */
  getSupplier: (id: string) => apiGet<SupplierDetailDto>(`suppliers/${id}`),

  /** Create a new supplier */
  createSupplier: (data: CreateSupplierDto) =>
    apiPost<SupplierDetailDto>('suppliers', data),

  /** Update an existing supplier */
  updateSupplier: (id: string, data: UpdateSupplierDto) =>
    apiPut<SupplierDetailDto>(`suppliers/${id}`, data),

  /** Delete a supplier */
  deleteSupplier: (id: string, force = false) =>
    apiDelete(`suppliers/${id}${force ? '?force=true' : ''}`),

  /** Test supplier FTP/SFTP connection settings */
  testSupplierFtpConnection: (data: TestSupplierFtpConnectionDto) =>
    apiPost<TestSupplierFtpConnectionResultDto>('suppliers/test-ftp-connection', data),

  // ============================================
  // Customers API
  // ============================================

  /** Get paginated list of customers with optional search */
  getCustomers: (params?: CustomerListParams) => {
    const queryString = buildQueryString(params as Record<string, unknown>);
    return apiGet<CustomerPageDto>(`customers${queryString ? `?${queryString}` : ''}`);
  },

  /** Get a single customer by ID */
  getCustomer: (id: string) => apiGet<CustomerListItemDto>(`customers/${id}`),

  /** Update an existing customer */
  updateCustomer: (id: string, data: UpdateCustomerDto) =>
    apiPut<CustomerListItemDto>(`customers/${id}`, data),

  /** Get segments that a customer belongs to (by email) */
  getCustomerSegmentBadges: (email: string) =>
    apiGet<CustomerSegmentBadgeDto[]>(`customers/segments?email=${encodeURIComponent(email)}`),

  /** Get all unique customer tags (for autocomplete) */
  getAllCustomerTags: () => apiGet<string[]>('customers/tags'),

  // ============================================
  // Customer Segments API
  // ============================================

  /** Get all customer segments */
  getCustomerSegments: () =>
    apiGet<CustomerSegmentListItemDto[]>('customer-segments'),

  /** Get a single customer segment by ID */
  getCustomerSegment: (id: string) =>
    apiGet<CustomerSegmentDetailDto>(`customer-segments/${id}`),

  /** Create a new customer segment */
  createCustomerSegment: (data: CreateCustomerSegmentDto) =>
    apiPost<CustomerSegmentDetailDto>('customer-segments', data),

  /** Update a customer segment */
  updateCustomerSegment: (id: string, data: UpdateCustomerSegmentDto) =>
    apiPut<CustomerSegmentDetailDto>(`customer-segments/${id}`, data),

  /** Delete a customer segment */
  deleteCustomerSegment: (id: string) =>
    apiDelete(`customer-segments/${id}`),

  /** Get paginated members of a segment */
  getSegmentMembers: (segmentId: string, page = 1, pageSize = 50) =>
    apiGet<SegmentMembersResponseDto>(
      `customer-segments/${segmentId}/members?page=${page}&pageSize=${pageSize}`
    ),

  /** Add members to a manual segment */
  addSegmentMembers: (segmentId: string, data: AddSegmentMembersDto) =>
    apiPost<void>(`customer-segments/${segmentId}/members`, data),

  /** Remove members from a manual segment */
  removeSegmentMembers: (segmentId: string, data: RemoveSegmentMembersDto) =>
    apiPost<void>(`customer-segments/${segmentId}/members/remove`, data),

  /** Preview customers matching an automated segment's criteria */
  previewSegmentMatches: (segmentId: string, page = 1, pageSize = 50) =>
    apiGet<CustomerPreviewResponseDto>(
      `customer-segments/${segmentId}/preview?page=${page}&pageSize=${pageSize}`
    ),

  /** Get statistics for a segment */
  getSegmentStatistics: (segmentId: string) =>
    apiGet<SegmentStatisticsDto>(`customer-segments/${segmentId}/statistics`),

  /** Get available criteria fields for automated segments */
  getCriteriaFields: () =>
    apiGet<CriteriaFieldMetadataDto[]>('customer-segments/criteria/fields'),

  /** Validate criteria rules */
  validateCriteria: (criteria: SegmentCriteriaDto[]) =>
    apiPost<CriteriaValidationResultDto>('customer-segments/criteria/validate', criteria),

  /** Search customers for segment member picker */
  searchCustomersForSegment: (search: string, excludeIds?: string[], pageSize = 50) => {
    const params = new URLSearchParams({ search, pageSize: String(pageSize) });
    if (excludeIds?.length) {
      params.set('excludeIds', excludeIds.join(','));
    }
    return apiGet<CustomerPageDto>(`customers/search?${params.toString()}`);
  },

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

  /**
   * Get daily sales time series data with backend-calculated totals and percent change.
   * Preferred over getSalesTimeSeries - avoids frontend calculation of aggregates.
   */
  getSalesTimeSeriesWithTotals: (startDate: string, endDate: string) =>
    apiGet<TimeSeriesResultDto>(`reporting/sales-timeseries-with-totals?startDate=${startDate}&endDate=${endDate}`),

  /** Get daily average order value time series data */
  getAovTimeSeries: (startDate: string, endDate: string) =>
    apiGet<TimeSeriesDataPointDto[]>(`reporting/aov-timeseries?startDate=${startDate}&endDate=${endDate}`),

  /**
   * Get daily AOV time series data with backend-calculated totals and percent change.
   * Preferred over getAovTimeSeries - avoids frontend calculation of aggregates.
   */
  getAovTimeSeriesWithTotals: (startDate: string, endDate: string) =>
    apiGet<TimeSeriesResultDto>(`reporting/aov-timeseries-with-totals?startDate=${startDate}&endDate=${endDate}`),

  /** Get sales breakdown (gross, discounts, returns, net, shipping, taxes) */
  getSalesBreakdown: (startDate: string, endDate: string) =>
    apiGet<SalesBreakdownDto>(`reporting/breakdown?startDate=${startDate}&endDate=${endDate}`),

  // ============================================
  // Exchange Rate Providers API
  // ============================================

  /** Get all available exchange rate providers (discovered from assemblies) */
  getAvailableExchangeRateProviders: () =>
    apiGet<ExchangeRateProviderDto[]>('exchange-rate-providers/available'),

  /** Get all exchange rate providers with their settings */
  getExchangeRateProviders: () =>
    apiGet<ExchangeRateProviderDto[]>('exchange-rate-providers'),

  /** Get configuration fields for an exchange rate provider */
  getExchangeRateProviderFields: (alias: string) =>
    apiGet<ExchangeRateProviderFieldDto[]>(`exchange-rate-providers/${alias}/fields`),

  /** Activate an exchange rate provider (only one can be active at a time) */
  activateExchangeRateProvider: (alias: string) =>
    apiPut<{ message: string }>(`exchange-rate-providers/${alias}/activate`),

  /** Save exchange rate provider configuration settings */
  saveExchangeRateProviderSettings: (alias: string, settings: SaveExchangeRateProviderSettingsDto) =>
    apiPut<{ message: string }>(`exchange-rate-providers/${alias}/settings`, settings),

  /** Test an exchange rate provider by fetching rates */
  testExchangeRateProvider: (alias: string) =>
    apiPost<TestExchangeRateProviderResultDto>(`exchange-rate-providers/${alias}/test`),

  /** Force refresh the exchange rate cache */
  refreshExchangeRates: () =>
    apiPost<{ message: string }>('exchange-rate-providers/refresh'),

  /** Get the current exchange rate snapshot from cache */
  getExchangeRateSnapshot: () =>
    apiGet<ExchangeRateSnapshotDto>('exchange-rate-providers/snapshot'),

  // ============================================
  // Address Lookup Providers API
  // ============================================

  /** Get all address lookup providers */
  getAddressLookupProviders: () =>
    apiGet<AddressLookupProviderDto[]>('address-lookup-providers'),

  /** Get the currently active address lookup provider */
  getActiveAddressLookupProvider: () =>
    apiGet<AddressLookupProviderDto>('address-lookup-providers/active'),

  /** Get configuration fields for an address lookup provider */
  getAddressLookupProviderFields: (alias: string) =>
    apiGet<AddressLookupProviderFieldDto[]>(`address-lookup-providers/${alias}/fields`),

  /** Activate an address lookup provider (only one can be active at a time) */
  activateAddressLookupProvider: (alias: string) =>
    apiPut<{ message: string }>(`address-lookup-providers/${alias}/activate`),

  /** Deactivate all address lookup providers */
  deactivateAddressLookupProviders: () =>
    apiPut<{ message: string }>('address-lookup-providers/deactivate'),

  /** Save address lookup provider configuration settings */
  saveAddressLookupProviderSettings: (alias: string, settings: SaveAddressLookupProviderSettingsDto) =>
    apiPut<{ message: string }>(`address-lookup-providers/${alias}/settings`, settings),

  /** Test/validate an address lookup provider's configuration */
  testAddressLookupProvider: (alias: string) =>
    apiPost<TestAddressLookupProviderResultDto>(`address-lookup-providers/${alias}/test`),

  // ============================================
  // Filters API
  // ============================================

  /** Get all filter groups with their filters */
  getFilterGroups: () =>
    apiGet<ProductFilterGroupDto[]>('filter-groups'),

  /** Get a single filter group by ID */
  getFilterGroup: (id: string) =>
    apiGet<ProductFilterGroupDto>(`filter-groups/${id}`),

  /** Create a new filter group */
  createFilterGroup: (data: CreateFilterGroupDto) =>
    apiPost<ProductFilterGroupDto>('filter-groups', data),

  /** Update a filter group */
  updateFilterGroup: (id: string, data: UpdateFilterGroupDto) =>
    apiPut<ProductFilterGroupDto>(`filter-groups/${id}`, data),

  /** Delete a filter group */
  deleteFilterGroup: (id: string) =>
    apiDelete(`filter-groups/${id}`),

  /** Reorder filter groups */
  reorderFilterGroups: (orderedIds: string[]) =>
    apiPut<void>('filter-groups/reorder', orderedIds),

  /** Create a new filter within a group */
  createFilter: (groupId: string, data: CreateFilterDto) =>
    apiPost<ProductFilterDto>(`filter-groups/${groupId}/filters`, data),

  /** Get a single filter by ID */
  getFilter: (id: string) =>
    apiGet<ProductFilterDto>(`filters/${id}`),

  /** Update a filter */
  updateFilter: (id: string, data: UpdateFilterDto) =>
    apiPut<ProductFilterDto>(`filters/${id}`, data),

  /** Delete a filter */
  deleteFilter: (id: string) =>
    apiDelete(`filters/${id}`),

  /** Reorder filters within a group */
  reorderFilters: (groupId: string, orderedIds: string[]) =>
    apiPut<void>(`filter-groups/${groupId}/filters/reorder`, orderedIds),

  /** Assign filters to a product (replaces existing assignments) */
  assignFiltersToProduct: (productId: string, filterIds: string[]) =>
    apiPut<void>(`products/${productId}/filters`, { filterIds } as AssignFiltersDto),

  /** Get filters assigned to a product */
  getFiltersForProduct: (productId: string) =>
    apiGet<ProductFilterDto[]>(`products/${productId}/filters`),

  // ============================================
  // Discounts API
  // ============================================

  /** Get paginated list of discounts */
  getDiscounts: (params?: DiscountQueryParams) => {
    const queryString = buildQueryString(params as Record<string, unknown>);
    return apiGet<DiscountPageDto>(`discounts${queryString ? `?${queryString}` : ''}`);
  },

  /** Get a single discount by ID with full details */
  getDiscount: (id: string) =>
    apiGet<DiscountDetailDto>(`discounts/${id}`),

  /** Create a new discount */
  createDiscount: (data: CreateDiscountDto) =>
    apiPost<DiscountDetailDto>('discounts', data),

  /** Update an existing discount */
  updateDiscount: (id: string, data: UpdateDiscountDto) =>
    apiPut<DiscountDetailDto>(`discounts/${id}`, data),

  /** Delete a discount */
  deleteDiscount: (id: string) =>
    apiDelete(`discounts/${id}`),

  /** Activate a discount */
  activateDiscount: (id: string) =>
    apiPost<DiscountDetailDto>(`discounts/${id}/activate`),

  /** Deactivate a discount */
  deactivateDiscount: (id: string) =>
    apiPost<DiscountDetailDto>(`discounts/${id}/deactivate`),

  /** Generate a unique discount code */
  generateDiscountCode: (length = 8) =>
    apiGet<{ code: string }>(`discounts/generate-code?length=${length}`),

  /** Check if a discount code is available */
  checkDiscountCodeAvailable: (code: string, excludeId?: string) => {
    const params = new URLSearchParams({ code });
    if (excludeId) params.set('excludeId', excludeId);
    return apiGet<{ isAvailable: boolean; available?: boolean }>(`discounts/validate-code?${params.toString()}`);
  },

  /** Apply a promotional discount to an invoice */
  applyDiscountToInvoice: (invoiceId: string, discountId: string) =>
    apiPost<ApplyDiscountResultDto>(`orders/${invoiceId}/apply-discount`, { discountId }),

  /** Get performance metrics for a discount */
  getDiscountPerformance: (id: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const queryString = params.toString();
    return apiGet<DiscountPerformanceDto>(`discounts/${id}/performance${queryString ? `?${queryString}` : ''}`);
  },

  // ============================================
  // Upsells API
  // ============================================

  /** Get paginated list of upsell rules */
  getUpsells: (params?: UpsellQueryParams) => {
    const queryString = buildQueryString(params as Record<string, unknown>);
    return apiGet<UpsellPageDto>(`upsells${queryString ? `?${queryString}` : ''}`);
  },

  /** Get a single upsell rule by ID with full details */
  getUpsell: (id: string) =>
    apiGet<UpsellDetailDto>(`upsells/${id}`),

  /** Create a new upsell rule */
  createUpsell: (data: CreateUpsellDto) =>
    apiPost<UpsellDetailDto>('upsells', data),

  /** Update an existing upsell rule */
  updateUpsell: (id: string, data: UpdateUpsellDto) =>
    apiPut<UpsellDetailDto>(`upsells/${id}`, data),

  /** Delete an upsell rule */
  deleteUpsell: (id: string) =>
    apiDelete(`upsells/${id}`),

  /** Activate an upsell rule */
  activateUpsell: (id: string) =>
    apiPost<UpsellDetailDto>(`upsells/${id}/activate`),

  /** Deactivate an upsell rule */
  deactivateUpsell: (id: string) =>
    apiPost<UpsellDetailDto>(`upsells/${id}/deactivate`),

  /** Get performance metrics for an upsell rule */
  getUpsellPerformance: (id: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const queryString = params.toString();
    return apiGet<UpsellPerformanceDto>(`upsells/${id}/performance${queryString ? `?${queryString}` : ''}`);
  },

  /** Get upsell analytics dashboard data */
  getUpsellDashboard: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const queryString = params.toString();
    return apiGet<UpsellDashboardDto>(`upsells/dashboard${queryString ? `?${queryString}` : ''}`);
  },

  /** Get aggregated upsell summary report */
  getUpsellSummary: (startDate?: string, endDate?: string, topN?: number) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (topN) params.set('topN', topN.toString());
    const queryString = params.toString();
    return apiGet<UpsellSummaryDto[]>(`upsells/summary${queryString ? `?${queryString}` : ''}`);
  },

  // ============================================
  // Email Configurations API
  // ============================================

  /** Get paginated list of email configurations */
  getEmailConfigurations: (params?: EmailConfigurationListParams) => {
    const queryString = buildQueryString(params as Record<string, unknown>);
    return apiGet<EmailConfigurationPageDto>(`emails${queryString ? `?${queryString}` : ''}`);
  },

  /** Get a single email configuration by ID with full detail */
  getEmailConfiguration: (id: string) =>
    apiGet<EmailConfigurationDetailDto>(`emails/${id}`),

  /** Create a new email configuration */
  createEmailConfiguration: (data: CreateEmailConfigurationDto) =>
    apiPost<EmailConfigurationDto>('emails', data),

  /** Update an existing email configuration */
  updateEmailConfiguration: (id: string, data: UpdateEmailConfigurationDto) =>
    apiPut<EmailConfigurationDto>(`emails/${id}`, data),

  /** Delete an email configuration */
  deleteEmailConfiguration: (id: string) =>
    apiDelete(`emails/${id}`),

  /** Toggle email configuration enabled status */
  toggleEmailConfiguration: (id: string) =>
    apiPost<EmailConfigurationDto>(`emails/${id}/toggle`),

  /** Preview an email without sending */
  previewEmail: (id: string) =>
    apiGet<EmailPreviewDto>(`emails/${id}/preview`),

  /** Send a test email */
  sendTestEmail: (id: string, data: SendTestEmailDto) =>
    apiPost<EmailSendTestResultDto>(`emails/${id}/test`, data),

  // ============================================
  // Email Metadata API
  // ============================================

  /** Get all available email topics */
  getEmailTopics: () =>
    apiGet<EmailTopicDto[]>('emails/topics'),

  /** Get email topics grouped by category */
  getEmailTopicsGrouped: () =>
    apiGet<EmailTopicCategoryDto[]>('emails/topics/categories'),

  /** Get available tokens for a specific topic */
  getTopicTokens: (topic: string) =>
    apiGet<TokenInfoDto[]>(`emails/topics/${encodeURIComponent(topic)}/tokens`),

  /** Get all available email templates */
  getEmailTemplates: () =>
    apiGet<EmailTemplateDto[]>('emails/templates'),

  /** Check if a template path exists */
  checkTemplateExists: (path: string) =>
    apiGet<boolean>(`emails/templates/exists?path=${encodeURIComponent(path)}`),

  /** Get all available email attachments */
  getEmailAttachments: () =>
    apiGet<EmailAttachmentDto[]>('emails/attachments'),

  /** Get available attachments for a specific topic */
  getTopicAttachments: (topic: string) =>
    apiGet<EmailAttachmentDto[]>(`emails/topics/${encodeURIComponent(topic)}/attachments`),

  // ============================================
  // Webhooks API
  // ============================================

  /** Get paginated list of webhook subscriptions */
  getWebhookSubscriptions: (params?: WebhookSubscriptionQueryParams) => {
    const queryString = buildQueryString(params as Record<string, unknown>);
    return apiGet<WebhookSubscriptionPageDto>(`webhooks${queryString ? `?${queryString}` : ''}`);
  },

  /** Get a single webhook subscription by ID with full detail */
  getWebhookSubscription: (id: string) =>
    apiGet<WebhookSubscriptionDetailDto>(`webhooks/${id}`),

  /** Create a new webhook subscription */
  createWebhookSubscription: (data: CreateWebhookSubscriptionDto) =>
    apiPost<WebhookSubscriptionDto>('webhooks', data),

  /** Update an existing webhook subscription */
  updateWebhookSubscription: (id: string, data: UpdateWebhookSubscriptionDto) =>
    apiPut<WebhookSubscriptionDto>(`webhooks/${id}`, data),

  /** Delete a webhook subscription */
  deleteWebhookSubscription: (id: string) =>
    apiDelete(`webhooks/${id}`),

  /** Regenerate HMAC secret for a webhook subscription */
  regenerateWebhookSecret: (id: string) =>
    apiPost<{ secret: string }>(`webhooks/${id}/regenerate-secret`),

  /** Send a test webhook */
  testWebhookSubscription: (id: string) =>
    apiPost<OutboundDeliveryResultDto>(`webhooks/${id}/test`),

  /** Ping a webhook URL to test connectivity */
  pingWebhookUrl: (url: string) =>
    apiPost<OutboundDeliveryResultDto>('webhooks/ping', { url }),

  // ============================================
  // Webhook Topics API
  // ============================================

  /** Get all available webhook topics */
  getWebhookTopics: () =>
    apiGet<WebhookTopicDto[]>('webhooks/topics'),

  /** Get webhook topics grouped by category */
  getWebhookTopicsByCategory: () =>
    apiGet<WebhookTopicCategoryDto[]>('webhooks/topics/by-category'),

  // ============================================
  // Webhook Deliveries API
  // ============================================

  /** Get paginated deliveries for a webhook subscription */
  getWebhookDeliveries: (subscriptionId: string, params?: OutboundDeliveryQueryParams) => {
    const queryString = buildQueryString(params as Record<string, unknown>);
    return apiGet<OutboundDeliveryPageDto>(`webhooks/${subscriptionId}/deliveries${queryString ? `?${queryString}` : ''}`);
  },

  /** Get a single delivery with full detail */
  getDeliveryDetail: (id: string) =>
    apiGet<OutboundDeliveryDetailDto>(`webhooks/deliveries/${id}`),

  /** Retry a failed delivery */
  retryDelivery: (id: string) =>
    apiPost<void>(`webhooks/deliveries/${id}/retry`),

  // ============================================
  // Webhook Stats API
  // ============================================

  /** Get webhook delivery statistics */
  getWebhookStats: (from?: string, to?: string) => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const queryString = buildQueryString(params);
    return apiGet<WebhookStatsDto>(`webhooks/stats${queryString ? `?${queryString}` : ''}`);
  },

  // ============================================
  // Abandoned Checkouts API
  // ============================================

  /** Get paginated list of abandoned checkouts */
  getAbandonedCheckouts: (params?: AbandonedCheckoutQueryParams) => {
    const queryString = buildQueryString(params as Record<string, unknown>);
    return apiGet<AbandonedCheckoutPageDto>(`abandoned-checkouts${queryString ? `?${queryString}` : ''}`);
  },

  /** Get abandoned checkout detail by ID */
  getAbandonedCheckoutById: (id: string) =>
    apiGet<AbandonedCheckoutDetailDto>(`abandoned-checkouts/${id}`),

  /** Get abandoned checkout statistics */
  getAbandonedCheckoutStats: (fromDate?: string, toDate?: string) => {
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    const queryString = buildQueryString(params);
    return apiGet<AbandonedCheckoutStatsDto>(`abandoned-checkouts/stats${queryString ? `?${queryString}` : ''}`);
  },

  /** Resend recovery email for an abandoned checkout */
  resendRecoveryEmail: (id: string) =>
    apiPost<ResendRecoveryEmailResultDto>(`abandoned-checkouts/${id}/resend-email`),

  /** Regenerate recovery link for an abandoned checkout */
  regenerateRecoveryLink: (id: string) =>
    apiPost<RegenerateRecoveryLinkResultDto>(`abandoned-checkouts/${id}/regenerate-link`),

  // ============================================
  // Fulfilment Providers API
  // ============================================

  /** Get all available fulfilment providers (discovered from assemblies) */
  getAvailableFulfilmentProviders: () =>
    apiGet<FulfilmentProviderDto[]>('fulfilment-providers/available'),

  /** Get all configured fulfilment provider settings */
  getFulfilmentProviderConfigurations: () =>
    apiGet<FulfilmentProviderListItemDto[]>('fulfilment-providers'),

  /** Get a specific fulfilment provider configuration by ID */
  getFulfilmentProviderConfiguration: (id: string) =>
    apiGet<FulfilmentProviderConfigurationDto>(`fulfilment-providers/${id}`),

  /** Get configuration fields for a fulfilment provider */
  getFulfilmentProviderFields: (key: string) =>
    apiGet<FulfilmentProviderFieldDto[]>(`fulfilment-providers/${key}/fields`),

  /** Create/enable a fulfilment provider */
  createFulfilmentProvider: (data: CreateFulfilmentProviderDto) =>
    apiPost<FulfilmentProviderDto>('fulfilment-providers', data),

  /** Update a fulfilment provider configuration */
  updateFulfilmentProvider: (id: string, data: UpdateFulfilmentProviderDto) =>
    apiPut<FulfilmentProviderDto>(`fulfilment-providers/${id}`, data),

  /** Delete a fulfilment provider configuration */
  deleteFulfilmentProvider: (id: string) =>
    apiDelete(`fulfilment-providers/${id}`),

  /** Toggle fulfilment provider enabled status */
  toggleFulfilmentProvider: (id: string, isEnabled: boolean) =>
    apiPut<FulfilmentProviderDto>(`fulfilment-providers/${id}/toggle`, { isEnabled }),

  /** Test a fulfilment provider connection */
  testFulfilmentProvider: (id: string) =>
    apiPost<TestFulfilmentProviderResultDto>(`fulfilment-providers/${id}/test/connection`),

  /** Submit a test order directly to the fulfilment provider */
  testFulfilmentOrderSubmission: (id: string, request: TestFulfilmentOrderSubmissionDto) =>
    apiPost<TestFulfilmentOrderSubmissionResultDto>(`fulfilment-providers/${id}/test/order`, request),

  /** Get webhook event templates for fulfilment provider simulation */
  getFulfilmentWebhookEventTemplates: (id: string) =>
    apiGet<FulfilmentWebhookEventTemplateDto[]>(`fulfilment-providers/${id}/test/webhook-events`),

  /** Simulate a fulfilment webhook event */
  simulateFulfilmentWebhook: (id: string, request: SimulateFulfilmentWebhookDto) =>
    apiPost<FulfilmentWebhookSimulationResultDto>(`fulfilment-providers/${id}/test/simulate-webhook`, request),

  /** Get fulfilment provider options for dropdown selection */
  getFulfilmentProviderOptions: () =>
    apiGet<FulfilmentProviderOptionDto[]>('fulfilment-providers/options'),

  // ============================================
  // Fulfilment Sync Logs API
  // ============================================

  /** Get paginated fulfilment sync logs */
  getFulfilmentSyncLogs: (params?: FulfilmentSyncLogQueryParams) => {
    const queryString = buildQueryString(params as Record<string, unknown>);
    return apiGet<FulfilmentSyncLogPageDto>(`fulfilment-providers/sync-logs${queryString ? `?${queryString}` : ''}`);
  },

  /** Get a single sync log entry */
  getFulfilmentSyncLog: (id: string) =>
    apiGet<FulfilmentSyncLogDto>(`fulfilment-providers/sync-logs/${id}`),

  /** Trigger a product sync for a provider */
  triggerProductSync: (providerConfigId: string) =>
    apiPost<FulfilmentSyncLogDto>(`fulfilment-providers/${providerConfigId}/sync/products`),

  /** Trigger product sync through test endpoint for provider modal */
  testFulfilmentProductSync: (providerConfigId: string) =>
    apiPost<FulfilmentSyncLogDto>(`fulfilment-providers/${providerConfigId}/test/product-sync`),

  /** Trigger an inventory sync for a provider */
  triggerInventorySync: (providerConfigId: string) =>
    apiPost<FulfilmentSyncLogDto>(`fulfilment-providers/${providerConfigId}/sync/inventory`),

  /** Trigger inventory sync through test endpoint for provider modal */
  testFulfilmentInventorySync: (providerConfigId: string) =>
    apiPost<FulfilmentSyncLogDto>(`fulfilment-providers/${providerConfigId}/test/inventory-sync`),

  // ============================================
  // Notifications Discovery API (Developer Tools)
  // ============================================

  /** Get all notifications and handlers for developer view */
  getNotifications: () =>
    apiGet<NotificationDiscoveryResultDto>('notifications'),

  // ============================================
  // Health Checks API
  // ============================================

  /** Get available health checks */
  getHealthChecks: () =>
    apiGet<HealthCheckMetadataDto[]>('health-checks'),

  /** Run a single health check */
  runHealthCheck: (alias: string) =>
    apiPost<HealthCheckResultDto>(`health-checks/${encodeURIComponent(alias)}/run`),

  /** Get paginated detail items for a health check */
  getHealthCheckDetail: (alias: string, page: number = 1, pageSize: number = 25) =>
    apiGet<HealthCheckDetailPageDto>(
      `health-checks/${encodeURIComponent(alias)}/details?page=${page}&pageSize=${pageSize}`),
};
