// Supplier list item DTO
export interface SupplierListItemDto {
  id: string;
  name: string;
  code?: string;
  warehouseCount: number;
}

// Update supplier DTO
export interface UpdateSupplierDto {
  name: string;
  code?: string;
}
