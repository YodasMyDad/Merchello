import type { VariantBatchEditableField } from "@products/modals/variant-batch-update-modal.token.js";
import type { ProductVariantDto } from "@products/types/product.types.js";

export type SupportedVariantBatchBulkField = Exclude<VariantBatchEditableField, "trackStock">;

export interface ParseVariantBatchBulkValueResult {
  value?: string | number | boolean;
  error?: string;
}

export function isVariantBatchBulkFieldSupported(
  field: VariantBatchEditableField,
): field is SupportedVariantBatchBulkField {
  return field !== "trackStock";
}

export function parseVariantBatchBulkValue(
  field: SupportedVariantBatchBulkField,
  rawValue: string | boolean,
): ParseVariantBatchBulkValueResult {
  switch (field) {
    case "price":
      return parseNonNegativeNumber(rawValue, "Price");
    case "previousPrice":
      return parseNonNegativeNumber(rawValue, "Previous Price");
    case "costOfGoods":
      return parseNonNegativeNumber(rawValue, "Cost of goods");
    case "onSale":
      return parseBoolean(rawValue, "On Sale");
    case "availableForPurchase":
      return parseBoolean(rawValue, "Visible On Website");
    case "canPurchase":
      return parseBoolean(rawValue, "Allow Purchase");
    case "sku":
    case "gtin":
    case "supplierSku":
    case "hsCode":
      return { value: typeof rawValue === "string" ? rawValue : String(rawValue) };
    default:
      return {
        error: `Bulk apply is not supported for ${field}.`,
      };
  }
}

export function applyVariantBatchBulkValue(
  variants: ProductVariantDto[],
  field: SupportedVariantBatchBulkField,
  value: string | number | boolean,
): ProductVariantDto[] {
  switch (field) {
    case "sku":
      return variants.map((variant) => ({ ...variant, sku: String(value) }));
    case "gtin":
      return variants.map((variant) => ({ ...variant, gtin: String(value) }));
    case "supplierSku":
      return variants.map((variant) => ({ ...variant, supplierSku: String(value) }));
    case "hsCode":
      return variants.map((variant) => ({ ...variant, hsCode: String(value) }));
    case "price":
      return variants.map((variant) => ({ ...variant, price: Number(value) }));
    case "previousPrice":
      return variants.map((variant) => ({ ...variant, previousPrice: Number(value) }));
    case "costOfGoods":
      return variants.map((variant) => ({ ...variant, costOfGoods: Number(value) }));
    case "onSale":
      return variants.map((variant) => ({ ...variant, onSale: Boolean(value) }));
    case "availableForPurchase":
      return variants.map((variant) => ({ ...variant, availableForPurchase: Boolean(value) }));
    case "canPurchase":
      return variants.map((variant) => ({ ...variant, canPurchase: Boolean(value) }));
    default:
      return variants;
  }
}

function parseNonNegativeNumber(rawValue: string | boolean, fieldLabel: string): ParseVariantBatchBulkValueResult {
  const valueText = typeof rawValue === "string" ? rawValue.trim() : String(rawValue);
  const parsed = Number.parseFloat(valueText);

  if (!Number.isFinite(parsed)) {
    return { error: `${fieldLabel} must be a valid number.` };
  }

  if (parsed < 0) {
    return { error: `${fieldLabel} must be 0 or greater.` };
  }

  return { value: parsed };
}

function parseBoolean(rawValue: string | boolean, fieldLabel: string): ParseVariantBatchBulkValueResult {
  if (typeof rawValue === "boolean") {
    return { value: rawValue };
  }

  const normalizedValue = rawValue.trim().toLowerCase();
  if (normalizedValue === "true") {
    return { value: true };
  }

  if (normalizedValue === "false") {
    return { value: false };
  }

  return { error: `Select true or false for ${fieldLabel}.` };
}
