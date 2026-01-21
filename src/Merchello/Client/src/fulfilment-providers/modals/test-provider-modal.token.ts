import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { FulfilmentProviderListItemDto } from "@fulfilment-providers/types/fulfilment-providers.types.js";

export interface TestFulfilmentProviderModalData {
  /** The configured provider to test */
  provider: FulfilmentProviderListItemDto;
}

export interface TestFulfilmentProviderModalValue {
  /** Whether a test was performed */
  wasTests: boolean;
}

export const MERCHELLO_TEST_FULFILMENT_PROVIDER_MODAL = new UmbModalToken<
  TestFulfilmentProviderModalData,
  TestFulfilmentProviderModalValue
>("Merchello.TestFulfilmentProvider.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
