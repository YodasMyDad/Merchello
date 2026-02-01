import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { AddressLookupProviderDto } from '@address-lookup-providers/types/address-lookup-providers.types.js';

export interface AddressLookupProviderConfigModalData {
  /** The provider to configure */
  provider: AddressLookupProviderDto;
}

export interface AddressLookupProviderConfigModalValue {
  /** Whether the provider settings were saved */
  isSaved: boolean;
}

export const MERCHELLO_ADDRESS_LOOKUP_PROVIDER_CONFIG_MODAL = new UmbModalToken<
  AddressLookupProviderConfigModalData,
  AddressLookupProviderConfigModalValue
>("Merchello.AddressLookupProvider.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
