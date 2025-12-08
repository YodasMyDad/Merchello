import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ShippingWeightTierDto } from "@shipping/types.js";

export interface ShippingWeightTierModalData {
  /** Existing tier if editing, undefined if creating new */
  tier?: ShippingWeightTierDto;
  /** The shipping option ID to add the tier to (for create) */
  optionId?: string;
}

export interface ShippingWeightTierModalValue {
  /** Whether the tier was saved/updated */
  saved: boolean;
}

export const MERCHELLO_SHIPPING_WEIGHT_TIER_MODAL = new UmbModalToken<
  ShippingWeightTierModalData,
  ShippingWeightTierModalValue
>("Merchello.ShippingWeightTier.Modal", {
  modal: {
    type: "dialog",
    size: "small",
  },
});
