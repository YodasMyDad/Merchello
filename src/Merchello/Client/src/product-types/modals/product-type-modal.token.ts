import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ProductTypeDto } from "../types.js";

export interface ProductTypeModalData {
  /** If provided, the modal will be in edit mode. Otherwise, it's in create mode. */
  productType?: ProductTypeDto;
}

export interface ProductTypeModalValue {
  /** The created or updated product type */
  productType?: ProductTypeDto;
  /** True if a new product type was created */
  created?: boolean;
  /** True if an existing product type was updated */
  updated?: boolean;
}

export const MERCHELLO_PRODUCT_TYPE_MODAL = new UmbModalToken<
  ProductTypeModalData,
  ProductTypeModalValue
>("Merchello.ProductType.Modal", {
  modal: {
    type: "sidebar",
    size: "small",
  },
});
