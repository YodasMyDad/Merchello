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
  isFlagged: boolean;
  acceptsMarketing: boolean;
  /** Whether this customer can order on account with payment terms */
  hasAccountTerms: boolean;
  /** Payment terms in days (e.g., 30 for Net 30) */
  paymentTermsDays: number | null;
  /** Optional credit limit for the customer */
  creditLimit: number | null;
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
  isFlagged?: boolean;
  acceptsMarketing?: boolean;
  /** Whether this customer can order on account with payment terms */
  hasAccountTerms?: boolean;
  /** Payment terms in days (e.g., 30 for Net 30) */
  paymentTermsDays?: number | null;
  /** When true, clears the PaymentTermsDays */
  clearPaymentTermsDays?: boolean;
  /** Credit limit for the customer */
  creditLimit?: number | null;
  /** When true, clears the CreditLimit */
  clearCreditLimit?: boolean;
}
