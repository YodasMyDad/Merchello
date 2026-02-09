import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ShippingPostcodeRuleDto } from "@shipping/types/shipping.types.js";

export interface ShippingPostcodeRuleModalData {
  /** Existing rule if editing, undefined if creating new */
  rule?: ShippingPostcodeRuleDto;
  /** The shipping option ID to add the rule to (for create) */
  optionId?: string;
  /** The warehouse ID to filter available countries */
  warehouseId?: string;
}

export interface ShippingPostcodeRuleModalValue {
  /** Whether the rule was saved/updated */
  isSaved: boolean;
}

export const MERCHELLO_SHIPPING_POSTCODE_RULE_MODAL = new UmbModalToken<
  ShippingPostcodeRuleModalData,
  ShippingPostcodeRuleModalValue
>("Merchello.ShippingPostcodeRule.Modal", {
  modal: {
    type: "dialog",
    size: "medium",
  },
});
