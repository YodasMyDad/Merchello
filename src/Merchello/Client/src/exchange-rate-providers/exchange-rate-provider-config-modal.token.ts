import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ExchangeRateProviderDto } from "./types.js";

export interface ExchangeRateProviderConfigModalData {
  /** The provider to configure */
  provider: ExchangeRateProviderDto;
}

export interface ExchangeRateProviderConfigModalValue {
  /** Whether the provider settings were saved */
  isSaved: boolean;
}

export const MERCHELLO_EXCHANGE_RATE_PROVIDER_CONFIG_MODAL = new UmbModalToken<
  ExchangeRateProviderConfigModalData,
  ExchangeRateProviderConfigModalValue
>("Merchello.ExchangeRateProvider.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
