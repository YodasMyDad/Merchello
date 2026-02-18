export interface ProductFeedFilterValueGroupDto {
  filterGroupId: string;
  filterIds: string[];
}

export interface ProductFeedFilterConfigDto {
  productTypeIds: string[];
  collectionIds: string[];
  filterValueGroups: ProductFeedFilterValueGroupDto[];
}

export interface ProductFeedCustomLabelDto {
  slot: number;
  sourceType: string;
  staticValue: string | null;
  resolverAlias: string | null;
  args: Record<string, string>;
}

export interface ProductFeedCustomFieldDto {
  attribute: string;
  sourceType: string;
  staticValue: string | null;
  resolverAlias: string | null;
  args: Record<string, string>;
}

export interface ProductFeedManualPromotionDto {
  promotionId: string;
  name: string;
  requiresCouponCode: boolean;
  couponCode: string | null;
  description: string | null;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  priority: number;
  percentOff: number | null;
  amountOff: number | null;
  filterConfig: ProductFeedFilterConfigDto;
}

export interface ProductFeedListItemDto {
  id: string;
  name: string;
  slug: string;
  isEnabled: boolean;
  countryCode: string;
  currencyCode: string;
  languageCode: string;
  includeTaxInPrice: boolean;
  lastGeneratedUtc: string | null;
  hasProductSnapshot: boolean;
  hasPromotionsSnapshot: boolean;
  lastGenerationError: string | null;
}

export interface ProductFeedDetailDto {
  id: string;
  name: string;
  slug: string;
  isEnabled: boolean;
  countryCode: string;
  currencyCode: string;
  languageCode: string;
  includeTaxInPrice: boolean;
  filterConfig: ProductFeedFilterConfigDto;
  customLabels: ProductFeedCustomLabelDto[];
  customFields: ProductFeedCustomFieldDto[];
  manualPromotions: ProductFeedManualPromotionDto[];
  lastGeneratedUtc: string | null;
  lastGenerationError: string | null;
  hasProductSnapshot: boolean;
  hasPromotionsSnapshot: boolean;
}

export interface CreateProductFeedDto {
  name: string;
  slug: string | null;
  isEnabled: boolean;
  countryCode: string;
  currencyCode: string;
  languageCode: string;
  includeTaxInPrice: boolean | null;
  filterConfig: ProductFeedFilterConfigDto;
  customLabels: ProductFeedCustomLabelDto[];
  customFields: ProductFeedCustomFieldDto[];
  manualPromotions: ProductFeedManualPromotionDto[];
}

export interface UpdateProductFeedDto {
  name: string;
  slug: string | null;
  isEnabled: boolean;
  countryCode: string;
  currencyCode: string;
  languageCode: string;
  includeTaxInPrice: boolean | null;
  filterConfig: ProductFeedFilterConfigDto;
  customLabels: ProductFeedCustomLabelDto[];
  customFields: ProductFeedCustomFieldDto[];
  manualPromotions: ProductFeedManualPromotionDto[];
}

export interface ProductFeedRebuildResultDto {
  success: boolean;
  generatedAtUtc: string;
  productItemCount: number;
  promotionCount: number;
  warningCount: number;
  warnings: string[];
  error: string | null;
}

export interface ProductFeedPreviewDto {
  productItemCount: number;
  promotionCount: number;
  warnings: string[];
  sampleProductIds: string[];
  error: string | null;
}

export interface ValidateProductFeedDto {
  maxIssues: number | null;
  previewProductIds: string[];
}

export interface ProductFeedValidationIssueDto {
  severity: string;
  code: string;
  message: string;
  productId: string | null;
  productName: string | null;
  field: string | null;
}

export interface ProductFeedValidationPreviewFieldDto {
  field: string;
  value: string;
}

export interface ProductFeedValidationProductPreviewDto {
  productId: string;
  productName: string | null;
  title: string | null;
  price: string | null;
  availability: string | null;
  link: string | null;
  imageLink: string | null;
  brand: string | null;
  gtin: string | null;
  mpn: string | null;
  identifierExists: string | null;
  shippingLabel: string | null;
  fields: ProductFeedValidationPreviewFieldDto[];
}

export interface ProductFeedValidationDto {
  productItemCount: number;
  promotionCount: number;
  warningCount: number;
  errorCount: number;
  warnings: string[];
  issues: ProductFeedValidationIssueDto[];
  sampleProductIds: string[];
  productPreviews: ProductFeedValidationProductPreviewDto[];
  missingRequestedProductIds: string[];
}

export interface ProductFeedResolverDescriptorDto {
  alias: string;
  description: string;
  displayName: string;
  helpText: string | null;
  supportsArgs: boolean;
  argsHelpText: string | null;
  argsExampleJson: string | null;
}

export interface ProductFeedValidationModalData {
  feedId: string;
  feedName: string;
}

export interface ProductFeedValidationModalValue {
  refreshed: boolean;
}
