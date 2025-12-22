// Product types matching the API DTOs

// ============================================
// Stock Status Types
// ============================================

/**
 * Stock status classification for products and variants.
 * Calculated by the backend to ensure consistency - frontend should use this
 * instead of comparing stock against threshold locally.
 */
export type StockStatus = "InStock" | "LowStock" | "OutOfStock" | "Untracked";

// ============================================
// Rich Text Editor Value Types
// ============================================

/** Block layout item for RTE blocks */
export interface RteBlockLayoutItem {
  contentKey: string;
  settingsKey?: string;
}

/** Block data model */
export interface BlockDataModel {
  key: string;
  contentTypeKey: string;
  values: Array<{ alias: string; value: unknown }>;
}

/** Block expose model */
export interface BlockExposeModel {
  contentKey: string;
  culture: string | null;
  segment: string | null;
}

/** Rich text block value structure */
export interface RichTextBlockValue {
  layout: Record<string, RteBlockLayoutItem[]>;
  contentData: BlockDataModel[];
  settingsData: BlockDataModel[];
  expose: BlockExposeModel[];
}

/** Full rich text editor value as stored/sent to API */
export interface RichTextEditorValue {
  markup: string;
  blocks: RichTextBlockValue | null;
}

// ============================================
// Product DTOs
// ============================================

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
  /** Stock status classification calculated by backend - use this instead of comparing totalStock to threshold locally */
  stockStatus: StockStatus;
  variantCount: number;
  productTypeName: string;
  collectionNames: string[];
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
  collectionIds: string[];
  warehouseIds: string[];

  productOptions: ProductOptionDto[];
  variants: ProductVariantDto[];

  /** Available shipping options from assigned warehouses with exclusion status */
  availableShippingOptions: ShippingOptionExclusionDto[];

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
  /** Stock status classification calculated by backend - use this instead of comparing totalStock to threshold locally */
  stockStatus: StockStatus;
  warehouseStock: VariantWarehouseStockDto[];

  // Shipping exclusions
  shippingRestrictionMode: ShippingRestrictionMode;
  excludedShippingOptionIds: string[];
}

/** Shipping restriction mode enum */
export type ShippingRestrictionMode = 'None' | 'AllowList' | 'ExcludeList';

/** Shipping option with exclusion status for product editing UI */
export interface ShippingOptionExclusionDto {
  id: string;
  name?: string;
  warehouseName?: string;
  providerKey?: string;
  /** True when ALL variants have this option excluded */
  isExcluded: boolean;
  /** True when SOME (but not all) variants have this excluded - show indeterminate checkbox */
  isPartiallyExcluded: boolean;
  /** Number of variants that have this option excluded */
  excludedVariantCount: number;
  /** Total number of variants for this product */
  totalVariantCount: number;
}

/** Request to update shipping exclusions */
export interface UpdateShippingExclusionsDto {
  excludedShippingOptionIds: string[];
}

export interface VariantWarehouseStockDto {
  warehouseId: string;
  warehouseName: string | null;
  /** Total stock in this warehouse (raw value) */
  stock: number;
  /** Stock reserved for pending orders */
  reservedStock: number;
  /** Available stock for new orders (stock - reservedStock) - use this for display and validation */
  availableStock: number;
  reorderPoint: number | null;
  reorderQuantity: number | null;
  trackStock: boolean;
  /** Stock status classification calculated by backend - use this instead of comparing availableStock to threshold locally */
  stockStatus: StockStatus;
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
  collectionIds?: string[];
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
  googleShoppingFeedCategory?: string;
  isDigitalProduct?: boolean;
  taxGroupId?: string;
  productTypeId?: string;
  collectionIds?: string[];
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
  collectionId?: string;
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

export interface ProductCollectionDto {
  id: string;
  name: string;
  productCount: number;
}

export interface CreateProductCollectionDto {
  name: string;
}

export interface UpdateProductCollectionDto {
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
