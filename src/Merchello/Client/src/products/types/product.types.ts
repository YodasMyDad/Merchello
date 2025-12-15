// Product types matching the API DTOs

/** Product view information returned by the views endpoint */
export interface ProductViewDto {
  alias: string;
  virtualPath: string;
}

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
export interface ProductPackageDto {
  weight: number;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
}

export interface ProductRootDetailDto {
  id: string;
  rootName: string;
  rootImages: string[];
  rootUrl: string | null;
  sellingPoints: string[];
  videos: string[];
  googleShoppingFeedCategory: string | null;
  isDigitalProduct: boolean;
  defaultPackageConfigurations: ProductPackageDto[];

  description: string | null;

  // SEO
  metaDescription: string | null;
  pageTitle: string | null;
  noIndex: boolean;
  openGraphImage: string | null;
  canonicalUrl: string | null;

  taxGroupId: string;
  taxGroupName: string | null;
  productTypeId: string;
  productTypeName: string | null;
  categoryIds: string[];
  warehouseIds: string[];

  productOptions: ProductOptionDto[];
  variants: ProductVariantDto[];

  /** Element Type property values as { propertyAlias: value } */
  elementProperties?: Record<string, unknown>;

  /** The view alias used to render this product (e.g., "Gallery" -> ~/Views/Products/Gallery.cshtml) */
  viewAlias?: string | null;
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
  excludeRootProductImages: boolean;
  url: string | null;
  variantOptionsKey: string | null;

  // HS Code for customs/tariff classification
  hsCode: string | null;

  // Package configurations (inherits from root if empty)
  packageConfigurations: ProductPackageDto[];

  // Shopping Feed
  shoppingFeedTitle: string | null;
  shoppingFeedDescription: string | null;
  shoppingFeedColour: string | null;
  shoppingFeedMaterial: string | null;
  shoppingFeedSize: string | null;
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
  maxProductOptions: number;
  maxOptionValuesPerOption: number;
}

export interface DescriptionEditorSettingsDto {
  dataTypeKey: string | null;
  propertyEditorUiAlias: string;
}

// Request types
export interface CreateProductRootDto {
  rootName: string;
  taxGroupId: string;
  productTypeId: string;
  categoryIds?: string[];
  warehouseIds?: string[];
  rootImages?: string[];
  isDigitalProduct: boolean;
  defaultVariant: CreateVariantDto;
}

export interface CreateVariantDto {
  name?: string;
  sku?: string;
  price: number;
  costOfGoods: number;
}

export interface UpdateProductRootDto {
  rootName?: string;
  rootImages?: string[];
  rootUrl?: string;
  sellingPoints?: string[];
  videos?: string[];
  googleShoppingFeedCategory?: string;
  isDigitalProduct?: boolean;
  taxGroupId?: string;
  productTypeId?: string;
  categoryIds?: string[];
  warehouseIds?: string[];
  description?: string;
  metaDescription?: string;
  pageTitle?: string;
  noIndex?: boolean;
  openGraphImage?: string;
  canonicalUrl?: string;
  defaultPackageConfigurations?: ProductPackageDto[];
  /** Element Type property values as { propertyAlias: value } */
  elementProperties?: Record<string, unknown>;
  /** The view alias used to render this product (e.g., "Gallery" -> ~/Views/Products/Gallery.cshtml) */
  viewAlias?: string | null;
}

export interface UpdateVariantDto {
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
  excludeRootProductImages?: boolean;
  url?: string;
  hsCode?: string;
  packageConfigurations?: ProductPackageDto[];
  shoppingFeedTitle?: string;
  shoppingFeedDescription?: string;
  shoppingFeedColour?: string;
  shoppingFeedMaterial?: string;
  shoppingFeedSize?: string;
  removeFromFeed?: boolean;
  warehouseStock?: UpdateWarehouseStockDto[];
}

export interface UpdateWarehouseStockDto {
  warehouseId: string;
  stock?: number;
  reorderPoint?: number | null;
  trackStock?: boolean;
}

export interface SaveProductOptionDto {
  id?: string;
  name: string;
  alias?: string;
  sortOrder: number;
  optionTypeAlias?: string;
  optionUiAlias?: string;
  isVariant: boolean;
  values: SaveOptionValueDto[];
}

export interface SaveOptionValueDto {
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

// ============================================
// Product Table Event Types
// ============================================

/** Event detail for product click */
export interface ProductClickEventDetail {
  productId: string;
  product: ProductListItemDto;
}

/** Event detail for selection change */
export interface ProductSelectionChangeEventDetail {
  selectedIds: string[];
}
