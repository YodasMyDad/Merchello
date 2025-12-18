import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ShippingProviderConfigurationDto } from "@shipping/types/shipping.types.js";

export interface TestShippingProviderModalData {
  /** The configured provider to test */
  configuration: ShippingProviderConfigurationDto;
}

export interface TestShippingProviderModalValue {
  // Informational modal only - no return value needed
}

export const MERCHELLO_TEST_SHIPPING_PROVIDER_MODAL = new UmbModalToken<
  TestShippingProviderModalData,
  TestShippingProviderModalValue
>("Merchello.TestShippingProvider.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
