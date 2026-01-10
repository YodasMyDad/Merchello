import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ShippingTaxOverrideDto } from "@tax/types/tax.types.js";

export interface ShippingTaxOverrideModalData {
  /** Existing override if editing */
  override?: ShippingTaxOverrideDto;
}

export interface ShippingTaxOverrideModalValue {
  isSaved: boolean;
}

export const MERCHELLO_SHIPPING_TAX_OVERRIDE_MODAL = new UmbModalToken<
  ShippingTaxOverrideModalData,
  ShippingTaxOverrideModalValue
>("Merchello.ShippingTaxOverride.Modal", {
  modal: {
    type: "sidebar",
    size: "small",
  },
});
