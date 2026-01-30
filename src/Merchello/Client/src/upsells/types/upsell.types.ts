// Upsell types matching the API DTOs
// All enums use string values to match C# JsonStringEnumConverter serialization

// ============================================
// Enums
// ============================================

export enum UpsellStatus {
  Draft = "Draft",
  Active = "Active",
  Scheduled = "Scheduled",
  Expired = "Expired",
  Disabled = "Disabled",
}

export enum UpsellSortBy {
  BestSeller = "BestSeller",
  PriceLowToHigh = "PriceLowToHigh",
  PriceHighToLow = "PriceHighToLow",
  Name = "Name",
  DateAdded = "DateAdded",
  Random = "Random",
}

// Flags enum - numeric values for bitwise operations
export const UpsellDisplayLocation = {
  None: 0,
  Checkout: 1,
  Basket: 2,
  ProductPage: 4,
  Email: 8,
  Confirmation: 16,
  All: 31,
} as const;

export enum CheckoutUpsellMode {
  Inline = "Inline",
  Interstitial = "Interstitial",
  OrderBump = "OrderBump",
  PostPurchase = "PostPurchase",
}

export enum UpsellTriggerType {
  ProductTypes = "ProductTypes",
  ProductFilters = "ProductFilters",
  Collections = "Collections",
  SpecificProducts = "SpecificProducts",
  Suppliers = "Suppliers",
  MinimumCartValue = "MinimumCartValue",
  MaximumCartValue = "MaximumCartValue",
  CartValueBetween = "CartValueBetween",
}

export enum UpsellRecommendationType {
  ProductTypes = "ProductTypes",
  ProductFilters = "ProductFilters",
  Collections = "Collections",
  SpecificProducts = "SpecificProducts",
  Suppliers = "Suppliers",
}

export enum UpsellEligibilityType {
  AllCustomers = "AllCustomers",
  CustomerSegments = "CustomerSegments",
  SpecificCustomers = "SpecificCustomers",
}

export enum UpsellEventType {
  Impression = "Impression",
  Click = "Click",
  Conversion = "Conversion",
}

export enum UpsellOrderBy {
  Name = "Name",
  DateCreated = "DateCreated",
  Priority = "Priority",
  Status = "Status",
}

// ============================================
// Query Parameters
// ============================================

export interface UpsellQueryParams {
  status?: UpsellStatus;
  search?: string;
  displayLocation?: number;
  page?: number;
  pageSize?: number;
  orderBy?: UpsellOrderBy;
  descending?: boolean;
}

// ============================================
// DTOs
// ============================================

