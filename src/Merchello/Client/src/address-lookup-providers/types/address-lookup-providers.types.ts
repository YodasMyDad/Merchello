export interface AddressLookupProviderDto {
  alias: string;
  displayName: string;
  icon?: string;
  iconSvg?: string;
  description?: string;
  requiresApiCredentials: boolean;
  setupInstructions?: string;
  supportedCountries?: string[];
  isActive: boolean;
  configuration?: Record<string, string>;
}

export interface AddressLookupProviderFieldDto {
  key: string;
  label: string;
  description?: string;
  fieldType: string;
  isRequired: boolean;
  isSensitive: boolean;
  defaultValue?: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

export interface SaveAddressLookupProviderSettingsDto {
  configuration: Record<string, string>;
}

export interface TestAddressLookupProviderResultDto {
  isSuccessful: boolean;
  errorMessage?: string;
  details?: Record<string, string>;
}
