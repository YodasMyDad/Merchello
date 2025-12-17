// ============================================
// Customer Segment Types
// ============================================

/**
 * The type of customer segment.
 */
export type CustomerSegmentType = "Manual" | "Automated";

/**
 * How multiple criteria are combined when evaluating segment membership.
 */
export type SegmentMatchMode = "All" | "Any";

/**
 * Operators for comparing criterion values.
 */
export type SegmentCriteriaOperator =
  | "Equals"
  | "NotEquals"
  | "GreaterThan"
  | "GreaterThanOrEqual"
  | "LessThan"
  | "LessThanOrEqual"
  | "Between"
  | "Contains"
  | "NotContains"
  | "StartsWith"
  | "EndsWith"
  | "IsEmpty"
  | "IsNotEmpty";

/**
 * The data type of a criteria field value.
 */
export type CriteriaValueType = "Number" | "String" | "Date" | "Boolean" | "Currency";

// ============================================
// DTOs
// ============================================

/**
 * Criterion rule for automated segments.
 */
export interface SegmentCriteriaDto {
  field: string;
  operator: string;
  value: unknown;
  value2?: unknown;
}

/**
 * Customer segment data for list views.
 */
export interface CustomerSegmentListItemDto {
  id: string;
  name: string;
  description: string | null;
  segmentType: CustomerSegmentType;
  isActive: boolean;
  isSystemSegment: boolean;
  memberCount: number;
  dateCreated: string;
}

/**
 * Detailed customer segment data including criteria.
 */
export interface CustomerSegmentDetailDto extends CustomerSegmentListItemDto {
  criteria: SegmentCriteriaDto[] | null;
  matchMode: SegmentMatchMode;
  dateUpdated: string;
}

/**
 * Request DTO for creating a customer segment.
 */
export interface CreateCustomerSegmentDto {
  name: string;
  description?: string | null;
  segmentType: CustomerSegmentType;
  criteria?: SegmentCriteriaDto[] | null;
  matchMode?: SegmentMatchMode;
}

/**
 * Request DTO for updating a customer segment.
 */
export interface UpdateCustomerSegmentDto {
  name?: string | null;
  description?: string | null;
  criteria?: SegmentCriteriaDto[] | null;
  matchMode?: SegmentMatchMode | null;
  isActive?: boolean | null;
}

/**
 * Segment member with customer details.
 */
export interface SegmentMemberDto {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  dateAdded: string;
  notes: string | null;
}

/**
 * Paginated response for segment members.
 */
export interface SegmentMembersResponseDto {
  items: SegmentMemberDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Request DTO for adding members to a segment.
 */
export interface AddSegmentMembersDto {
  customerIds: string[];
  notes?: string | null;
}

/**
 * Request DTO for removing members from a segment.
 */
export interface RemoveSegmentMembersDto {
  customerIds: string[];
}

/**
 * Customer preview for segment matching.
 */
export interface CustomerPreviewDto {
  id: string;
  name: string;
  email: string;
  orderCount: number;
  totalSpend: number;
}

/**
 * Paginated response for customer previews.
 */
export interface CustomerPreviewResponseDto {
  items: CustomerPreviewDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Statistics for a customer segment.
 */
export interface SegmentStatisticsDto {
  totalMembers: number;
  activeMembers: number;
  totalRevenue: number;
  averageOrderValue: number;
}

/**
 * Metadata about an available criteria field.
 */
export interface CriteriaFieldMetadataDto {
  field: string;
  label: string;
  description: string;
  valueType: CriteriaValueType;
  supportedOperators: string[];
}

/**
 * Result of criteria validation.
 */
export interface CriteriaValidationResultDto {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Query parameters for customer search (for picker modal).
 */
export interface CustomerSearchParams {
  search: string;
  excludeIds?: string[];
  pageSize?: number;
}

/**
 * Minimal segment data for displaying as a badge in the UI.
 */
export interface CustomerSegmentBadgeDto {
  id: string;
  name: string;
  segmentType: CustomerSegmentType;
}
