import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { TaxGroupRateDto } from "@tax/types/tax.types.js";

export interface TaxRateModalData {
  /** Tax group ID to add rate to */
  taxGroupId: string;
  /** Existing rate if editing */
  rate?: TaxGroupRateDto;
}

export interface TaxRateModalValue {
  isSaved: boolean;
}

export const MERCHELLO_TAX_RATE_MODAL = new UmbModalToken<
  TaxRateModalData,
  TaxRateModalValue
>("Merchello.TaxRate.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
