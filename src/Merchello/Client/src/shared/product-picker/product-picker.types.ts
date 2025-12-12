// Product Picker Types
// Reusable product picker modal types for order editing and future property editors

import type { ProductVariantDto, VariantWarehouseStockDto } from "@products/types/product.types.js";

/**
 * Configuration options for the product picker modal
 */
export interface ProductPickerConfig {
  /** Currency symbol for price display (e.g., "£", "$") */
  currencySymbol: string;

  /**
   * Shipping destination for warehouse region validation.
   * If provided, products that cannot ship to this region will be blocked.
   * If not provided, region validation is skipped.
   */
  shippingAddress?: {
    countryCode: string;
    stateCode?: string;
  } | null;

  /** Product IDs that are already selected (for property editor use) */
  currentSelections?: string[];

  /** Product IDs to exclude from the picker (e.g., already in order) */
  excludeProductIds?: string[];

  /** Filter by product type ID */
  productTypeId?: string;

  /** Filter by category ID */
  categoryId?: string;
}

/**
 * A product selection returned from the picker
 */
export interface ProductPickerSelection {
  /** Product (variant) ID */
  productId: string;

  /** Product Root ID */
  productRootId: string;

  /** Display name (variant name or root name) */
  name: string;

  /** SKU (may be null) */
  sku: string | null;

  /** Unit price */
  price: number;

  /** Image URL for display */
  imageUrl: string | null;

  /** The warehouse ID that will fulfill this product */
  warehouseId: string;

  /** The warehouse name for display */
  warehouseName: string;
}

/**
 * Product root displayed in the picker list (expandable)
 */
export interface PickerProductRoot {
  /** Product root ID */
  id: string;

  /** Root product name */
  rootName: string;

  /** Primary image URL */
  imageUrl: string | null;

  /** Number of variants */
  variantCount: number;

  /** Minimum price across variants */
  minPrice: number | null;

  /** Maximum price across variants */
  maxPrice: number | null;

  /** Total stock across all variants and warehouses */
  totalStock: number;

  /** Whether this is a digital product (no shipping) */
  isDigitalProduct: boolean;

  /** Whether the row is expanded to show variants */
  isExpanded: boolean;

  /** Whether variants have been loaded */
  variantsLoaded: boolean;

  /** Loaded variants (populated on expand) */
  variants: PickerVariant[];
}

/**
 * Individual variant for selection in the picker
 */
export interface PickerVariant {
  /** Variant ID */
  id: string;

  /** Product root ID */
  productRootId: string;

  /** Variant name (may be null for single-variant products) */
  name: string | null;

  /** Root name (fallback display) */
  rootName: string;

  /** SKU */
  sku: string | null;

  /** Price */
  price: number;

  /** Primary image URL */
  imageUrl: string | null;

  /** Display text for option values (e.g., "Red / Large") */
  optionValuesDisplay: string | null;

  /** Whether this variant can be selected */
  canSelect: boolean;

  /** Reason if cannot select */
  blockedReason: string | null;

  /** Calculated available stock (Stock - ReservedStock) */
  availableStock: number;

  /** Whether stock is tracked for this variant */
  trackStock: boolean;

  /** Whether variant can ship to destination (if address provided) */
  canShipToRegion: boolean;

  /** Region validation message */
  regionMessage: string | null;

  /** Fulfilling warehouse ID (first one that can serve) */
  fulfillingWarehouseId: string | null;

  /** Fulfilling warehouse name */
  fulfillingWarehouseName: string | null;

  /** Raw warehouse stock data */
  warehouseStock: VariantWarehouseStockDto[];
}

/**
 * Result of checking if a variant can be selected
 */
export interface VariantEligibility {
  canSelect: boolean;
  reason: string | null;
  warehouseId: string | null;
  warehouseName: string | null;
}

/**
 * Cached warehouse region data to reduce API calls
 */
export interface WarehouseRegionCache {
  /** Warehouse ID -> Set of country codes that can be served */
  destinations: Map<string, Set<string>>;

  /** Cache key (warehouseId:countryCode) -> Set of region codes (null = all regions allowed) */
  regions: Map<string, Set<string> | null>;
}

/**
 * Helper to format a price with currency symbol
 */
export function formatPrice(price: number, currencySymbol: string): string {
  return `${currencySymbol}${price.toFixed(2)}`;
}

/**
 * Helper to format a price range
 */
export function formatPriceRange(
  minPrice: number | null,
  maxPrice: number | null,
  currencySymbol: string
): string {
  if (minPrice === null && maxPrice === null) {
    return "N/A";
  }
  if (minPrice === maxPrice || maxPrice === null) {
    return formatPrice(minPrice ?? 0, currencySymbol);
  }
  if (minPrice === null) {
    return formatPrice(maxPrice, currencySymbol);
  }
  return `${formatPrice(minPrice, currencySymbol)} - ${formatPrice(maxPrice, currencySymbol)}`;
}

/**
 * Build display text for variant options (e.g., "Red / Large")
 */
export function buildOptionValuesDisplay(variant: ProductVariantDto): string | null {
  // The variant name typically contains the option values already
  // Return it if it's different from root name
  if (variant.name) {
    return variant.name;
  }
  return null;
}

/**
 * Get the first image URL for a variant, falling back to root images
 */
export function getVariantImageUrl(
  variant: ProductVariantDto,
  rootImages: string[]
): string | null {
  if (variant.images.length > 0 && !variant.excludeRootProductImages) {
    return variant.images[0];
  }
  if (!variant.excludeRootProductImages && rootImages.length > 0) {
    return rootImages[0];
  }
  if (variant.images.length > 0) {
    return variant.images[0];
  }
  return null;
}
