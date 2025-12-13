export interface ExchangeRateProviderDto {
  alias: string;
  displayName: string;
  icon?: string;
  description?: string;
  supportsHistoricalRates: boolean;
  supportedCurrencies: string[];
  isActive: boolean;
  lastFetchedAt?: string;
  configuration?: Record<string, string>;
}

export interface ExchangeRateProviderFieldDto {
  key: string;
  label: string;
  description?: string;
  fieldType: string;
  isRequired: boolean;
  isSensitive: boolean;
  defaultValue?: string;
  placeholder?: string;
}

export interface TestExchangeRateProviderResponseDto {
  success: boolean;
  errorMessage?: string;
  baseCurrency: string;
  sampleRates?: Record<string, number>;
  rateTimestamp?: string;
  totalRatesCount: number;
}

export interface ExchangeRateSnapshotDto {
  providerAlias: string;
  baseCurrency: string;
  rates: Record<string, number>;
  timestampUtc: string;
  lastFetchedAt?: string;
}

export interface SaveExchangeRateProviderSettingsDto {
  configuration: Record<string, string>;
}
