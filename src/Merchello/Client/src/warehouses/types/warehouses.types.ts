// Warehouse List DTO
export interface WarehouseListDto {
  id: string;
  name?: string;
  code?: string;
  supplierName?: string;
  supplierId?: string;
  serviceRegionCount: number;
  shippingOptionCount: number;
  addressSummary?: string;
  dateUpdated: string;
}

// Warehouse Detail DTO
export interface WarehouseDetailDto {
  id: string;
  name?: string;
  code?: string;
  supplierId?: string;
  supplierName?: string;
  address: WarehouseAddressDto;
  serviceRegions: ServiceRegionDto[];
  shippingOptionCount: number;
  dateCreated: string;
  dateUpdated: string;
}

// Address DTO
export interface WarehouseAddressDto {
  name?: string;
  company?: string;
  addressOne?: string;
  addressTwo?: string;
  townCity?: string;
  countyState?: string;
  countyStateCode?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
  email?: string;
  phone?: string;
}

// Service Region DTO
export interface ServiceRegionDto {
  id: string;
  countryCode: string;
  stateOrProvinceCode?: string;
  isExcluded: boolean;
  regionDisplay?: string;
}

// Create/Update DTOs
export interface CreateWarehouseDto {
  name: string;
  code?: string;
  supplierId?: string;
  address?: WarehouseAddressDto;
}

export interface UpdateWarehouseDto {
  name?: string;
  code?: string;
  supplierId?: string;
  shouldClearSupplierId?: boolean;
  address?: WarehouseAddressDto;
}

export interface CreateServiceRegionDto {
  countryCode: string;
  stateOrProvinceCode?: string;
  isExcluded: boolean;
}

// Supplier DTO (used when selecting supplier for warehouses)
export interface SupplierDto {
  id: string;
  name: string;
  code?: string;
}

// NOTE: CreateSupplierDto is now in @suppliers/types.ts

// Locality DTOs (from backend ILocalityCatalog)
export interface CountryInfo {
  code: string;
  name: string;
}

export interface SubdivisionInfo {
  countryCode: string;
  regionCode: string;
  name: string;
}

// Warehouse Shipping Options DTOs
export interface WarehouseShippingOptionsResultDto {
  canShipToDestination: boolean;
  message?: string | null;
  availableOptions: WarehouseShippingOptionDto[];
}

export interface WarehouseShippingOptionDto {
  id: string;
  name: string;
  providerKey: string;
  serviceType?: string | null;
  daysFrom: number;
  daysTo: number;
  isNextDay: boolean;
  estimatedCost?: number | null;
  isEstimate: boolean;
  deliveryTimeDescription: string;
}

// Product Fulfillment Options DTOs
export interface ProductFulfillmentOptionsDto {
  /** Whether this product can be added to the order - consolidated backend decision */
  canAddToOrder: boolean;
  /** The warehouse that can fulfill this product (null if none available) */
  fulfillingWarehouse: FulfillmentWarehouseDto | null;
  /** Reason why the product cannot be added (null if canAddToOrder is true) */
  blockedReason: string | null;
  /** Whether stock is tracked and available */
  hasAvailableStock: boolean;
  /** Total available stock across all eligible warehouses */
  availableStock: number;
  /**
   * Aggregate stock status across all warehouses (InStock/LowStock/OutOfStock/Untracked).
   * Calculated by backend - frontend should use this instead of deriving from warehouse data.
   */
  aggregateStockStatus: string;
}

export interface FulfillmentWarehouseDto {
  /** Warehouse ID */
  id: string;
  /** Warehouse display name */
  name: string;
  /** Available stock at this warehouse */
  availableStock: number;
}
