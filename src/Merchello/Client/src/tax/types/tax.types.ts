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
