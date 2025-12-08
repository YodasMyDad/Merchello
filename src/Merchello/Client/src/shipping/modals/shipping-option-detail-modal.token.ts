import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ShippingOptionDto, WarehouseDto } from "@shipping/types.js";

export interface ShippingOptionDetailModalData {
  /** Existing option if editing, undefined if creating new */
  option?: ShippingOptionDto;
  /** Option ID to load (alternative to passing full option object) */
  optionId?: string;
  /** Available warehouses for dropdown (optional if warehouseId is provided) */
  warehouses?: WarehouseDto[];
  /** Pre-selected warehouse ID - when provided, warehouse dropdown is hidden */
  warehouseId?: string;
}

export interface ShippingOptionDetailModalValue {
  /** Whether the option was saved/updated */
  saved: boolean;
}

export const MERCHELLO_SHIPPING_OPTION_DETAIL_MODAL = new UmbModalToken<
  ShippingOptionDetailModalData,
  ShippingOptionDetailModalValue
>("Merchello.ShippingOption.Detail.Modal", {
  modal: {
    type: "sidebar",
    size: "large",
  },
});
