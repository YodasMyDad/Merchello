// Re-export TaxGroupDto from order types (already defined there for dropdowns)
export type { TaxGroupDto } from "@orders/types/order.types.js";

/** Request DTO for creating a new tax group */
export interface CreateTaxGroupDto {
  /** Tax group name (required) */
  name: string;
  /** Tax percentage rate (0-100) */
  taxPercentage: number;
}

/** Request DTO for updating an existing tax group */
export interface UpdateTaxGroupDto {
  /** Tax group name (required) */
  name: string;
  /** Tax percentage rate (0-100) */
  taxPercentage: number;
}

/** Request DTO for previewing tax calculation on a custom item */
export interface PreviewCustomItemTaxRequestDto {
  /** Unit price of the custom item */
  price: number;
  /** Quantity of items */
  quantity: number;
  /** Tax group ID (null for no tax) */
  taxGroupId: string | null;
  /** Total add-on price adjustment per unit */
  addonsTotal: number;
}

/** Result DTO for custom item tax preview calculation */
export interface PreviewCustomItemTaxResultDto {
  /** Subtotal (price * quantity) */
  subtotal: number;
  /** Tax rate percentage applied */
  taxRate: number;
  /** Calculated tax amount */
  taxAmount: number;
  /** Total including tax */
  total: number;
}

/** Geographic tax rate for a tax group */
export interface TaxGroupRateDto {
  /** Rate ID */
  id: string;
  /** Parent tax group ID */
  taxGroupId: string;
  /** ISO 3166-1 alpha-2 country code (e.g., "US", "GB") */
  countryCode: string;
  /** Optional ISO 3166-2 state/province code (e.g., "CA" for California) */
  regionCode?: string;
  /** Tax percentage rate (0-100) */
  taxPercentage: number;
  /** Country display name (for UI) */
  countryName?: string;
  /** State/province display name (for UI) */
  regionName?: string;
}

/** Request DTO for creating a new geographic tax rate */
export interface CreateTaxGroupRateDto {
  /** ISO 3166-1 alpha-2 country code (e.g., "US", "GB") */
  countryCode: string;
  /** Optional ISO 3166-2 state/province code. When empty, rate applies to entire country. */
  regionCode?: string;
  /** Tax percentage rate (0-100) */
  taxPercentage: number;
}

/** Request DTO for updating an existing geographic tax rate */
export interface UpdateTaxGroupRateDto {
  /** Tax percentage rate (0-100) */
  taxPercentage: number;
}

// ============================================
// Tax Provider Types
// ============================================

/** Tax provider DTO */
export interface TaxProviderDto {
  /** Provider alias (unique identifier) */
  alias: string;
  /** Display name */
  displayName: string;
  /** Icon identifier */
  icon?: string;
  /** SVG markup for the provider's brand logo */
  iconSvg?: string;
  /** Description */
  description?: string;
  /** Whether provider supports real-time calculation */
  supportsRealTimeCalculation: boolean;
  /** Whether provider requires API credentials */
  requiresApiCredentials: boolean;
  /** Setup instructions for the admin */
  setupInstructions?: string;
  /** Whether this provider is currently active */
  isActive: boolean;
  /** Current configuration values */
  configuration?: Record<string, string>;
}

/** Tax provider configuration field DTO */
export interface TaxProviderFieldDto {
  /** Field key */
  key: string;
  /** Display label */
  label: string;
  /** Description/help text */
  description?: string;
  /** Field type (Text, Password, Select, etc.) */
  fieldType: string;
  /** Whether field is required */
  isRequired: boolean;
  /** Whether value is sensitive (masked) */
  isSensitive: boolean;
  /** Default value */
  defaultValue?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Options for select fields */
  options?: TaxProviderFieldOptionDto[];
}

/** Select option for configuration field */
export interface TaxProviderFieldOptionDto {
  /** Option value */
  value: string;
  /** Option label */
  label: string;
}

/** Request DTO for saving tax provider settings */
export interface SaveTaxProviderSettingsDto {
  /** Configuration key-value pairs */
  configuration: Record<string, string>;
}

/** Result DTO for tax provider test/validation */
export interface TestTaxProviderResultDto {
  /** Whether the test was successful */
  isSuccessful: boolean;
  /** Error message if failed */
  errorMessage?: string;
  /** Additional details from the provider */
  details?: Record<string, string>;
}

// ============================================
// Shipping Tax Override Types
// ============================================

/** Shipping tax override for a specific region */
export interface ShippingTaxOverrideDto {
  /** Override ID */
  id: string;
  /** ISO 3166-1 alpha-2 country code (e.g., "US", "GB") */
  countryCode: string;
  /** Optional ISO 3166-2 state/province code (e.g., "CA" for California) */
  regionCode?: string;
  /** Tax group ID for shipping. Null means shipping is never taxed in this region. */
  shippingTaxGroupId?: string;
  /** Tax group name (for UI display) */
  shippingTaxGroupName?: string;
  /** Tax group percentage (for UI display) */
  shippingTaxGroupPercentage?: number;
  /** Country display name (for UI) */
  countryName?: string;
  /** State/province display name (for UI) */
  regionName?: string;
  /** Date created */
  dateCreated: string;
  /** Date updated */
  dateUpdated: string;
}

/** Request DTO for creating a new shipping tax override */
export interface CreateShippingTaxOverrideDto {
  /** ISO 3166-1 alpha-2 country code (e.g., "US", "GB") */
  countryCode: string;
  /** Optional ISO 3166-2 state/province code. When empty, applies to entire country. */
  regionCode?: string;
  /** Tax group ID for shipping. Null means shipping is never taxed in this region. */
  shippingTaxGroupId?: string;
}

/** Request DTO for updating an existing shipping tax override */
export interface UpdateShippingTaxOverrideDto {
  /** Tax group ID for shipping. Null means shipping is never taxed in this region. */
  shippingTaxGroupId?: string;
}

// ============================================
// Tax Group Mapping Types
// ============================================

/**
 * Represents a tax group mapping for provider configuration.
 * Maps a Merchello TaxGroup to a provider-specific tax code.
 */
export interface TaxGroupMappingItem {
  /** Tax group ID */
  taxGroupId: string;
  /** Tax group name (for display) */
  taxGroupName: string;
  /** Provider-specific tax code */
  providerTaxCode: string;
}
