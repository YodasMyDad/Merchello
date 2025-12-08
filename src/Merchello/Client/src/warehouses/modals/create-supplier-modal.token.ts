import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { SupplierDto } from "@warehouses/types.js";

export interface CreateSupplierModalData {
  // No data needed for create
}

export interface CreateSupplierModalValue {
  supplier?: SupplierDto;
}

export const MERCHELLO_CREATE_SUPPLIER_MODAL = new UmbModalToken<
  CreateSupplierModalData,
  CreateSupplierModalValue
>("Merchello.CreateSupplier.Modal", {
  modal: {
    type: "sidebar",
    size: "small",
  },
});
