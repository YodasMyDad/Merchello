import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ShipmentDetailDto } from "../types/order.types.js";

export interface ShipmentEditModalData {
  shipment: ShipmentDetailDto;
}

export interface ShipmentEditModalValue {
  updated: boolean;
}

export const MERCHELLO_SHIPMENT_EDIT_MODAL = new UmbModalToken<
  ShipmentEditModalData,
  ShipmentEditModalValue
>("Merchello.ShipmentEdit.Modal", {
  modal: {
    type: "sidebar",
    size: "small",
  },
});
