// Shared provider configuration field types
// Used by both PaymentProviders and ShippingProviders

/** Select option for dropdown fields */
export interface SelectOptionDto {
  value: string;
  label: string;
}

/** Configuration field types - unified superset */
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

/** Generic configuration field definition for provider dynamic UI */
export interface ProviderFieldDto {
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
