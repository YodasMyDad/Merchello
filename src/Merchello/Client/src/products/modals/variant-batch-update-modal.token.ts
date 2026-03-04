import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ProductVariantDto } from "@products/types/product.types.js";

export type VariantBatchEditableField =
  | "sku"
  | "gtin"
  | "supplierSku"
  | "hsCode"
  | "price"
  | "previousPrice"
  | "onSale"
  | "costOfGoods"
  | "availableForPurchase"
  | "canPurchase"
  | "trackStock";

export interface VariantBatchUpdateModalData {
  productRootId: string;
  variants: ProductVariantDto[];
}

export interface VariantBatchUpdateModalValue {
  isSaved: boolean;
  updatedCount: number;
}

export const MERCHELLO_VARIANT_BATCH_UPDATE_MODAL = new UmbModalToken<
  VariantBatchUpdateModalData,
  VariantBatchUpdateModalValue
>("Merchello.VariantBatchUpdate.Modal", {
  modal: {
    type: "dialog",
    size: "large",
  },
});

