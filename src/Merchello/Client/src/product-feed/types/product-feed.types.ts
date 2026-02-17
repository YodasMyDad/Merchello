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
  filterConfig: ProductFeedFilterConfigDto;
  customLabels: ProductFeedCustomLabelDto[];
  customFields: ProductFeedCustomFieldDto[];
  manualPromotions: ProductFeedManualPromotionDto[];
  lastGeneratedUtc: string | null;
  lastGenerationError: string | null;
  hasProductSnapshot: boolean;
  hasPromotionsSnapshot: boolean;
  accessToken: string | null;
}

export interface CreateProductFeedDto {
  name: string;
  slug: string | null;
  isEnabled: boolean;
  countryCode: string;
  currencyCode: string;
  languageCode: string;
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

export interface ProductFeedResolverDescriptorDto {
  alias: string;
  description: string;
}

export interface ProductFeedTokenResultDto {
  accessToken: string;
}
