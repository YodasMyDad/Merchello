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
  clearSupplierId?: boolean;
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
