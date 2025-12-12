// Supplier list item DTO
export interface SupplierListItemDto {
  id: string;
  name: string;
  code?: string;
  warehouseCount: number;
}

// Create supplier DTO
export interface CreateSupplierDto {
  name: string;
  code?: string;
}

// Update supplier DTO
export interface UpdateSupplierDto {
  name: string;
  code?: string;
}
