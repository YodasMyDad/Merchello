// Discount types matching the API DTOs
// All enums use string values to match C# JsonStringEnumConverter serialization

// ============================================
// Enums
// ============================================

/** Discount status enum */
export enum DiscountStatus {
  Draft = "Draft",
  Active = "Active",
  Scheduled = "Scheduled",
  Expired = "Expired",
  Disabled = "Disabled",
}

/** Discount category enum */
export enum DiscountCategory {
  AmountOffProducts = "AmountOffProducts",
  BuyXGetY = "BuyXGetY",
  AmountOffOrder = "AmountOffOrder",
  FreeShipping = "FreeShipping",
}

/** Discount method enum */
export enum DiscountMethod {
  Code = "Code",
  Automatic = "Automatic",
}

/** Discount value type enum */
export enum DiscountValueType {
  FixedAmount = "FixedAmount",
  Percentage = "Percentage",
  Free = "Free",
}

/** Discount requirement type enum */
export enum DiscountRequirementType {
  None = "None",
  MinimumPurchaseAmount = "MinimumPurchaseAmount",
  MinimumQuantity = "MinimumQuantity",
}

/** Discount target type enum */
export enum DiscountTargetType {
  AllProducts = "AllProducts",
  SpecificProducts = "SpecificProducts",
  Collections = "Collections",
  ProductFilters = "ProductFilters",
  ProductTypes = "ProductTypes",
  Suppliers = "Suppliers",
  Warehouses = "Warehouses",
}

/** Discount eligibility type enum */
export enum DiscountEligibilityType {
  AllCustomers = "AllCustomers",
  CustomerSegments = "CustomerSegments",
  SpecificCustomers = "SpecificCustomers",
}

/** Buy X trigger type enum */
export enum BuyXTriggerType {
  MinimumQuantity = "MinimumQuantity",
  MinimumPurchaseAmount = "MinimumPurchaseAmount",
}

/** Buy X Get Y selection method enum */
export enum BuyXGetYSelectionMethod {
  Cheapest = "Cheapest",
  MostExpensive = "MostExpensive",
}

/** Free shipping country scope enum */
export enum FreeShippingCountryScope {
  AllCountries = "AllCountries",
  SelectedCountries = "SelectedCountries",
  ExcludedCountries = "ExcludedCountries",
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
  statusLabel: string;
  statusColor: string;
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
  applyAfterTax: boolean;
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
  statusLabel: string;
  statusColor: string;
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
  applyAfterTax: boolean;
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
  targetType: DiscountTargetType;
  targetIds?: string[] | null;
  targetNames?: string[] | null;
  isExclusion: boolean;
}

/** Discount eligibility rule DTO */
export interface DiscountEligibilityRuleDto {
  eligibilityType: DiscountEligibilityType;
  eligibilityIds?: string[] | null;
  eligibilityNames?: string[] | null;
}

/** Local edit type for target rules with id for state management */
export interface DiscountTargetRuleEdit extends DiscountTargetRuleDto {
  id: string;
}

/** Local edit type for eligibility rules with id for state management */
export interface DiscountEligibilityRuleEdit extends DiscountEligibilityRuleDto {
  id: string;
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
  applyAfterTax: boolean;
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
    description: "Discount specific products or collections",
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


/** Entity types for workspace routing */
export const MERCHELLO_DISCOUNTS_ENTITY_TYPE = "merchello-discounts";

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
