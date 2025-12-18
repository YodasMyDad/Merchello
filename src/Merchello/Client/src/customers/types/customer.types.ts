// Customer list item DTO
export interface CustomerListItemDto {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  memberKey: string | null;
  dateCreated: string;
  orderCount: number;
  tags: string[];
}

// Paginated response for customer list
export interface CustomerPageDto {
  items: CustomerListItemDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

// Query parameters for customer list
export interface CustomerListParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

// Update customer DTO
export interface UpdateCustomerDto {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  memberKey?: string | null;
  clearMemberKey?: boolean;
  tags?: string[];
}
