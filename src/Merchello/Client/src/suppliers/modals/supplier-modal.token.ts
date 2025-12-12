import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { SupplierListItemDto } from "../types.js";

export interface SupplierModalData {
  /** If provided, the modal will be in edit mode. Otherwise, it's in create mode. */
  supplier?: SupplierListItemDto;
}

export interface SupplierModalValue {
  /** The created or updated supplier */
  supplier?: SupplierListItemDto;
  /** True if a new supplier was created */
  created?: boolean;
  /** True if an existing supplier was updated */
  updated?: boolean;
}

export const MERCHELLO_SUPPLIER_MODAL = new UmbModalToken<
  SupplierModalData,
  SupplierModalValue
>("Merchello.Supplier.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});

