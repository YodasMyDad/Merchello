// Payment Provider types matching the API DTOs

// Import shared types for provider configuration fields
import type {
  SelectOptionDto,
  ConfigurationFieldType,
  ProviderFieldDto,
} from "@shared/types/provider-fields.types.js";

// Re-export shared types for backward compatibility
export type { SelectOptionDto, ConfigurationFieldType };

/** Payment integration types */
export enum PaymentIntegrationType {
  /** Customer is redirected to external payment page (e.g., Stripe Checkout, PayPal) */
  Redirect = 0,
  /** Payment fields rendered as iframes (e.g., Braintree Hosted Fields, Stripe Elements) */
  HostedFields = 10,
  /** Provider's embedded UI component (e.g., Klarna widget, PayPal Buttons) */
  Widget = 20,
  /** Custom form fields rendered directly (e.g., Purchase Order, Manual Payment) */
  DirectForm = 30,
}

/** Payment provider with metadata and enabled status */
export interface PaymentProviderDto {
  alias: string;
  displayName: string;
  icon?: string;
  iconHtml?: string;
  description?: string;
  supportsRefunds: boolean;
  supportsPartialRefunds: boolean;
  /** @deprecated Use integrationType instead */
  usesRedirectCheckout: boolean;
  /** Integration type determining how the payment UI is rendered */
  integrationType: PaymentIntegrationType;
  supportsAuthAndCapture: boolean;
  webhookPath?: string;
  /** Whether this provider is enabled (has a setting with IsEnabled = true) */
  isEnabled: boolean;
  /** The setting ID if configured */
  settingId?: string;
  /** Optional setup instructions/documentation for developers (markdown format) */
  setupInstructions?: string;
}

/** Configuration field definition for dynamic UI - uses shared ProviderFieldDto */
export type PaymentProviderFieldDto = ProviderFieldDto;

/** Persisted provider configuration */
export interface PaymentProviderSettingDto {
  id: string;
  providerAlias: string;
  displayName: string;
  isEnabled: boolean;
  /** Whether the provider is in test/sandbox mode */
  isTestMode: boolean;
  configuration?: Record<string, string>;
  sortOrder: number;
  dateCreated: string;
  dateUpdated: string;
  /** Provider metadata */
  provider?: PaymentProviderDto;
}

/** Request to create/enable a payment provider */
export interface CreatePaymentProviderDto {
  /** The provider alias to enable */
  providerAlias: string;
  /** Display name override (optional, defaults to provider's display name) */
  displayName?: string;
  /** Whether to enable immediately */
  isEnabled?: boolean;
  /** Whether the provider is in test/sandbox mode */
  isTestMode?: boolean;
  /** Configuration values (key-value pairs) */
  configuration?: Record<string, string>;
}

/** Request to update a payment provider setting */
export interface UpdatePaymentProviderDto {
  /** Display name override */
  displayName?: string;
  /** Whether the provider is enabled */
  isEnabled?: boolean;
  /** Whether the provider is in test/sandbox mode */
  isTestMode?: boolean;
  /** Configuration values (key-value pairs) */
  configuration?: Record<string, string>;
}

// ============================================
// Test Provider Types
// ============================================

/** Request to test a payment provider configuration */
export interface TestPaymentProviderDto {
  /** Test amount (defaults to 100.00) */
  amount?: number;
  /** Currency code (uses store default if not specified) */
  currencyCode?: string;
}

/** Result from testing a payment provider */
export interface TestPaymentProviderResultDto {
  /** Provider alias */
  providerAlias: string;
  /** Provider display name */
  providerName: string;
  /** Whether the test was successful */
  isSuccessful: boolean;
  /** Integration type of the provider */
  integrationType: PaymentIntegrationType;
  /** Redirect URL for Redirect integration type */
  redirectUrl?: string;
  /** Client token for HostedFields/Widget integration types */
  clientToken?: string;
  /** Client secret for HostedFields/Widget integration types */
  clientSecret?: string;
  /** JavaScript SDK URL for HostedFields/Widget integration types */
  javaScriptSdkUrl?: string;
  /** Form fields for DirectForm integration type */
  formFields?: TestCheckoutFormFieldDto[];
  /** Session ID from the provider */
  sessionId?: string;
  /** Error message if the test failed */
  errorMessage?: string;
  /** Error code from the provider */
  errorCode?: string;
}

/** Checkout form field for DirectForm providers */
export interface TestCheckoutFormFieldDto {
  /** Field key */
  key: string;
  /** Field label */
  label: string;
  /** Field description */
  description?: string;
  /** Field type */
  fieldType: string;
  /** Whether the field is required */
  isRequired: boolean;
}

// ============================================
// Checkout Preview Types
// ============================================

/** Payment method type for deduplication */
export enum PaymentMethodType {
  Cards = 0,
  ApplePay = 10,
  GooglePay = 20,
  PayPal = 30,
  Link = 40,
  BuyNowPayLater = 50,
  BankTransfer = 60,
  Manual = 100,
  Custom = 999,
}

/** Preview of payment methods as they will appear at checkout */
export interface CheckoutPaymentPreviewDto {
  /** Express checkout methods that will appear (Apple Pay, Google Pay, etc.) */
  expressMethods: CheckoutMethodPreviewDto[];
  /** Standard payment methods that will appear (Cards, PayPal, etc.) */
  standardMethods: CheckoutMethodPreviewDto[];
  /** Methods that are enabled but hidden because another provider's method of the same type has a lower sort order */
  hiddenMethods: CheckoutMethodPreviewDto[];
}

/** A payment method in the checkout preview with provider context and deduplication status */
export interface CheckoutMethodPreviewDto {
  /** The provider alias (e.g., "stripe", "braintree") */
  providerAlias: string;
  /** The provider's display name for the UI */
  providerDisplayName: string;
  /** The provider setting ID for linking to configuration */
  providerSettingId: string;
  /** The method alias within the provider (e.g., "cards", "applepay") */
  methodAlias: string;
  /** Display name shown to customers */
  displayName: string;
  /** Icon identifier or URL */
  icon?: string;
  /** Icon HTML/SVG markup for the payment method */
  iconHtml?: string;
  /** The type/category of this payment method (e.g., Cards, ApplePay) */
  methodType?: PaymentMethodType;
  /** Sort order for display in checkout */
  sortOrder: number;
  /** True if this method will be shown at checkout (wins for its MethodType) */
  isActive: boolean;
  /** If hidden, the display name of the provider that outranks this method */
  outrankedBy?: string;
}

// ============================================
// Payment Method Settings Types
// ============================================

/** Settings for a payment method within a provider */
export interface PaymentMethodSettingDto {
  /** Method alias (e.g., "cards", "applepay") */
  methodAlias: string;
  /** Current display name */
  displayName: string;
  /** Original display name from provider */
  defaultDisplayName?: string;
  /** Icon identifier */
  icon?: string;
  /** Icon HTML/SVG */
  iconHtml?: string;
  /** Method description */
  description?: string;
  /** Whether the method is enabled */
  isEnabled: boolean;
  /** Sort order for display */
  sortOrder: number;
  /** Whether this is an express checkout method */
  isExpressCheckout: boolean;
  /** Method type for deduplication */
  methodType?: PaymentMethodType;
}

/** Request to update a payment method setting */
export interface UpdatePaymentMethodSettingDto {
  /** Whether the method is enabled */
  isEnabled?: boolean;
}
