import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { TaxProviderDto } from "@tax/types/tax.types.js";

export interface TestTaxProviderModalData {
  provider: TaxProviderDto;
}

export interface TestTaxProviderModalValue {
  // No value returned from test modal
}

export const MERCHELLO_TEST_TAX_PROVIDER_MODAL = new UmbModalToken<
  TestTaxProviderModalData,
  TestTaxProviderModalValue
>("Merchello.TestTaxProvider.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
