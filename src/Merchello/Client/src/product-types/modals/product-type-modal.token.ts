import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ProductTypeDto } from '@product-types/types/product-types.types.js';

export interface ProductTypeModalData {
  /** If provided, the modal will be in edit mode. Otherwise, it's in create mode. */
  productType?: ProductTypeDto;
}

export interface ProductTypeModalValue {
  /** The created or updated product type */
  productType?: ProductTypeDto;
  /** True if a new product type was created */
  isCreated?: boolean;
  /** True if an existing product type was updated */
  isUpdated?: boolean;
}

export const MERCHELLO_PRODUCT_TYPE_MODAL = new UmbModalToken<
  ProductTypeModalData,
  ProductTypeModalValue
>("Merchello.ProductType.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
