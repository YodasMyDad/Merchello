import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { DiscountCategory } from "@discounts/types/discount.types.js";

/** Data passed to the select discount type modal */
export interface SelectDiscountTypeModalData {}

/** Value returned from the select discount type modal */
export interface SelectDiscountTypeModalValue {
  /** The selected discount category */
  selectedCategory: DiscountCategory;
}

export const MERCHELLO_SELECT_DISCOUNT_TYPE_MODAL = new UmbModalToken<
  SelectDiscountTypeModalData,
  SelectDiscountTypeModalValue
>("Merchello.SelectDiscountType.Modal", {
  modal: {
    type: "dialog",
    size: "medium",
  },
});
