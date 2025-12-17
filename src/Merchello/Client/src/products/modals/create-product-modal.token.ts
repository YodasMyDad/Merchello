import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface CreateProductModalData {}

export interface CreateProductModalValue {
  isCreated: boolean;
  productId?: string;
}

export const MERCHELLO_CREATE_PRODUCT_MODAL = new UmbModalToken<
  CreateProductModalData,
  CreateProductModalValue
>("Merchello.CreateProduct.Modal", {
  modal: {
    type: "sidebar",
    size: "large",
  },
});
