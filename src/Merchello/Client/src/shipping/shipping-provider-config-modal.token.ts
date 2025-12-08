import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ShippingProviderDto, ShippingProviderConfigurationDto } from "@shipping/types.js";

export interface ShippingProviderConfigModalData {
  /** The provider to configure */
  provider: ShippingProviderDto;
  /** Existing configuration if editing, undefined if creating new */
  configuration?: ShippingProviderConfigurationDto;
}

export interface ShippingProviderConfigModalValue {
  /** Whether the provider was saved/updated */
  saved: boolean;
}

export const MERCHELLO_SHIPPING_PROVIDER_CONFIG_MODAL = new UmbModalToken<
  ShippingProviderConfigModalData,
  ShippingProviderConfigModalValue
>("Merchello.ShippingProvider.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
