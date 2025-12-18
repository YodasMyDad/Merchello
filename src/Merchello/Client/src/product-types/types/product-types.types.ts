// Re-export ProductTypeDto from products for convenience
export type { ProductTypeDto } from "@products/types/product.types.js";

export interface CreateProductTypeDto {
  name: string;
}

export interface UpdateProductTypeDto {
  name: string;
}
