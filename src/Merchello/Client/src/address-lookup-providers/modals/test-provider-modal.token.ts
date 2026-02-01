import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { AddressLookupProviderDto } from '@address-lookup-providers/types/address-lookup-providers.types.js';

export interface TestAddressLookupProviderModalData {
  provider: AddressLookupProviderDto;
}

export interface TestAddressLookupProviderModalValue {
  // Informational modal - no return value needed
}

export const MERCHELLO_TEST_ADDRESS_LOOKUP_PROVIDER_MODAL = new UmbModalToken<
  TestAddressLookupProviderModalData,
  TestAddressLookupProviderModalValue
>("Merchello.AddressLookupProvider.Test.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
