// Product types matching the API DTOs

export interface ProductListItemDto {
  id: string;
  productRootId: string;
  rootName: string;
  sku: string | null;
  price: number;
  minPrice: number | null;
  maxPrice: number | null;
  purchaseable: boolean;
  totalStock: number;
  variantCount: number;
  productTypeName: string;
  categoryNames: string[];
  imageUrl: string | null;
}

export interface ProductPageDto {
  items: ProductListItemDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ProductListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  productTypeId?: string;
  categoryId?: string;
  availability?: "all" | "available" | "unavailable";
  stockStatus?: "all" | "in-stock" | "low-stock" | "out-of-stock";
  sortBy?: string;
  sortDir?: string;
}

export interface ProductTypeDto {
  id: string;
  name: string;
  alias: string | null;
}

export interface ProductCategoryDto {
  id: string;
  name: string;
}

export type ProductColumnKey =
  | "select"
  | "rootName"
  | "sku"
  | "price"
  | "purchaseable"
  | "stock"
  | "variants";

export const PRODUCT_COLUMN_LABELS: Record<ProductColumnKey, string> = {
  select: "",
  rootName: "Product",
  sku: "SKU",
  price: "Price",
  purchaseable: "Available",
  stock: "Stock",
  variants: "Variants",
};

export const DEFAULT_PRODUCT_COLUMNS: ProductColumnKey[] = [
  "rootName",
  "sku",
  "price",
  "purchaseable",
  "stock",
  "variants",
];
