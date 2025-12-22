// Re-export TaxGroupDto from order types (already defined there for dropdowns)
export type { TaxGroupDto } from "@orders/types/order.types.js";

/** Request DTO for creating a new tax group */
export interface CreateTaxGroupDto {
  /** Tax group name (required) */
  name: string;
  /** Tax percentage rate (0-100) */
  taxPercentage: number;
}

/** Request DTO for updating an existing tax group */
export interface UpdateTaxGroupDto {
  /** Tax group name (required) */
  name: string;
  /** Tax percentage rate (0-100) */
  taxPercentage: number;
}

/** Request DTO for previewing tax calculation on a custom item */
export interface PreviewCustomItemTaxRequestDto {
  /** Unit price of the custom item */
  price: number;
  /** Quantity of items */
  quantity: number;
  /** Tax group ID (null for no tax) */
  taxGroupId: string | null;
}

/** Result DTO for custom item tax preview calculation */
export interface PreviewCustomItemTaxResultDto {
  /** Subtotal (price * quantity) */
  subtotal: number;
  /** Tax rate percentage applied */
  taxRate: number;
  /** Calculated tax amount */
  taxAmount: number;
  /** Total including tax */
  total: number;
}
