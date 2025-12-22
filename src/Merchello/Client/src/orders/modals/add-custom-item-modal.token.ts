import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { AddCustomItemDto, TaxGroupDto } from "@orders/types/order.types.js";

export interface AddCustomItemModalData {
  /** Currency symbol for display */
  currencySymbol: string;
  /** Available tax groups for selection */
  taxGroups: TaxGroupDto[];
  /** Shipping destination for filtering shipping options */
  shippingDestination?: {
    countryCode: string;
    stateCode?: string;
  } | null;
}

export interface AddCustomItemModalValue {
  /** The custom item to add, or undefined if cancelled */
  item?: AddCustomItemDto & {
    /** Warehouse ID for physical products */
    warehouseId?: string;
    /** Warehouse name for display */
    warehouseName?: string;
    /** Shipping option ID for physical products */
    shippingOptionId?: string;
    /** Shipping option name for display */
    shippingOptionName?: string;
  };
}

export const MERCHELLO_ADD_CUSTOM_ITEM_MODAL = new UmbModalToken<
  AddCustomItemModalData,
  AddCustomItemModalValue
>("Merchello.AddCustomItem.Modal", {
  modal: {
    type: "dialog",
    size: "medium",
  },
});

