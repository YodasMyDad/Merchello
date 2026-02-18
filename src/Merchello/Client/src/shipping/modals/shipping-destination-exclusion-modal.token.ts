import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type {
  ShippingDestinationExclusionDto,
  CreateShippingDestinationExclusionDto,
} from "@shipping/types/shipping.types.js";

export interface ShippingDestinationExclusionModalData {
  exclusion?: ShippingDestinationExclusionDto;
  warehouseId?: string;
}

export interface ShippingDestinationExclusionModalValue {
  isSaved: boolean;
  exclusion?: CreateShippingDestinationExclusionDto;
}

export const MERCHELLO_SHIPPING_DESTINATION_EXCLUSION_MODAL = new UmbModalToken<
  ShippingDestinationExclusionModalData,
  ShippingDestinationExclusionModalValue
>("Merchello.ShippingDestinationExclusion.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
