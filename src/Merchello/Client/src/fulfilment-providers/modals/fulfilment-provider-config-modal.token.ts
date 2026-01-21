import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type {
  FulfilmentProviderDto,
  FulfilmentProviderListItemDto,
} from "@fulfilment-providers/types/fulfilment-providers.types.js";

export interface FulfilmentProviderConfigModalData {
  /** The provider to configure */
  provider: FulfilmentProviderDto;
  /** Existing configuration if editing, undefined if creating new */
  configured?: FulfilmentProviderListItemDto;
}

export interface FulfilmentProviderConfigModalValue {
  /** Whether the provider was saved/updated */
  isSaved: boolean;
}

export const MERCHELLO_FULFILMENT_PROVIDER_CONFIG_MODAL = new UmbModalToken<
  FulfilmentProviderConfigModalData,
  FulfilmentProviderConfigModalValue
>("Merchello.FulfilmentProvider.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
