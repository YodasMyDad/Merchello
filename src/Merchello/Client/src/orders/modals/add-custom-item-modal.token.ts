import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { AddCustomItemDto, TaxGroupDto } from "@orders/types/order.types.js";

export interface AddCustomItemModalData {
  /** Currency symbol for display */
  currencySymbol: string;
  /** Available tax groups for selection */
  taxGroups: TaxGroupDto[];
}

export interface AddCustomItemModalValue {
  /** The custom item to add, or undefined if cancelled */
  item?: AddCustomItemDto;
}

export const MERCHELLO_ADD_CUSTOM_ITEM_MODAL = new UmbModalToken<
  AddCustomItemModalData,
  AddCustomItemModalValue
>("Merchello.AddCustomItem.Modal", {
  modal: {
    type: "dialog",
    size: "small",
  },
});

