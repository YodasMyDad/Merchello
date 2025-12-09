// Product types matching the API DTOs

export interface ProductDetailDto {
  id: string;
  productRootId: string;
  name: string;
  sku: string | null;
  price: number;
}

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
  hasWarehouse: boolean;
  hasShippingOptions: boolean;
  isDigitalProduct: boolean;
}

// Full product root for editing
export interface ProductRootDetailDto {
  id: string;
  rootName: string;
  rootImages: string[];
  rootUrl: string | null;
  sellingPoints: string[];
  videos: string[];
  googleShoppingFeedCategory: string | null;
  hsCode: string | null;
  isDigitalProduct: boolean;
  
  taxGroupId: string;
  taxGroupName: string | null;
  productTypeId: string;
  productTypeName: string | null;
  categoryIds: string[];
  warehouseIds: string[];
  
  productOptions: ProductOptionDto[];
  variants: ProductVariantDto[];
}

export interface ProductOptionDto {
  id: string;
  name: string;
  alias: string | null;
  sortOrder: number;
  optionTypeAlias: string | null;
  optionUiAlias: string | null;
  isVariant: boolean;
  values: ProductOptionValueDto[];
}

export interface ProductOptionValueDto {
  id: string;
  name: string;
  fullName: string | null;
  sortOrder: number;
  hexValue: string | null;
  mediaKey: string | null;
  priceAdjustment: number;
  costAdjustment: number;
  skuSuffix: string | null;
}

export interface ProductVariantDto {
  id: string;
  productRootId: string;
  default: boolean;
  name: string | null;
  sku: string | null;
  gtin: string | null;
  supplierSku: string | null;
  price: number;
  costOfGoods: number;
  onSale: boolean;
  previousPrice: number | null;
  availableForPurchase: boolean;
  canPurchase: boolean;
  images: string[];
  description: string | null;
  excludeRootProductImages: boolean;
  url: string | null;
  variantOptionsKey: string | null;
  
  // Dimensions
  weight: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  
  // SEO
  metaDescription: string | null;
  pageTitle: string | null;
  noIndex: boolean;
  openGraphImage: string | null;
  
  // Shopping Feed
  shoppingFeedTitle: string | null;
  shoppingFeedDescription: string | null;
  shoppingFeedColour: string | null;
  shoppingFeedMaterial: string | null;
  shoppingFeedSize: string | null;
  excludeFromCustomLabels: boolean;
  removeFromFeed: boolean;
  
  // Stock
  totalStock: number;
  warehouseStock: VariantWarehouseStockDto[];
}

export interface VariantWarehouseStockDto {
  warehouseId: string;
  warehouseName: string | null;
  stock: number;
  reorderPoint: number | null;
  reorderQuantity: number | null;
  trackStock: boolean;
}

export interface ProductOptionSettingsDto {
  optionTypeAliases: string[];
  optionUiAliases: string[];
}

// Request types
export interface CreateProductRootRequest {
  rootName: string;
  taxGroupId: string;
  productTypeId: string;
  categoryIds?: string[];
  warehouseIds?: string[];
  rootImages?: string[];
  isDigitalProduct: boolean;
  defaultVariant: CreateVariantRequest;
}

export interface CreateVariantRequest {
  name?: string;
  sku?: string;
  price: number;
  costOfGoods: number;
}

export interface UpdateProductRootRequest {
  rootName?: string;
  rootImages?: string[];
  rootUrl?: string;
  sellingPoints?: string[];
  videos?: string[];
  googleShoppingFeedCategory?: string;
  hsCode?: string;
  isDigitalProduct?: boolean;
  taxGroupId?: string;
  productTypeId?: string;
  categoryIds?: string[];
  warehouseIds?: string[];
}

export interface UpdateVariantRequest {
  default?: boolean;
  name?: string;
  sku?: string;
  gtin?: string;
  supplierSku?: string;
  price?: number;
  costOfGoods?: number;
  onSale?: boolean;
  previousPrice?: number;
  availableForPurchase?: boolean;
  canPurchase?: boolean;
  images?: string[];
  description?: string;
  excludeRootProductImages?: boolean;
  url?: string;
  weight?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  metaDescription?: string;
  pageTitle?: string;
  noIndex?: boolean;
  openGraphImage?: string;
  shoppingFeedTitle?: string;
  shoppingFeedDescription?: string;
  shoppingFeedColour?: string;
  shoppingFeedMaterial?: string;
  shoppingFeedSize?: string;
  excludeFromCustomLabels?: boolean;
  removeFromFeed?: boolean;
}

export interface SaveProductOptionRequest {
  id?: string;
  name: string;
  alias?: string;
  sortOrder: number;
  optionTypeAlias?: string;
  optionUiAlias?: string;
  isVariant: boolean;
  values: SaveOptionValueRequest[];
}

export interface SaveOptionValueRequest {
  id?: string;
  name: string;
  sortOrder: number;
  hexValue?: string;
  mediaKey?: string;
  priceAdjustment: number;
  costAdjustment: number;
  skuSuffix?: string;
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
  | "variants"
  | "warnings";

export const PRODUCT_COLUMN_LABELS: Record<ProductColumnKey, string> = {
  select: "",
  rootName: "Product",
  sku: "SKU",
  price: "Price",
  purchaseable: "Available",
  stock: "Stock",
  variants: "Variants",
  warnings: "",
};

export const DEFAULT_PRODUCT_COLUMNS: ProductColumnKey[] = [
  "rootName",
  "sku",
  "price",
  "purchaseable",
  "stock",
  "variants",
];
