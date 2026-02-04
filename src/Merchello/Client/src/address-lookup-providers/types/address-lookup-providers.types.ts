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

// Client config for address lookup (used in forms like create order)
export interface AddressLookupClientConfigDto {
  isEnabled: boolean;
  providerAlias?: string;
  providerName?: string;
  providerDescription?: string;
  supportedCountries?: string[];
  minQueryLength: number;
  maxSuggestions: number;
}

// Request for address suggestions
export interface AddressLookupSuggestionsRequestDto {
  query: string;
  countryCode?: string;
  limit?: number;
  sessionId?: string;
}

// Individual suggestion item
export interface AddressLookupSuggestionDto {
  id: string;
  label: string;
  description?: string;
}

// Response for address suggestions
export interface AddressLookupSuggestionsResponseDto {
  success: boolean;
  errorMessage?: string;
  suggestions: AddressLookupSuggestionDto[];
}

// Request to resolve a suggestion into full address
export interface AddressLookupResolveRequestDto {
  id: string;
  countryCode?: string;
  sessionId?: string;
}

// Full address returned from resolve
export interface AddressLookupAddressDto {
  company?: string;
  addressOne?: string;
  addressTwo?: string;
  townCity?: string;
  countyState?: string;
  regionCode?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
}

// Response for address resolve
export interface AddressLookupResolveResponseDto {
  success: boolean;
  errorMessage?: string;
  address?: AddressLookupAddressDto;
}
