import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { SupplierListItemDto } from "../types.js";

export interface EditSupplierModalData {
  supplier: SupplierListItemDto;
}

export interface EditSupplierModalValue {
  updated: boolean;
}

export const MERCHELLO_EDIT_SUPPLIER_MODAL = new UmbModalToken<
  EditSupplierModalData,
  EditSupplierModalValue
>("Merchello.EditSupplier.Modal", {
  modal: {
    type: "sidebar",
    size: "small",
  },
});
