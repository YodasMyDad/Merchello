import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ShippingCostDto } from "@shipping/types.js";

export interface ShippingCostModalData {
  /** Existing cost if editing, undefined if creating new */
  cost?: ShippingCostDto;
  /** The shipping option ID to add the cost to (for create) */
  optionId?: string;
}

export interface ShippingCostModalValue {
  /** Whether the cost was saved/updated */
  saved: boolean;
}

export const MERCHELLO_SHIPPING_COST_MODAL = new UmbModalToken<
  ShippingCostModalData,
  ShippingCostModalValue
>("Merchello.ShippingCost.Modal", {
  modal: {
    type: "dialog",
    size: "small",
  },
});
