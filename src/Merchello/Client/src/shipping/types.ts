// Shipping Provider types matching the API DTOs

// Import shared types for provider configuration fields
import type {
  SelectOptionDto,
  ConfigurationFieldType,
  ProviderFieldDto,
} from "@shared/types/provider-fields.types.js";

// Re-export shared types for backward compatibility
export type { SelectOptionDto, ConfigurationFieldType };

/** Shipping provider with metadata and enabled status */
export interface ShippingProviderDto {
  key: string;
  displayName: string;
  icon?: string;
  description?: string;
  supportsRealTimeRates: boolean;
  supportsTracking: boolean;
  supportsLabelGeneration: boolean;
  supportsDeliveryDateSelection: boolean;
  supportsInternational: boolean;
  requiresFullAddress: boolean;
  /** Whether this provider is enabled (has a configuration with IsEnabled = true) */
  isEnabled: boolean;
  /** The configuration ID if configured */
  configurationId?: string;
  /** Optional setup instructions/documentation for developers (markdown format) */
  setupInstructions?: string;
  /** Configuration capabilities for this provider */
  configCapabilities?: ProviderConfigCapabilities;
}

/** Configuration field definition for dynamic UI - uses shared ProviderFieldDto */
export type ShippingProviderFieldDto = ProviderFieldDto;

/** Configuration capabilities for a shipping provider */
export interface ProviderConfigCapabilities {
  hasLocationBasedCosts: boolean;
  hasWeightTiers: boolean;
  usesLiveRates: boolean;
  requiresGlobalConfig: boolean;
}

/** Method configuration info for a shipping provider */
export interface ProviderMethodConfigDto {
  providerKey: string;
  displayName: string;
  fields: ShippingProviderFieldDto[];
  capabilities: ProviderConfigCapabilities;
}

/** Provider available for adding shipping methods to a warehouse */
export interface AvailableProviderDto {
  key: string;
  displayName: string;
  icon?: string;
  description?: string;
  isAvailable: boolean;
  requiresSetup: boolean;
  capabilities: ProviderConfigCapabilities;
}

/** Persisted provider configuration */
export interface ShippingProviderConfigurationDto {
  id: string;
  providerKey: string;
  displayName: string;
  isEnabled: boolean;
  configuration?: Record<string, string>;
  sortOrder: number;
  dateCreated: string;
  dateUpdated: string;
  /** Provider metadata */
  provider?: ShippingProviderDto;
}

/** Request to create/enable a shipping provider */
export interface CreateShippingProviderDto {
  /** The provider key to enable */
  providerKey: string;
  /** Display name override (optional, defaults to provider's display name) */
  displayName?: string;
  /** Whether to enable immediately */
  isEnabled?: boolean;
  /** Configuration values (key-value pairs) */
  configuration?: Record<string, string>;
}

/** Request to update a shipping provider configuration */
export interface UpdateShippingProviderDto {
  /** Display name override */
  displayName?: string;
  /** Whether the provider is enabled */
  isEnabled?: boolean;
  /** Configuration values (key-value pairs) */
  configuration?: Record<string, string>;
}

// ============================================
// Shipping Options Types
// ============================================

/** Warehouse for dropdown selection */
export interface WarehouseDto {
  id: string;
  name: string;
  code?: string;
}

/** Summary DTO for shipping option list views */
export interface ShippingOptionDto {
  id: string;
  name?: string;
  warehouseId: string;
  warehouseName?: string;
  fixedCost?: number;
  daysFrom: number;
  daysTo: number;
  isNextDay: boolean;
  allowsDeliveryDateSelection: boolean;
  costCount: number;
  weightTierCount: number;
  updateDate: string;
  /** The provider key (e.g., "flat-rate", "ups", "fedex") */
  providerKey: string;
  /** Display name of the provider */
  providerDisplayName?: string;
  /** Service type code for external providers (e.g., "FEDEX_GROUND", "UPS_NEXT_DAY_AIR") */
  serviceType?: string;
  /** Whether this shipping method is enabled */
  isEnabled: boolean;
}