export interface UpsellPageDto {
  pageIndex: number;
  totalPages: number;
  totalItems: number;
  items: UpsellListItemDto[];
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface UpsellListItemDto {
  id: string;
  name: string;
  heading: string;
  status: UpsellStatus;
  statusLabel: string;
  statusColor: string;
  priority: number;
  displayLocation: number;
  checkoutMode: CheckoutUpsellMode;
  triggerRuleCount: number;
  recommendationRuleCount: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  clickThroughRate: number;
  conversionRate: number;
  dateCreated: string;
}

export interface UpsellDetailDto {
  id: string;
  name: string;
  description?: string;
  status: UpsellStatus;
  statusLabel: string;
  statusColor: string;
  heading: string;
  message?: string;
  priority: number;
  maxProducts: number;
  sortBy: UpsellSortBy;
  suppressIfInCart: boolean;
  displayLocation: number;
  checkoutMode: CheckoutUpsellMode;
  startsAt: string;
  endsAt?: string;
  timezone?: string;
  dateCreated: string;
  dateUpdated: string;
  triggerRules: UpsellTriggerRuleDto[];
  recommendationRules: UpsellRecommendationRuleDto[];
  eligibilityRules: UpsellEligibilityRuleDto[];
}

export interface UpsellTriggerRuleDto {
  triggerType: UpsellTriggerType;
  triggerIds?: string[];
  triggerNames?: string[];
  extractFilterIds?: string[];
  extractFilterNames?: string[];
}

export interface UpsellRecommendationRuleDto {
  recommendationType: UpsellRecommendationType;
  recommendationIds?: string[];
  recommendationNames?: string[];
  matchTriggerFilters: boolean;
  matchFilterIds?: string[];
  matchFilterNames?: string[];
}

export interface UpsellEligibilityRuleDto {
  eligibilityType: UpsellEligibilityType;
  eligibilityIds?: string[];
  eligibilityNames?: string[];
}

export interface CreateUpsellDto {
  name: string;
  description?: string;
  heading: string;
  message?: string;
  priority?: number;
  maxProducts?: number;
  sortBy?: UpsellSortBy;
  suppressIfInCart?: boolean;
  displayLocation: number;
  checkoutMode?: CheckoutUpsellMode;
  startsAt?: string;
  endsAt?: string;
  timezone?: string;
  triggerRules?: CreateUpsellTriggerRuleDto[];
  recommendationRules?: CreateUpsellRecommendationRuleDto[];
  eligibilityRules?: CreateUpsellEligibilityRuleDto[];
}

export interface UpdateUpsellDto {
  name?: string;
  description?: string;
  heading?: string;
  message?: string;
  priority?: number;
  maxProducts?: number;
  sortBy?: UpsellSortBy;
  suppressIfInCart?: boolean;
  displayLocation?: number;
  checkoutMode?: CheckoutUpsellMode;
  startsAt?: string;
  endsAt?: string;
  clearEndsAt?: boolean;
  timezone?: string;
  triggerRules?: CreateUpsellTriggerRuleDto[];
  recommendationRules?: CreateUpsellRecommendationRuleDto[];
  eligibilityRules?: CreateUpsellEligibilityRuleDto[];
}

export interface CreateUpsellTriggerRuleDto {
  triggerType: UpsellTriggerType;
  triggerIds?: string[];
  extractFilterIds?: string[];
}

export interface CreateUpsellRecommendationRuleDto {
  recommendationType: UpsellRecommendationType;
  recommendationIds?: string[];
  matchTriggerFilters: boolean;
  matchFilterIds?: string[];
}

export interface CreateUpsellEligibilityRuleDto {
  eligibilityType: UpsellEligibilityType;
  eligibilityIds?: string[];
}

// ============================================
// Analytics DTOs
// ============================================

export interface UpsellPerformanceDto {
  upsellRuleId: string;
  name: string;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  clickThroughRate: number;
  conversionRate: number;
  totalRevenue: number;
  averageOrderValue: number;
  uniqueCustomersCount: number;
  firstImpression?: string;
  lastConversion?: string;
  eventsByDate: UpsellEventsByDateDto[];
}

export interface UpsellSummaryDto {
  id: string;
  name: string;
  status: UpsellStatus;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  clickThroughRate: number;
  conversionRate: number;
}

export interface UpsellDashboardDto {
  totalActiveRules: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  overallClickThroughRate: number;
  overallConversionRate: number;
  totalRevenue: number;
  topPerformers: UpsellSummaryDto[];
  trendByDate: UpsellEventsByDateDto[];
}

export interface UpsellEventsByDateDto {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

// ============================================
// Storefront DTOs
// ============================================

export interface UpsellSuggestionDto {
  upsellRuleId: string;
  heading: string;
  message?: string;
  checkoutMode: CheckoutUpsellMode;
  products: UpsellProductDto[];
}

export interface UpsellProductDto {
  productId: string;
  productRootId: string;
  name: string;
  description?: string;
  sku?: string;
  price: number;
  formattedPrice: string;
  priceIncludesTax: boolean;
  taxRate: number;
  taxAmount?: number;
  formattedTaxAmount?: string;
  onSale: boolean;
  previousPrice?: number;
  formattedPreviousPrice?: string;
  url?: string;
  imageUrl?: string;
  productTypeName?: string;
  availableForPurchase: boolean;
  hasVariants: boolean;
  variants?: UpsellVariantDto[];
}

export interface UpsellVariantDto {
  productId: string;
  name: string;
  sku?: string;
  price: number;
  formattedPrice: string;
  availableForPurchase: boolean;
}

export interface RecordUpsellEventDto {
  upsellRuleId: string;
  eventType: UpsellEventType;
  productId?: string;
  displayLocation: number;
}

export interface RecordUpsellEventsDto {
  events: RecordUpsellEventDto[];
}
