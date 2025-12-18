// Discount types matching the API DTOs

// ============================================
// Enums
// ============================================

/** Discount status enum */
export enum DiscountStatus {
  Draft = 0,
  Active = 1,
  Scheduled = 2,
  Expired = 3,
  Disabled = 4,
}

/** Discount category enum - must match C# DiscountCategory */
export enum DiscountCategory {
  AmountOffProducts = 0,
  BuyXGetY = 1,
  AmountOffOrder = 2,
  FreeShipping = 3,
}

/** Discount method enum */
export enum DiscountMethod {
  Code = 0,
  Automatic = 1,
}

/** Discount value type enum */
export enum DiscountValueType {
  FixedAmount = 0,
  Percentage = 1,
  Free = 2,
}

/** Discount requirement type enum */
export enum DiscountRequirementType {
  None = 0,
  MinimumPurchaseAmount = 1,
  MinimumQuantity = 2,
}

/** Discount target type enum - must match C# DiscountTargetType */
export enum DiscountTargetType {
  AllProducts = 0,
  SpecificProducts = 1,
  Categories = 2,
  ProductFilters = 3,
  ProductTypes = 4,
  Suppliers = 5,
  Warehouses = 6,
}

/** Discount eligibility type enum - must match C# DiscountEligibilityType */
export enum DiscountEligibilityType {
  AllCustomers = 0,
  CustomerSegments = 1,
  SpecificCustomers = 2,
}

/** Buy X trigger type enum - must match C# BuyXTriggerType */
export enum BuyXTriggerType {
  MinimumQuantity = 0,
  MinimumPurchaseAmount = 1,
}

/** Buy X Get Y selection method enum - must match C# BuyXGetYSelectionMethod */
export enum BuyXGetYSelectionMethod {
  Cheapest = 0,
  MostExpensive = 1,
}

/** Free shipping country scope enum - must match C# FreeShippingCountryScope */
export enum FreeShippingCountryScope {
  AllCountries = 0,
  SelectedCountries = 1,
  ExcludedCountries = 2,
}

// ============================================
// List Item DTO
// ============================================

/** Discount list item DTO */
export interface DiscountListItemDto {
  id: string;
  name: string;
  description?: string | null;
  code?: string | null;
  status: DiscountStatus;
  category: DiscountCategory;
  method: DiscountMethod;
  valueType: DiscountValueType;
  value: number;
  startsAt: string;
  endsAt?: string | null;
  currentUsageCount: number;
  totalUsageLimit?: number | null;
  canCombineWithProductDiscounts: boolean;
  canCombineWithOrderDiscounts: boolean;
  canCombineWithShippingDiscounts: boolean;
  dateCreated: string;
}

// ============================================
// Detail DTO
// ============================================

/** Discount detail DTO */
export interface DiscountDetailDto {
  id: string;
  name: string;
  description?: string | null;
  status: DiscountStatus;
  category: DiscountCategory;
  method: DiscountMethod;
  code?: string | null;
  valueType: DiscountValueType;
  value: number;
  startsAt: string;
  endsAt?: string | null;
  timezone?: string | null;
  totalUsageLimit?: number | null;
  perCustomerUsageLimit?: number | null;
  perOrderUsageLimit?: number | null;
  currentUsageCount: number;
  requirementType: DiscountRequirementType;
  requirementValue?: number | null;
  canCombineWithProductDiscounts: boolean;
  canCombineWithOrderDiscounts: boolean;
  canCombineWithShippingDiscounts: boolean;
  priority: number;
  dateCreated: string;
  dateUpdated: string;
  createdBy?: string | null;
  targetRules: DiscountTargetRuleDto[];
  eligibilityRules: DiscountEligibilityRuleDto[];
  buyXGetYConfig?: DiscountBuyXGetYConfigDto | null;
  freeShippingConfig?: DiscountFreeShippingConfigDto | null;
}

/** Discount target rule DTO */
export interface DiscountTargetRuleDto {
  id: string;
  targetType: DiscountTargetType;
  targetIds?: string[] | null;
  targetNames?: string[] | null;
  isExclusion: boolean;
}

/** Discount eligibility rule DTO */
export interface DiscountEligibilityRuleDto {
  id: string;
  eligibilityType: DiscountEligibilityType;
  eligibilityIds?: string[] | null;
  eligibilityNames?: string[] | null;
}

/** Buy X Get Y configuration DTO */
export interface DiscountBuyXGetYConfigDto {
  buyTriggerType: BuyXTriggerType;
  buyTriggerValue: number;
  buyTargetType: DiscountTargetType;
  buyTargetIds?: string[] | null;
  buyTargetNames?: string[] | null;
  getQuantity: number;
  getTargetType: DiscountTargetType;
  getTargetIds?: string[] | null;
  getTargetNames?: string[] | null;
  getValueType: DiscountValueType;
  getValue: number;
  selectionMethod: BuyXGetYSelectionMethod;
}

