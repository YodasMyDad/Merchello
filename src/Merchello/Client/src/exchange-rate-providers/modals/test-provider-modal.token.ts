import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ExchangeRateProviderDto } from '@exchange-rate-providers/types/exchange-rate-providers.types.js';

export interface TestExchangeRateProviderModalData {
  provider: ExchangeRateProviderDto;
}

export interface TestExchangeRateProviderModalValue {
  // Informational modal - no return value needed
}

export const MERCHELLO_TEST_EXCHANGE_RATE_PROVIDER_MODAL = new UmbModalToken<
  TestExchangeRateProviderModalData,
  TestExchangeRateProviderModalValue
>("Merchello.TestExchangeRateProvider.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
