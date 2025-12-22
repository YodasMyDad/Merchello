/**
 * Variant helper utilities.
 * Pure functions for variant-related calculations and formatting.
 */

import type { ProductVariantDto, ProductOptionDto, StockStatus } from "@products/types/product.types.js";

// ============================================
// Option Description Helpers
// ============================================

/**
 * Parses the variant's option key and returns a human-readable description
 * of the option value combination (e.g., "Red / Large / Cotton").
 *
 * The variantOptionsKey contains concatenated GUIDs of selected option values.
 * This function extracts those GUIDs and looks up the corresponding value names.
 *
 * @param variant - The product variant
 * @param options - All product options with their values
 * @returns Human-readable option description or null if no options
 */
export function getVariantOptionDescription(
  variant: ProductVariantDto,
  options: ProductOptionDto[]
): string | null {
  if (!variant.variantOptionsKey) {
    return null;
  }

  // GUIDs contain hyphens, so we can't simply split by '-'
  // Use regex to extract complete GUID patterns
  const guidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const guids = variant.variantOptionsKey.match(guidRegex) || [];
  const descriptions: string[] = [];

  for (const guid of guids) {
    for (const option of options) {
      const value = option.values.find((v) => v.id === guid);
      if (value) {
        descriptions.push(value.name);
        break;
      }
    }
  }

  return descriptions.length > 0 ? descriptions.join(" / ") : null;
}

// ============================================
// Variant Count Helpers
// ============================================

/**
 * Calculates the estimated number of variants that will be generated
 * from the given product options.
 *
 * Only options with isVariant=true participate in variant generation.
 * The total is the cartesian product of all variant option values.
 *
 * @param options - Product options
 * @returns Estimated variant count (0 if no variant options)
 */
export function calculateEstimatedVariantCount(options: ProductOptionDto[]): number {
  const variantOptions = options.filter((o) => o.isVariant);

  if (variantOptions.length === 0) {
    return 0;
  }

  return variantOptions.reduce((acc, opt) => acc * (opt.values.length || 1), 1);
}

/**
 * Checks if the product has only one variant (simple/single-variant product).
 * Single-variant products show merged tabs instead of the Variants tab.
 *
 * @param variants - Array of product variants
 * @returns True if the product has exactly one variant
 */
export function isSingleVariantProduct(variants: ProductVariantDto[]): boolean {
  return variants.length === 1;
}

// ============================================
// Stock Display Helpers
// ============================================

/**
 * Gets the appropriate CSS badge class for a stock status.
 * Uses backend-provided stockStatus for consistency.
 *
 * @param stockStatus - Stock status from backend
 * @returns CSS class name for the badge
 */
export function getStockStatusBadgeClass(stockStatus: StockStatus): string {
  switch (stockStatus) {
    case "OutOfStock":
      return "badge-danger";
    case "LowStock":
      return "badge-warning";
    case "InStock":
      return "badge-positive";
    case "Untracked":
    default:
      return "badge-default";
  }
}

/**
 * Checks if any variants have warnings (missing SKU or zero price).
 *
 * @param variants - Array of product variants
 * @returns True if any variant has warnings
 */
export function hasVariantWarnings(variants: ProductVariantDto[]): boolean {
  return variants.some((v) => !v.sku || v.price === 0);
}

/**
 * Checks if a product has options but no variant-generating options.
 * This indicates options were set but won't generate variants (add-ons only).
 *
 * @param variantCount - Number of product variants
 * @param optionCount - Number of product options
 * @returns True if there are multiple variants but no options
 */
export function hasOptionWarnings(variantCount: number, optionCount: number): boolean {
  return variantCount > 1 && optionCount === 0;
}

// ============================================
// URL Formatting Helpers
// ============================================

/**
 * Formats a URL as a breadcrumb string for Google Search preview.
 * Converts "https://example.com/products/blue-shirt" to "example.com › products › blue-shirt"
 *
 * @param url - Full URL to format
 * @returns Breadcrumb-formatted URL string
 */
export function formatUrlAsBreadcrumb(url: string): string {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/").filter((p) => p);

    if (pathParts.length === 0) {
      return parsed.hostname;
    }

    return `${parsed.hostname} › ${pathParts.join(" › ")}`;
  } catch {
    // Return original URL if parsing fails
    return url;
  }
}
