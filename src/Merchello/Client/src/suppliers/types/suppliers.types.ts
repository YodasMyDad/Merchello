// Supplier list item DTO
export interface SupplierListItemDto {
  id: string;
  name: string;
  code?: string;
  warehouseCount: number;
  /** The default fulfilment provider configuration ID for this supplier */
  fulfilmentProviderConfigurationId?: string;
  /** Display name of the fulfilment provider (if set) */
  fulfilmentProviderName?: string;
}

// Create supplier DTO
export interface CreateSupplierDto {
  name: string;
  code?: string;
  /** The default fulfilment provider configuration ID for this supplier */
  fulfilmentProviderConfigurationId?: string;
}

// Update supplier DTO
export interface UpdateSupplierDto {
  name: string;
  code?: string;
  /** The default fulfilment provider configuration ID for this supplier */
  fulfilmentProviderConfigurationId?: string;
}