/** Full detail DTO including nested costs and weight tiers */
export interface ShippingOptionDetailDto extends ShippingOptionDto {
  nextDayCutOffTime?: string;
  minDeliveryDays?: number;
  maxDeliveryDays?: number;
  allowedDaysOfWeek?: string;
  isDeliveryDateGuaranteed: boolean;
  costs: ShippingCostDto[];
  weightTiers: ShippingWeightTierDto[];
  /** Provider-specific settings (JSON parsed to key-value pairs) */
  providerSettings?: Record<string, string>;
}

/** DTO for shipping cost entries */
export interface ShippingCostDto {
  id: string;
  countryCode: string;
  stateOrProvinceCode?: string;
  cost: number;
  regionDisplay?: string;
}

/** DTO for weight tier entries */
export interface ShippingWeightTierDto {
  id: string;
  countryCode: string;
  stateOrProvinceCode?: string;
  minWeightKg: number;
  maxWeightKg?: number;
  surcharge: number;
  weightRangeDisplay?: string;
  regionDisplay?: string;
}

/** DTO for creating/updating a shipping option */
export interface CreateShippingOptionDto {
  name: string;
  warehouseId: string;
  fixedCost?: number;
  daysFrom?: number;
  daysTo?: number;
  isNextDay?: boolean;
  nextDayCutOffTime?: string;
  allowsDeliveryDateSelection?: boolean;
  minDeliveryDays?: number;
  maxDeliveryDays?: number;
  allowedDaysOfWeek?: string;
  isDeliveryDateGuaranteed?: boolean;
  /** The provider key (e.g., "flat-rate", "ups", "fedex") */
  providerKey?: string;
  /** Service type code for external providers (e.g., "FEDEX_GROUND", "UPS_NEXT_DAY_AIR") */
  serviceType?: string;
  /** Provider-specific settings */
  providerSettings?: Record<string, string>;
  /** Whether this shipping method is enabled */
  isEnabled?: boolean;
}

/** DTO for creating/updating a shipping cost */
export interface CreateShippingCostDto {
  countryCode: string;
  stateOrProvinceCode?: string;
  cost: number;
}

/** DTO for creating/updating a weight tier */
export interface CreateShippingWeightTierDto {
  countryCode: string;
  stateOrProvinceCode?: string;
  minWeightKg: number;
  maxWeightKg?: number;
  surcharge: number;
}

// ============================================
// Test Provider Types
// ============================================

/** Request to test a shipping provider configuration */
export interface TestShippingProviderRequestDto {
  /** The warehouse ID to use as origin address */
  warehouseId: string;
  /** Destination country code (ISO 3166-1 alpha-2) */
  countryCode: string;
  /** Destination state/province code (optional) */
  stateOrProvinceCode?: string;
  /** Destination postal code (optional but recommended for accurate rates) */
  postalCode?: string;
  /** Destination city (optional) */
  city?: string;
  /** Package weight in kg */
  weightKg: number;
  /** Package length in cm (optional) */
  lengthCm?: number;
  /** Package width in cm (optional) */
  widthCm?: number;
  /** Package height in cm (optional) */
  heightCm?: number;
  /** Item value/subtotal for rate calculation */
  itemsSubtotal: number;
}

/** Response from testing a shipping provider */
export interface TestShippingProviderResponseDto {
  /** Provider key that was tested */
  providerKey: string;
  /** Provider display name */
  providerName: string;
  /** Whether the test was successful */
  success: boolean;
  /** Service levels returned by the provider */
  serviceLevels: TestShippingServiceLevelDto[];
  /** Any errors encountered during the test */
  errors: string[];
}

/** Service level from test results */
export interface TestShippingServiceLevelDto {
  /** Unique service code (e.g., "fedex-ground") */
  serviceCode: string;
  /** Raw service type code from the provider (e.g., "FEDEX_GROUND") */
  serviceType?: string;
  /** Human-readable service name (e.g., "FedEx Ground") */
  serviceName: string;
  /** Total shipping cost */
  totalCost: number;
  /** Currency code (e.g., "USD", "GBP") */
  currencyCode: string;
  /** Transit time as human-readable string */
  transitTime?: string;
  /** Estimated delivery date */
  estimatedDeliveryDate?: string;
  /** Additional description */
  description?: string;
  /** Whether this service type has a configured ShippingOption in the system */
  isConfigured?: boolean;
  /** Whether the provider returned a valid rate for this service type */
  isValid?: boolean;
}
