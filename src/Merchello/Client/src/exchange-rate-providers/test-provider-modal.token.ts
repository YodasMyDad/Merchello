import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ExchangeRateProviderDto } from "./types.js";

export interface ExchangeRateProviderTestModalData {
  provider: ExchangeRateProviderDto;
}

export interface ExchangeRateProviderTestModalValue {
  // Informational modal - no return value needed
}

export const MERCHELLO_EXCHANGE_RATE_PROVIDER_TEST_MODAL = new UmbModalToken<
  ExchangeRateProviderTestModalData,
  ExchangeRateProviderTestModalValue
>("Merchello.ExchangeRateProvider.Test.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
