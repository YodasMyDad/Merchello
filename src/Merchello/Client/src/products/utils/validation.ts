/**
 * Product validation utilities.
 * Pure functions for validating product root and variant data.
 */

import type { ProductRootDetailDto, ProductVariantDto } from "@products/types/product.types.js";

// ============================================
// Types
// ============================================

/** Result of a validation operation */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/** Options for product root validation */
export interface ProductRootValidationOptions {
  /** Whether the product is digital (skips warehouse validation) */
  isDigitalProduct?: boolean;
}

// ============================================
// Product Root Validation
// ============================================

/**
 * Validates product root form data.
 * @param data - Partial product root data to validate
 * @param options - Validation options
 * @returns Validation result with field-level errors
 */
export function validateProductRoot(
  data: Partial<ProductRootDetailDto>,
  options: ProductRootValidationOptions = {}
): ValidationResult {
  const errors: Record<string, string> = {};

  // Required: Product name
  if (!data.rootName?.trim()) {
    errors.rootName = "Product name is required";
  }

  // Required: Tax group
  if (!data.taxGroupId) {
    errors.taxGroupId = "Tax group is required";
  }

  // Required: Product type
  if (!data.productTypeId) {
    errors.productTypeId = "Product type is required";
  }

  // Required for physical products: At least one warehouse
  const isDigital = options.isDigitalProduct ?? data.isDigitalProduct ?? false;
  if (!isDigital && (!data.warehouseIds || data.warehouseIds.length === 0)) {
    errors.warehouseIds = "At least one warehouse is required for physical products";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================
// Variant Validation
// ============================================

/**
 * Validates product variant form data.
 * @param data - Partial variant data to validate
 * @returns Validation result with field-level errors
 */
export function validateVariant(data: Partial<ProductVariantDto>): ValidationResult {
  const errors: Record<string, string> = {};

  // Required: SKU
  if (!data.sku?.trim()) {
    errors.sku = "SKU is required";
  }

  // Price must be non-negative
  if ((data.price ?? 0) < 0) {
    errors.price = "Price must be 0 or greater";
  }

  // Cost of goods must be non-negative (if provided)
  if (data.costOfGoods !== undefined && data.costOfGoods < 0) {
    errors.costOfGoods = "Cost of goods must be 0 or greater";
  }

  // Previous price must be non-negative (if on sale)
  if (data.onSale && data.previousPrice !== undefined && data.previousPrice !== null && data.previousPrice < 0) {
    errors.previousPrice = "Previous price must be 0 or greater";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================
// Combined Validation
// ============================================

/**
 * Validates both product root and variant data for single-variant products.
 * @param productData - Product root form data
 * @param variantData - Variant form data
 * @param options - Validation options
 * @returns Combined validation result
 */
export function validateProductWithVariant(
  productData: Partial<ProductRootDetailDto>,
  variantData: Partial<ProductVariantDto>,
  options: ProductRootValidationOptions = {}
): { productResult: ValidationResult; variantResult: ValidationResult; isValid: boolean } {
  const productResult = validateProductRoot(productData, options);
  const variantResult = validateVariant(variantData);

  return {
    productResult,
    variantResult,
    isValid: productResult.isValid && variantResult.isValid,
  };
}

/**
 * Formats validation errors into a user-friendly message.
 * @param productErrors - Whether there are product-level errors
 * @param variantErrors - Whether there are variant-level errors
 * @returns Human-readable error message
 */
export function formatValidationErrorMessage(
  productErrors: boolean,
  variantErrors: boolean
): string | null {
  if (!productErrors && !variantErrors) {
    return null;
  }

  const errorTabs: string[] = [];
  if (productErrors) {
    errorTabs.push("Details");
  }
  if (variantErrors) {
    errorTabs.push("Basic Info");
  }

  return `Please fix the errors on the ${errorTabs.join(" and ")} tab${errorTabs.length > 1 ? "s" : ""} before saving`;
}