/** Free shipping configuration DTO */
export interface DiscountFreeShippingConfigDto {
  countryScope: FreeShippingCountryScope;
  countryCodes?: string[] | null;
  excludeRatesOverAmount: boolean;
  excludeRatesOverValue?: number | null;
  allowedShippingOptionIds?: string[] | null;
}

// ============================================
// Create/Update DTOs
// ============================================

/** Create discount target rule DTO */
export interface CreateDiscountTargetRuleDto {
  targetType: DiscountTargetType;
  targetIds?: string[] | null;
  isExclusion: boolean;
}

/** Create discount eligibility rule DTO */
export interface CreateDiscountEligibilityRuleDto {
  eligibilityType: DiscountEligibilityType;
  eligibilityIds?: string[] | null;
}

/** Create discount request DTO */
export interface CreateDiscountDto {
  name: string;
  description?: string | null;
  category: DiscountCategory;
  method: DiscountMethod;
  code?: string | null;
  valueType: DiscountValueType;
  value: number;
  startsAt: string;
  endsAt?: string | null;
  timezone?: string | null;
  totalUsageLimit?: number | null;
  perCustomerUsageLimit?: number | null;
  perOrderUsageLimit?: number | null;
  requirementType: DiscountRequirementType;
  requirementValue?: number | null;
  canCombineWithProductDiscounts: boolean;
  canCombineWithOrderDiscounts: boolean;
  canCombineWithShippingDiscounts: boolean;
  priority?: number;
  targetRules?: CreateDiscountTargetRuleDto[];
  eligibilityRules?: CreateDiscountEligibilityRuleDto[];
}

/** Update discount request DTO */
export interface UpdateDiscountDto extends CreateDiscountDto {
  id: string;
}

// ============================================
// Query & Pagination
// ============================================

/** Discount query parameters */
export interface DiscountQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: DiscountStatus | null;
  category?: DiscountCategory | null;
  method?: DiscountMethod | null;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

/** Paginated discount list response */
export interface DiscountPageDto {
  items: DiscountListItemDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

// ============================================
// Helper Types
// ============================================

/** Discount category info for UI */
export interface DiscountCategoryInfo {
  category: DiscountCategory;
  label: string;
  description: string;
  icon: string;
}

/** Available discount categories with metadata - order matches C# enum values */
export const DISCOUNT_CATEGORIES: DiscountCategoryInfo[] = [
  {
    category: DiscountCategory.AmountOffProducts,
    label: "Amount off products",
    description: "Discount specific products or categories",
    icon: "icon-tags",
  },
  {
    category: DiscountCategory.BuyXGetY,
    label: "Buy X get Y",
    description: "Buy a set of products and get others discounted",
    icon: "icon-gift",
  },
  {
    category: DiscountCategory.AmountOffOrder,
    label: "Amount off order",
    description: "Discount the entire order total",
    icon: "icon-receipt-dollar",
  },
  {
    category: DiscountCategory.FreeShipping,
    label: "Free shipping",
    description: "Offer free shipping on qualifying orders",
    icon: "icon-truck",
  },
];

/** Status display labels */
export const DISCOUNT_STATUS_LABELS: Record<DiscountStatus, string> = {
  [DiscountStatus.Draft]: "Draft",
  [DiscountStatus.Active]: "Active",
  [DiscountStatus.Scheduled]: "Scheduled",
  [DiscountStatus.Expired]: "Expired",
  [DiscountStatus.Disabled]: "Disabled",
};

/** Status colors for badges */
export const DISCOUNT_STATUS_COLORS: Record<DiscountStatus, "default" | "positive" | "warning" | "danger"> = {
  [DiscountStatus.Draft]: "default",
  [DiscountStatus.Active]: "positive",
  [DiscountStatus.Scheduled]: "warning",
  [DiscountStatus.Expired]: "danger",
  [DiscountStatus.Disabled]: "default",
};

/** Entity types for workspace routing */
export const MERCHELLO_DISCOUNTS_ENTITY_TYPE = "merchello-discounts";
export const MERCHELLO_DISCOUNT_ENTITY_TYPE = "merchello-discount";

// ============================================
// Performance / Reporting Types
// ============================================

/** Usage data for a single date (for charts) */
export interface UsageByDateDto {
  date: string;
  usageCount: number;
  discountAmount: number;
}

/** Performance metrics for a discount */
export interface DiscountPerformanceDto {
  discountId: string;
  name: string;
  code?: string | null;
  totalUsageCount: number;
  uniqueCustomersCount: number;
  remainingUses?: number | null;
  totalDiscountAmount: number;
  averageDiscountPerUse: number;
  totalOrderRevenue: number;
  averageOrderValue: number;
  firstUsed?: string | null;
  lastUsed?: string | null;
  usageByDate: UsageByDateDto[];
}
