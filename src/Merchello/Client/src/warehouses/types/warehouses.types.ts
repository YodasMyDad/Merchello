import type { AddressDto } from "@shared/types/index.js";

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
  /** Optional fulfilment provider override for this warehouse */
  fulfilmentProviderConfigurationId?: string;
  /** Display name of the fulfilment provider override (if set) */
  fulfilmentProviderName?: string;
  address: AddressDto;
  serviceRegions: ServiceRegionDto[];
  shippingOptionCount: number;
  dateCreated: string;
  dateUpdated: string;
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
  /** Optional fulfilment provider override for this warehouse */
  fulfilmentProviderConfigurationId?: string;
  address?: AddressDto;
}

export interface UpdateWarehouseDto {
  name?: string;
  code?: string;
  supplierId?: string;
  shouldClearSupplierId?: boolean;
  /** Optional fulfilment provider override for this warehouse */
  fulfilmentProviderConfigurationId?: string;
  /** If true, clears the fulfilment provider override */
  shouldClearFulfilmentProviderId?: boolean;
  address?: AddressDto;
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
