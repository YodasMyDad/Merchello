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
  | 'Url';

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
export interface CreateShippingProviderConfigurationDto {
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
export interface UpdateShippingProviderConfigurationDto {
  /** Display name override */
  displayName?: string;
  /** Whether the provider is enabled */
  isEnabled?: boolean;
  /** Configuration values (key-value pairs) */
  configuration?: Record<string, string>;
}
