import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ProductVariantDto } from "@products/types/product.types.js";
import type { WarehouseDto } from "@shipping/types.js";

export interface VariantDetailModalData {
  productRootId: string;
  variant: ProductVariantDto;
  warehouses: WarehouseDto[];
}

export interface VariantDetailModalValue {
  saved: boolean;
  variant?: ProductVariantDto;
}

export const MERCHELLO_VARIANT_DETAIL_MODAL = new UmbModalToken<VariantDetailModalData, VariantDetailModalValue>(
  "Merchello.VariantDetail.Modal",
  {
    modal: {
      type: "sidebar",
      size: "large",
    },
  }
);

