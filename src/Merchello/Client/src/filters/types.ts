/**
 * Filter Types for Merchello
 */

/** Data transfer object for a product filter group with its filters */
export interface ProductFilterGroupDto {
  id: string;
  name: string;
  sortOrder: number;
  filters: ProductFilterDto[];
}

/** Data transfer object for a product filter */
export interface ProductFilterDto {
  id: string;
  name: string;
  sortOrder: number;
  hexColour: string | null;
  image: string | null;
  filterGroupId: string;
  productCount: number;
}

/** DTO for creating a new filter group */
export interface CreateFilterGroupDto {
  name: string;
}

/** DTO for updating a filter group */
export interface UpdateFilterGroupDto {
  name?: string;
  sortOrder?: number;
}

/** DTO for creating a new filter within a group */
export interface CreateFilterDto {
  name: string;
  hexColour?: string;
  image?: string;
}

/** DTO for updating a filter */
export interface UpdateFilterDto {
  name?: string;
  hexColour?: string | null;
  image?: string | null;
  sortOrder?: number;
}

/** DTO for assigning filters to a product */
export interface AssignFiltersDto {
  filterIds: string[];
}
