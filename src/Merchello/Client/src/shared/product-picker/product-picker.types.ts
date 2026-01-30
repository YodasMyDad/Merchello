// Product Picker Types
// Reusable product picker modal types for order editing and future property editors

import type { ProductVariantDto, VariantWarehouseStockDto, StockStatus } from "@products/types/product.types.js";
import { formatNumber } from "@shared/utils/formatting.js";

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

  /** Filter by product type ID (single) */
  productTypeId?: string;

  /** Filter by multiple product type IDs (for property editor restrictions) */
  productTypeIds?: string[];

  /** Filter by collection ID (single) */
  collectionId?: string;

  /** Filter by multiple collection IDs (for property editor restrictions) */
  collectionIds?: string[];

  /** Filter by filter value IDs - products must have these filter values assigned */
  filterValueIds?: string[];

  /**
   * Whether to show add-on selection step after variant selection.
   * When true, products with non-variant options will show add-on selection UI.
   * Default: true (for order creation), set to false for simple property editors.
   */
  showAddons?: boolean;

  /**
   * Whether to show product images in the picker.
   * Default: true. Set to false for a more compact/minimal picker.
   */
  showImages?: boolean;

  /**
   * Property editor mode - simplified selection flow.
   * When true:
   * - Skips shipping selection entirely
   * - Returns simplified selection (just variant ID, name, sku, imageUrl)
   * - Does not require warehouse/shipping configuration
   * Default: false
   */
  propertyEditorMode?: boolean;

  /**
   * Maximum number of items that can be selected.
   * Used in property editor mode to control multi-select behavior.
   * Default: Infinity (unlimited)
   */
  maxItems?: number;
}

/**
 * A selected add-on option value
 */
export interface SelectedAddon {
  /** Option ID */
  optionId: string;

  /** Option name (e.g., "Gift Wrap") */
  optionName: string;

  /** Selected value ID */
  valueId: string;

  /** Selected value name (e.g., "Premium") */
  valueName: string;

  /** Price adjustment to add to product price */
  priceAdjustment: number;

  /** Cost adjustment to add to product cost */
  costAdjustment: number;

  /** SKU suffix for line item */
  skuSuffix: string | null;
}

/**
 * An add-on option available for selection (IsVariant = false)
 */
export interface PickerAddonOption {
  /** Option ID */
  id: string;

  /** Option name */
  name: string;

  /** Option alias */
  alias: string | null;

  /** UI display type (dropdown, radio, etc.) */
  optionUiAlias: string | null;

  /** Available values */
  values: PickerAddonValue[];
}

/**
 * An add-on value that can be selected
 */
export interface PickerAddonValue {
  /** Value ID */
  id: string;

  /** Value name */
  name: string;

  /** Price adjustment */
  priceAdjustment: number;

  /** Cost adjustment */
  costAdjustment: number;

  /** SKU suffix */
  skuSuffix: string | null;
}

/**
 * Current view state for the picker modal
 */
export type PickerViewState = "product-selection" | "addon-selection" | "shipping-selection";

/**
 * Pending selection awaiting add-on configuration
 */
export interface PendingAddonSelection {
  /** The selected variant */
  variant: PickerVariant;

  /** Add-on options available for this product */
  addonOptions: PickerAddonOption[];

  /** Root product name for display */
  rootName: string;
}

/**
 * Pending selection awaiting shipping option configuration
 */
export interface PendingShippingSelection {
  /** The selected variant */
  variant: PickerVariant;

  /** Selected add-ons (empty if none selected) */
  addons: SelectedAddon[];

  /** Total price including variant base price and add-ons (calculated by backend) */
  totalPrice: number;

  /** Warehouse ID for shipping */
  warehouseId: string;

  /** Warehouse name for display */
  warehouseName: string;

  /** Whether shipping options are loading */
  isLoadingOptions: boolean;

  /** Available shipping options */
  shippingOptions: ShippingOptionForPicker[];
}

/**
 * Shipping option available for selection in the picker
 */
export interface ShippingOptionForPicker {
  /** Shipping option ID */
  id: string;

  /** Display name */
  name: string;

  /** Delivery time description (e.g., "2-3 business days") */
  deliveryTimeDescription: string;

  /** Estimated cost (null if requires checkout for rates) */
  estimatedCost: number | null;

  /** Whether cost is an estimate */
  isEstimate: boolean;

  /** Whether this is next-day delivery */
  isNextDay: boolean;
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

  /** The warehouse ID that will fulfill this product (optional in property editor mode) */
  warehouseId?: string;

  /** The warehouse name for display (optional in property editor mode) */
  warehouseName?: string;

  /** Selected add-on options (if any) */
  selectedAddons?: SelectedAddon[];

  /** Selected shipping option ID (optional in property editor mode) */
  shippingOptionId?: string;

  /** Selected shipping option name for display (optional in property editor mode) */
  shippingOptionName?: string;
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

  /** Total stock across all variants and warehouses (calculated when variants loaded) */
  totalStock: number;

  /** Stock status classification (calculated when variants loaded) */
  stockStatus: StockStatus;
  /** Display label for stock status (backend source of truth) */
  stockStatusLabel: string;
  /** CSS class for stock status badge (backend source of truth) */
  stockStatusCssClass: string;

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

  /** Stock status classification calculated by backend - use this instead of comparing availableStock to threshold locally */
  stockStatus: StockStatus;
  /** Display label for stock status (backend source of truth) */
  stockStatusLabel: string;
  /** CSS class for stock status badge (backend source of truth) */
  stockStatusCssClass: string;

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
 * Helper to format a price with currency symbol and thousand separators
 */
export function formatPrice(price: number, currencySymbol: string): string {
  return `${currencySymbol}${formatNumber(price, 2)}`;
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
