// Payment Provider types matching the API DTOs

/** Payment provider with metadata and enabled status */
export interface PaymentProviderDto {
  alias: string;
  displayName: string;
  icon?: string;
  description?: string;
  supportsRefunds: boolean;
  supportsPartialRefunds: boolean;
  usesRedirectCheckout: boolean;
  supportsAuthAndCapture: boolean;
  webhookPath?: string;
  /** Whether this provider is enabled (has a setting with IsEnabled = true) */
  isEnabled: boolean;
  /** The setting ID if configured */
  settingId?: string;
  /** Optional setup instructions/documentation for developers (markdown format) */
  setupInstructions?: string;
}

/** Configuration field definition for dynamic UI */
export interface PaymentProviderFieldDto {
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
export interface CreatePaymentProviderSettingDto {
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
export interface UpdatePaymentProviderSettingDto {
  /** Display name override */
  displayName?: string;
  /** Whether the provider is enabled */
  isEnabled?: boolean;
  /** Whether the provider is in test/sandbox mode */
  isTestMode?: boolean;
  /** Configuration values (key-value pairs) */
  configuration?: Record<string, string>;
}

