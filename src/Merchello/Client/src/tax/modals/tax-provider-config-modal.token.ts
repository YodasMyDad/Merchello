import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { TaxProviderDto } from "@tax/types/tax.types.js";

export interface TaxProviderConfigModalData {
  provider: TaxProviderDto;
}

export interface TaxProviderConfigModalValue {
  isSaved: boolean;
}

export const MERCHELLO_TAX_PROVIDER_CONFIG_MODAL = new UmbModalToken<
  TaxProviderConfigModalData,
  TaxProviderConfigModalValue
>("Merchello.TaxProviderConfig.Modal", {
  modal: {
    type: "sidebar",
    size: "large",
  },
});
