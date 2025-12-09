import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ShippingProviderConfigurationDto } from "@shipping/types.js";

export interface TestProviderModalData {
  /** The configured provider to test */
  configuration: ShippingProviderConfigurationDto;
}

export interface TestProviderModalValue {
  // Informational modal only - no return value needed
}

export const MERCHELLO_TEST_PROVIDER_MODAL = new UmbModalToken<
  TestProviderModalData,
  TestProviderModalValue
>("Merchello.TestProvider.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
