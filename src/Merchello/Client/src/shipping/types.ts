// Shipping Provider types matching the API DTOs

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

/** Configuration field definition for dynamic UI */
export interface ShippingProviderFieldDto {
  key: string;
  label: string;
  description?: string;
  fieldType: ConfigurationFieldType;
  isRequired: boolean;
  isSensitive: boolean;
  defaultValue?: string;
  placeholder?: string;
  options?: SelectOptionDto[];
}

/** Select option for dropdown fields */
export interface SelectOptionDto {
  value: string;
  label: string;
}

/** Configuration field types */
export type ConfigurationFieldType =
  | 'Text'
  | 'Password'
  | 'Textarea'
  | 'Checkbox'
  | 'Select'
  | 'Url'
  | 'Number'
  | 'Currency'
  | 'Percentage';

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
