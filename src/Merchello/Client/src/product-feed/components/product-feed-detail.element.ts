import { LitElement, css, html, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { UmbRoute, UmbRouterSlotChangeEvent, UmbRouterSlotInitEvent } from "@umbraco-cms/backoffice/router";
import type { ProductTypeDto, ProductCollectionDto } from "@products/types/product.types.js";
import type { ProductFilterGroupDto } from "@filters/types/filters.types.js";
import type {
  CreateProductFeedDto,
  ProductFeedCustomFieldDto,
  ProductFeedCustomLabelDto,
  ProductFeedDetailDto,
  ProductFeedFilterConfigDto,
  ProductFeedManualPromotionDto,
  ProductFeedPreviewDto,
  ProductFeedRebuildResultDto,
  ProductFeedResolverDescriptorDto,
  UpdateProductFeedDto,
} from "@product-feed/types/product-feed.types.js";
import type { MerchelloProductFeedWorkspaceContext } from "@product-feed/contexts/product-feed-workspace.context.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { CountryDto } from "@api/merchello-api.js";
import {
  getProductFeedsListHref,
  navigateToProductFeedsList,
  replaceToProductFeedDetail,
} from "@shared/utils/navigation.js";
import { formatRelativeDate } from "@shared/utils/formatting.js";
import "@shared/components/merchello-empty-state.element.js";

const LABEL_SLOT_COUNT = 5;

type FeedTab = "general" | "selection" | "promotions" | "custom-labels" | "custom-fields" | "preview";

@customElement("merchello-product-feed-detail")
export class MerchelloProductFeedDetailElement extends UmbElementMixin(LitElement) {
  @state() private _feed?: ProductFeedDetailDto;
  @state() private _isNew = true;
  @state() private _isLoading = true;
  @state() private _isSaving = false;
  @state() private _isRebuilding = false;
  @state() private _isPreviewLoading = false;
  @state() private _isRegeneratingToken = false;
  @state() private _loadError: string | null = null;
  @state() private _validationErrors: Record<string, string> = {};

  @state() private _productTypes: ProductTypeDto[] = [];
  @state() private _collections: ProductCollectionDto[] = [];
  @state() private _filterGroups: ProductFilterGroupDto[] = [];
  @state() private _resolvers: ProductFeedResolverDescriptorDto[] = [];
  @state() private _countries: CountryDto[] = [];

  @state() private _preview?: ProductFeedPreviewDto;
  @state() private _lastRebuild?: ProductFeedRebuildResultDto;

  @state() private _routes: UmbRoute[] = [];
  @state() private _routerPath?: string;
  @state() private _activePath = "";

  @state() private _customLabelArgsText: string[] = Array.from({ length: LABEL_SLOT_COUNT }, () => "{}");
  @state() private _customLabelArgsErrors: string[] = Array.from({ length: LABEL_SLOT_COUNT }, () => "");
  @state() private _customFieldArgsText: string[] = [];
  @state() private _customFieldArgsErrors: string[] = [];
  @state() private _isSlugManuallyEdited = false;

  #workspaceContext?: MerchelloProductFeedWorkspaceContext;
  #notificationContext?: UmbNotificationContext;
  #modalManager?: UmbModalManagerContext;
  #isConnected = false;

  constructor() {
    super();
    this._initRoutes();

    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloProductFeedWorkspaceContext;
      if (!this.#workspaceContext) return;

      this._isNew = this.#workspaceContext.isNew;

      this.observe(this.#workspaceContext.feed, (feed) => {
        if (!feed) return;
        this._applyFeed(feed);
      }, "_feed");

      this.observe(this.#workspaceContext.isLoading, (isLoading) => {
        this._isLoading = isLoading;
      }, "_isLoading");

      this.observe(this.#workspaceContext.loadError, (error) => {
        this._loadError = error;
      }, "_loadError");
    });

    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });

    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadReferenceData();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private _initRoutes(): void {
    const stubComponent = (): HTMLElement => document.createElement("div");
    this._routes = [
      { path: "tab/general", component: stubComponent },
      { path: "tab/selection", component: stubComponent },
      { path: "tab/promotions", component: stubComponent },
      { path: "tab/custom-labels", component: stubComponent },
      { path: "tab/custom-fields", component: stubComponent },
      { path: "tab/preview", component: stubComponent },
      { path: "", redirectTo: "tab/general" },
    ];
  }

  private async _loadReferenceData(): Promise<void> {
    const [productTypes, collections, filterGroups, resolvers, countries] = await Promise.all([
      MerchelloApi.getProductTypes(),
      MerchelloApi.getProductCollections(),
      MerchelloApi.getFilterGroups(),
      MerchelloApi.getProductFeedResolvers(),
      MerchelloApi.getCountries(),
    ]);

    if (!this.#isConnected) return;

    if (productTypes.data) this._productTypes = productTypes.data;
    if (collections.data) this._collections = collections.data;
    if (filterGroups.data) this._filterGroups = filterGroups.data;
    if (resolvers.data) this._resolvers = resolvers.data;
    if (countries.data) this._countries = countries.data;
  }

  private _createEmptyFilterConfig(): ProductFeedFilterConfigDto {
    return {
      productTypeIds: [],
      collectionIds: [],
      filterValueGroups: [],
    };
  }

  private _createEmptyCustomLabel(slot: number): ProductFeedCustomLabelDto {
    return {
      slot,
      sourceType: "static",
      staticValue: null,
      resolverAlias: null,
      args: {},
    };
  }

  private _createEmptyManualPromotion(): ProductFeedManualPromotionDto {
    return {
      promotionId: `manual-${crypto.randomUUID()}`,
      name: "",
      requiresCouponCode: false,
      couponCode: null,
      description: null,
      startsAtUtc: null,
      endsAtUtc: null,
      priority: 1000,
      percentOff: null,
      amountOff: null,
      filterConfig: this._createEmptyFilterConfig(),
    };
  }

  private _normalizeFilterConfig(config?: ProductFeedFilterConfigDto): ProductFeedFilterConfigDto {
    return {
      productTypeIds: [...new Set(config?.productTypeIds ?? [])],
      collectionIds: [...new Set(config?.collectionIds ?? [])],
      filterValueGroups: (config?.filterValueGroups ?? [])
        .map((group) => ({
          filterGroupId: group.filterGroupId,
          filterIds: [...new Set(group.filterIds ?? [])],
        }))
        .filter((group) => group.filterIds.length > 0),
    };
  }

  private _normalizeFeed(feed: ProductFeedDetailDto): ProductFeedDetailDto {
    const labelsBySlot = new Map<number, ProductFeedCustomLabelDto>();
    for (const label of feed.customLabels ?? []) {
      if (label.slot < 0 || label.slot >= LABEL_SLOT_COUNT) continue;
      if (labelsBySlot.has(label.slot)) continue;
      labelsBySlot.set(label.slot, {
        slot: label.slot,
        sourceType: label.sourceType || "static",
        staticValue: label.staticValue,
        resolverAlias: label.resolverAlias,
        args: { ...(label.args ?? {}) },
      });
    }

    const customLabels = Array.from({ length: LABEL_SLOT_COUNT }, (_, slot) => {
      return labelsBySlot.get(slot) ?? this._createEmptyCustomLabel(slot);
    });

    return {
      ...feed,
      includeTaxInPrice: feed.includeTaxInPrice ?? false,
      filterConfig: this._normalizeFilterConfig(feed.filterConfig),
      customLabels,
      customFields: (feed.customFields ?? []).map((field) => ({
        attribute: field.attribute ?? "",
        sourceType: field.sourceType || "static",
        staticValue: field.staticValue,
        resolverAlias: field.resolverAlias,
        args: { ...(field.args ?? {}) },
      })),
      manualPromotions: (feed.manualPromotions ?? []).map((promotion) => ({
        promotionId: promotion.promotionId,
        name: promotion.name,
        requiresCouponCode: promotion.requiresCouponCode,
        couponCode: promotion.couponCode,
        description: promotion.description,
        startsAtUtc: promotion.startsAtUtc,
        endsAtUtc: promotion.endsAtUtc,
        priority: promotion.priority,
        percentOff: promotion.percentOff,
        amountOff: promotion.amountOff,
        filterConfig: this._normalizeFilterConfig(promotion.filterConfig),
      })),
    };
  }

  private _applyFeed(feed: ProductFeedDetailDto): void {
    const normalized = this._normalizeFeed(feed);
    this._feed = normalized;
    this._isLoading = false;
    this._isNew = !normalized.id;
    this._loadError = null;
    this._validationErrors = {};

    this._customLabelArgsText = normalized.customLabels.map((label) => this._formatArgs(label.args));
    this._customLabelArgsErrors = Array.from({ length: LABEL_SLOT_COUNT }, () => "");
    this._customFieldArgsText = normalized.customFields.map((field) => this._formatArgs(field.args));
    this._customFieldArgsErrors = normalized.customFields.map(() => "");
    this._isSlugManuallyEdited = this._isSlugOverride(normalized.name, normalized.slug);
  }

  private _commitFeed(feed: ProductFeedDetailDto): void {
    this._feed = feed;
  }

  private _getTabHref(tab: FeedTab): string {
    if (!this._routerPath) return `tab/${tab}`;
    return `${this._routerPath}/tab/${tab}`;
  }

  private _getActiveTab(): FeedTab {
    if (this._activePath.includes("tab/selection")) return "selection";
    if (this._activePath.includes("tab/promotions")) return "promotions";
    if (this._activePath.includes("tab/custom-labels")) return "custom-labels";
    if (this._activePath.includes("tab/custom-fields")) return "custom-fields";
    if (this._activePath.includes("tab/preview")) return "preview";
    return "general";
  }

  private _onRouterInit(event: UmbRouterSlotInitEvent): void {
    this._routerPath = event.target.absoluteRouterPath;
  }

  private _onRouterChange(event: UmbRouterSlotChangeEvent): void {
    this._activePath = event.target.localActiveViewPath || "";
  }

  private _toggleIdSelection(ids: string[], id: string, selected: boolean): string[] {
    if (selected) {
      return ids.includes(id) ? ids : [...ids, id];
    }
    return ids.filter((item) => item !== id);
  }

  private _toggleFilterValue(
    config: ProductFeedFilterConfigDto,
    filterGroupId: string,
    filterId: string,
    selected: boolean,
  ): ProductFeedFilterConfigDto {
    const existing = config.filterValueGroups.find((group) => group.filterGroupId === filterGroupId);
    let nextGroups = config.filterValueGroups.filter((group) => group.filterGroupId !== filterGroupId);

    const nextIds = this._toggleIdSelection(existing?.filterIds ?? [], filterId, selected);
    if (nextIds.length > 0) {
      nextGroups = [
        ...nextGroups,
        {
          filterGroupId,
          filterIds: nextIds,
        },
      ];
    }

    return {
      ...config,
      filterValueGroups: nextGroups,
    };
  }

  private _setGeneralField<K extends keyof ProductFeedDetailDto>(field: K, value: ProductFeedDetailDto[K]): void {
    if (!this._feed) return;
    this._commitFeed({
      ...this._feed,
      [field]: value,
    });
  }

  private _generateSlug(value: string): string {
    if (!value) return "";

    const collapsedWhitespace = value.toLowerCase().replace(/\s+/g, " ");
    const replacedWhitespace = collapsedWhitespace.replace(/ /g, "-");
    const withoutDiacritics = replacedWhitespace
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const withoutDeniedCharacters = withoutDiacritics.replace(/[^a-zA-Z0-9\-._]/g, "");
    return withoutDeniedCharacters.replace(/-{2,}/g, "-");
  }

  private _isSlugOverride(name: string, slug: string | null | undefined): boolean {
    const currentSlug = slug ?? "";
    if (!currentSlug.trim()) {
      return false;
    }

    return currentSlug !== this._generateSlug(name);
  }

  private _handleNameInput(value: string): void {
    if (!this._feed) return;

    const nextName = value;
    const nextSlug = this._isSlugManuallyEdited
      ? this._feed.slug
      : this._generateSlug(nextName);

    this._commitFeed({
      ...this._feed,
      name: nextName,
      slug: nextSlug,
    });
  }

  private _handleSlugInput(value: string): void {
    if (!this._feed) return;

    const isManualOverride = this._isSlugOverride(this._feed.name, value);
    this._isSlugManuallyEdited = isManualOverride;

    this._commitFeed({
      ...this._feed,
      slug: isManualOverride ? value : this._generateSlug(this._feed.name),
    });
  }

  private _handleRootSelectionChange(
    key: "productTypeIds" | "collectionIds",
    id: string,
    selected: boolean,
  ): void {
    if (!this._feed) return;
    const config = this._feed.filterConfig;
    const nextConfig = {
      ...config,
      [key]: this._toggleIdSelection(config[key], id, selected),
    };
    this._commitFeed({
      ...this._feed,
      filterConfig: nextConfig,
    });
  }

  private _handleRootFilterValueChange(filterGroupId: string, filterId: string, selected: boolean): void {
    if (!this._feed) return;
    const nextConfig = this._toggleFilterValue(this._feed.filterConfig, filterGroupId, filterId, selected);
    this._commitFeed({
      ...this._feed,
      filterConfig: nextConfig,
    });
  }

  private _setRootSelectionIds(
    key: "productTypeIds" | "collectionIds",
    ids: string[],
  ): void {
    if (!this._feed) return;
    this._commitFeed({
      ...this._feed,
      filterConfig: {
        ...this._feed.filterConfig,
        [key]: [...new Set(ids)],
      },
    });
  }

  private _setRootFilterGroupSelection(groupId: string, selected: boolean): void {
    if (!this._feed) return;
    const group = this._filterGroups.find((item) => item.id === groupId);
    const groupFilterIds = (group?.filters ?? []).map((filter) => filter.id);

    if (groupFilterIds.length === 0) return;

    this._commitFeed({
      ...this._feed,
      filterConfig: this._toggleFilterGroupValues(this._feed.filterConfig, groupId, groupFilterIds, selected),
    });
  }

  private _updateManualPromotion(index: number, update: (promotion: ProductFeedManualPromotionDto) => ProductFeedManualPromotionDto): void {
    if (!this._feed) return;
    const promotions = this._feed.manualPromotions.map((promotion, i) => {
      return i === index ? update({ ...promotion }) : promotion;
    });
    this._commitFeed({
      ...this._feed,
      manualPromotions: promotions,
    });
  }

  private _addManualPromotion(): void {
    if (!this._feed) return;
    this._commitFeed({
      ...this._feed,
      manualPromotions: [...this._feed.manualPromotions, this._createEmptyManualPromotion()],
    });
  }

  private _removeManualPromotion(index: number): void {
    if (!this._feed) return;
    this._commitFeed({
      ...this._feed,
      manualPromotions: this._feed.manualPromotions.filter((_, i) => i !== index),
    });
  }

  private _handleManualPromotionSelectionChange(
    index: number,
    key: "productTypeIds" | "collectionIds",
    id: string,
    selected: boolean,
  ): void {
    this._updateManualPromotion(index, (promotion) => {
      const config = promotion.filterConfig;
      return {
        ...promotion,
        filterConfig: {
          ...config,
          [key]: this._toggleIdSelection(config[key], id, selected),
        },
      };
    });
  }

  private _handleManualPromotionFilterValueChange(
    index: number,
    filterGroupId: string,
    filterId: string,
    selected: boolean,
  ): void {
    this._updateManualPromotion(index, (promotion) => {
      return {
        ...promotion,
        filterConfig: this._toggleFilterValue(promotion.filterConfig, filterGroupId, filterId, selected),
      };
    });
  }

  private _setManualPromotionSelectionIds(
    index: number,
    key: "productTypeIds" | "collectionIds",
    ids: string[],
  ): void {
    this._updateManualPromotion(index, (promotion) => ({
      ...promotion,
      filterConfig: {
        ...promotion.filterConfig,
        [key]: [...new Set(ids)],
      },
    }));
  }

  private _setManualPromotionFilterGroupSelection(index: number, groupId: string, selected: boolean): void {
    const group = this._filterGroups.find((item) => item.id === groupId);
    const groupFilterIds = (group?.filters ?? []).map((filter) => filter.id);

    if (groupFilterIds.length === 0) return;

    this._updateManualPromotion(index, (promotion) => ({
      ...promotion,
      filterConfig: this._toggleFilterGroupValues(promotion.filterConfig, groupId, groupFilterIds, selected),
    }));
  }

  private _toggleFilterGroupValues(
    config: ProductFeedFilterConfigDto,
    groupId: string,
    filterIds: string[],
    selected: boolean,
  ): ProductFeedFilterConfigDto {
    let nextConfig = { ...config };
    for (const filterId of filterIds) {
      nextConfig = this._toggleFilterValue(nextConfig, groupId, filterId, selected);
    }
    return nextConfig;
  }

  private _getSelectedFilterCount(config: ProductFeedFilterConfigDto, groupId: string): number {
    return config.filterValueGroups.find((group) => group.filterGroupId === groupId)?.filterIds.length ?? 0;
  }

  private _resolveNamesByIds(items: Array<{ id: string; name: string }>, ids: string[]): string[] {
    const byId = new Map(items.map((item) => [item.id, item.name]));
    return ids.map((id) => byId.get(id) ?? id);
  }

  private _formatSentenceValueList(values: string[]): string {
    if (values.length === 0) {
      return "any value";
    }

    const quoted = values.map((value) => `"${value}"`);
    if (quoted.length === 1) {
      return quoted[0];
    }

    if (quoted.length === 2) {
      return `${quoted[0]} or ${quoted[1]}`;
    }

    return `${quoted.slice(0, -1).join(", ")}, or ${quoted[quoted.length - 1]}`;
  }

  private _buildSelectionQueryInfo(config: ProductFeedFilterConfigDto): {
    productTypeNames: string[];
    collectionNames: string[];
    filterGroups: Array<{ groupName: string; valueNames: string[] }>;
    expression: string;
    english: string;
  } {
    const productTypeNames = this._resolveNamesByIds(this._productTypes, config.productTypeIds);
    const collectionNames = this._resolveNamesByIds(this._collections, config.collectionIds);

    const filterGroups = config.filterValueGroups
      .map((selectedGroup) => {
        const group = this._filterGroups.find((item) => item.id === selectedGroup.filterGroupId);
        const filterNames = this._resolveNamesByIds(group?.filters ?? [], selectedGroup.filterIds);
        return {
          groupName: group?.name ?? selectedGroup.filterGroupId,
          valueNames: filterNames,
        };
      })
      .filter((group) => group.valueNames.length > 0);

    const expressionClauses: string[] = [];
    if (productTypeNames.length > 0) {
      expressionClauses.push(`productType IN (${productTypeNames.map((name) => `"${name}"`).join(", ")})`);
    }

    if (collectionNames.length > 0) {
      expressionClauses.push(`collection IN (${collectionNames.map((name) => `"${name}"`).join(", ")})`);
    }

    for (const group of filterGroups) {
      expressionClauses.push(`${group.groupName} IN (${group.valueNames.map((name) => `"${name}"`).join(", ")})`);
    }

    const expression = expressionClauses.length > 0
      ? expressionClauses.join(" AND ")
      : "TRUE (no selection filters)";

    const englishClauses: string[] = [];
    if (productTypeNames.length > 0) {
      englishClauses.push(`product type is ${this._formatSentenceValueList(productTypeNames)}`);
    }

    if (collectionNames.length > 0) {
      englishClauses.push(`collection is ${this._formatSentenceValueList(collectionNames)}`);
    }

    for (const group of filterGroups) {
      englishClauses.push(`${group.groupName} is ${this._formatSentenceValueList(group.valueNames)}`);
    }

    const english = englishClauses.length > 0
      ? `Include products where ${englishClauses.join(" and ")}.`
      : "Include all products. No product type, collection, or filter-value restrictions are active.";

    return {
      productTypeNames,
      collectionNames,
      filterGroups,
      expression,
      english,
    };
  }

  private _getResolverDescriptor(alias: string | null | undefined): ProductFeedResolverDescriptorDto | undefined {
    if (!alias) {
      return undefined;
    }

    const normalizedAlias = alias.trim().toLowerCase();
    return this._resolvers.find((resolver) => resolver.alias.trim().toLowerCase() === normalizedAlias);
  }

  private _resolverSupportsArgs(alias: string | null | undefined): boolean {
    return this._getResolverDescriptor(alias)?.supportsArgs ?? false;
  }

  private _getResolverHelpText(alias: string | null | undefined): string {
    const resolver = this._getResolverDescriptor(alias);
    if (!resolver) {
      return "Resolver computes a value dynamically for each product.";
    }

    return resolver.helpText?.trim() || resolver.description || "Resolver computes a value dynamically for each product.";
  }

  private _getResolverArgsHelpText(alias: string | null | undefined): string {
    const resolver = this._getResolverDescriptor(alias);
    return resolver?.argsHelpText?.trim() || "Provide a JSON object with simple key/value pairs.";
  }

  private _getResolverArgsExample(alias: string | null | undefined): string {
    const resolver = this._getResolverDescriptor(alias);
    return resolver?.argsExampleJson?.trim() || "{\"key\":\"value\",\"flag\":\"true\"}";
  }

  private _addCustomField(): void {
    if (!this._feed) return;

    const next = {
      ...this._feed,
      customFields: [
        ...this._feed.customFields,
        {
          attribute: "",
          sourceType: "static",
          staticValue: null,
          resolverAlias: null,
          args: {},
        },
      ],
    };
    this._commitFeed(next);
    this._customFieldArgsText = [...this._customFieldArgsText, "{}"];
    this._customFieldArgsErrors = [...this._customFieldArgsErrors, ""];
  }

  private _removeCustomField(index: number): void {
    if (!this._feed) return;
    this._commitFeed({
      ...this._feed,
      customFields: this._feed.customFields.filter((_, i) => i !== index),
    });
    this._customFieldArgsText = this._customFieldArgsText.filter((_, i) => i !== index);
    this._customFieldArgsErrors = this._customFieldArgsErrors.filter((_, i) => i !== index);
  }

  private _updateCustomField(index: number, update: (field: ProductFeedCustomFieldDto) => ProductFeedCustomFieldDto): void {
    if (!this._feed) return;
    const fields = this._feed.customFields.map((field, i) => {
      return i === index ? update({ ...field, args: { ...field.args } }) : field;
    });
    this._commitFeed({
      ...this._feed,
      customFields: fields,
    });
  }

  private _updateCustomLabel(slot: number, update: (label: ProductFeedCustomLabelDto) => ProductFeedCustomLabelDto): void {
    if (!this._feed) return;
    const labels = this._feed.customLabels.map((label) => {
      return label.slot === slot ? update({ ...label, args: { ...label.args } }) : label;
    });
    this._commitFeed({
      ...this._feed,
      customLabels: labels,
    });
  }

  private _formatArgs(args: Record<string, string>): string {
    if (Object.keys(args).length === 0) return "{}";
    return JSON.stringify(args, null, 2);
  }

  private _parseArgs(input: string): { value?: Record<string, string>; error?: string } {
    const trimmed = input.trim();
    if (!trimmed) {
      return { value: {} };
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { error: "Args must be a JSON object." };
      }

      const args: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        const normalizedKey = key.trim();
        if (!normalizedKey) continue;

        if (value === null || value === undefined) {
          args[normalizedKey] = "";
          continue;
        }

        if (typeof value === "object") {
          return { error: "Args values must be primitives (string/number/boolean)." };
        }

        args[normalizedKey] = String(value);
      }

      return { value: args };
    } catch {
      return { error: "Invalid JSON in args." };
    }
  }

  private _handleCustomLabelArgsInput(slot: number, input: string): void {
    const nextArgsText = [...this._customLabelArgsText];
    nextArgsText[slot] = input;
    this._customLabelArgsText = nextArgsText;

    const parsed = this._parseArgs(input);
    const nextErrors = [...this._customLabelArgsErrors];
    nextErrors[slot] = parsed.error ?? "";
    this._customLabelArgsErrors = nextErrors;

    if (!parsed.error && parsed.value) {
      this._updateCustomLabel(slot, (label) => ({
        ...label,
        args: parsed.value!,
      }));
    }
  }

  private _handleCustomFieldArgsInput(index: number, input: string): void {
    const nextArgsText = [...this._customFieldArgsText];
    nextArgsText[index] = input;
    this._customFieldArgsText = nextArgsText;

    const parsed = this._parseArgs(input);
    const nextErrors = [...this._customFieldArgsErrors];
    nextErrors[index] = parsed.error ?? "";
    this._customFieldArgsErrors = nextErrors;

    if (!parsed.error && parsed.value) {
      this._updateCustomField(index, (field) => ({
        ...field,
        args: parsed.value!,
      }));
    }
  }

  private _reparseArgsForSave(): boolean {
    if (!this._feed) return false;

    let hasError = false;
    const labelErrors = [...this._customLabelArgsErrors];
    const fieldErrors = [...this._customFieldArgsErrors];

    for (let slot = 0; slot < LABEL_SLOT_COUNT; slot++) {
      const label = this._feed.customLabels.find((item) => item.slot === slot);
      const expectsArgs = label?.sourceType === "resolver" && this._resolverSupportsArgs(label.resolverAlias);
      if (!expectsArgs) {
        labelErrors[slot] = "";
        continue;
      }

      const parsed = this._parseArgs(this._customLabelArgsText[slot] ?? "{}");
      labelErrors[slot] = parsed.error ?? "";
      if (parsed.error) {
        hasError = true;
        continue;
      }

      this._updateCustomLabel(slot, (label) => ({
        ...label,
        args: parsed.value ?? {},
      }));
    }

    for (let i = 0; i < this._feed.customFields.length; i++) {
      const field = this._feed.customFields[i];
      const expectsArgs = field.sourceType === "resolver" && this._resolverSupportsArgs(field.resolverAlias);
      if (!expectsArgs) {
        fieldErrors[i] = "";
        continue;
      }

      const parsed = this._parseArgs(this._customFieldArgsText[i] ?? "{}");
      fieldErrors[i] = parsed.error ?? "";
      if (parsed.error) {
        hasError = true;
        continue;
      }

      this._updateCustomField(i, (field) => ({
        ...field,
        args: parsed.value ?? {},
      }));
    }

    this._customLabelArgsErrors = labelErrors;
    this._customFieldArgsErrors = fieldErrors;
    return !hasError;
  }

  private _validate(): boolean {
    if (!this._feed) return false;

    const errors: Record<string, string> = {};

    if (!this._feed.name.trim()) {
      errors.name = "Name is required.";
    }

    if (!this._feed.countryCode.trim() || this._feed.countryCode.trim().length !== 2) {
      errors.countryCode = "Country code must be 2 letters.";
    }

    if (!this._feed.currencyCode.trim() || this._feed.currencyCode.trim().length !== 3) {
      errors.currencyCode = "Currency code must be 3 letters.";
    }

    if (!this._feed.languageCode.trim()) {
      errors.languageCode = "Language code is required.";
    }

    for (const label of this._feed.customLabels) {
      if (label.sourceType === "resolver" && !label.resolverAlias) {
        errors[`customLabel-${label.slot}`] = "Select a resolver for resolver source type.";
      }
    }

    this._feed.customFields.forEach((field, index) => {
      if (!field.attribute.trim()) {
        errors[`customField-${index}`] = "Attribute is required.";
      }

      if (field.sourceType === "resolver" && !field.resolverAlias) {
        errors[`customFieldResolver-${index}`] = "Select a resolver for resolver source type.";
      }
    });

    this._feed.manualPromotions.forEach((promotion, index) => {
      if (!promotion.promotionId.trim()) {
        errors[`promotionId-${index}`] = "Promotion ID is required.";
      }

      if (!promotion.name.trim()) {
        errors[`promotionName-${index}`] = "Promotion name is required.";
      }

      if (promotion.requiresCouponCode && !promotion.couponCode?.trim()) {
        errors[`promotionCoupon-${index}`] = "Coupon code is required when coupon is enabled.";
      }

      if (promotion.percentOff != null && promotion.amountOff != null) {
        errors[`promotionValue-${index}`] = "Set either percent off or amount off, not both.";
      }
    });

    this._validationErrors = errors;

    const hasLabelArgErrors = this._feed.customLabels.some((label) =>
      label.sourceType === "resolver" &&
      this._resolverSupportsArgs(label.resolverAlias) &&
      !!this._customLabelArgsErrors[label.slot]);
    const hasFieldArgErrors = this._feed.customFields.some((field, index) =>
      field.sourceType === "resolver" &&
      this._resolverSupportsArgs(field.resolverAlias) &&
      !!this._customFieldArgsErrors[index]);
    const hasArgErrors = hasLabelArgErrors || hasFieldArgErrors;
    return Object.keys(errors).length === 0 && !hasArgErrors;
  }

  private _toRequest(feed: ProductFeedDetailDto): CreateProductFeedDto | UpdateProductFeedDto {
    return {
      name: feed.name.trim(),
      slug: feed.slug?.trim() ? feed.slug.trim() : null,
      isEnabled: feed.isEnabled,
      countryCode: feed.countryCode.trim().toUpperCase(),
      currencyCode: feed.currencyCode.trim().toUpperCase(),
      languageCode: feed.languageCode.trim().toLowerCase(),
      includeTaxInPrice: feed.includeTaxInPrice ?? null,
      filterConfig: this._normalizeFilterConfig(feed.filterConfig),
      customLabels: feed.customLabels.map((label) => ({
        slot: label.slot,
        sourceType: label.sourceType,
        staticValue: label.staticValue?.trim() ? label.staticValue.trim() : null,
        resolverAlias: label.resolverAlias?.trim() ? label.resolverAlias.trim() : null,
        args: { ...(label.args ?? {}) },
      })),
      customFields: feed.customFields.map((field) => ({
        attribute: field.attribute.trim(),
        sourceType: field.sourceType,
        staticValue: field.staticValue?.trim() ? field.staticValue.trim() : null,
        resolverAlias: field.resolverAlias?.trim() ? field.resolverAlias.trim() : null,
        args: { ...(field.args ?? {}) },
      })),
      manualPromotions: feed.manualPromotions.map((promotion) => ({
        promotionId: promotion.promotionId.trim(),
        name: promotion.name.trim(),
        requiresCouponCode: promotion.requiresCouponCode,
        couponCode: promotion.couponCode?.trim() ? promotion.couponCode.trim() : null,
        description: promotion.description?.trim() ? promotion.description.trim() : null,
        startsAtUtc: promotion.startsAtUtc,
        endsAtUtc: promotion.endsAtUtc,
        priority: promotion.priority,
        percentOff: promotion.percentOff,
        amountOff: promotion.amountOff,
        filterConfig: this._normalizeFilterConfig(promotion.filterConfig),
      })),
    };
  }

  private async _handleSave(): Promise<void> {
    if (!this._feed) return;
    if (!this._reparseArgsForSave() || !this._validate()) {
      this.#notificationContext?.peek("warning", {
        data: {
          headline: "Validation failed",
          message: "Check highlighted fields before saving.",
        },
      });
      return;
    }

    this._isSaving = true;
    const request = this._toRequest(this._feed);

    if (this._isNew) {
      const { data, error } = await MerchelloApi.createProductFeed(request);
      this._isSaving = false;

      if (error || !data) {
        this.#notificationContext?.peek("danger", {
          data: {
            headline: "Create failed",
            message: error?.message ?? "Unable to create product feed.",
          },
        });
        return;
      }

      this._isNew = false;
      this._applyFeed(data);
      this.#workspaceContext?.updateFeed(data);
      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Feed created",
          message: `${data.name} was created. Run Rebuild Now or request the feed URL to generate snapshots.`,
        },
      });
      replaceToProductFeedDetail(data.id);
      return;
    }

    const { data, error } = await MerchelloApi.updateProductFeed(this._feed.id, request);
    this._isSaving = false;

    if (error || !data) {
      this.#notificationContext?.peek("danger", {
        data: {
          headline: "Save failed",
          message: error?.message ?? "Unable to update product feed.",
        },
      });
      return;
    }

    this._applyFeed(data);
    this.#workspaceContext?.updateFeed(data);
    this.#notificationContext?.peek("positive", {
      data: {
        headline: "Feed saved",
        message: `${data.name} has been updated.`,
      },
    });
  }

  private async _handleDelete(): Promise<void> {
    if (!this._feed?.id || this._isNew) return;

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Product Feed",
        content: `Delete "${this._feed.name}"? This cannot be undone.`,
        color: "danger",
        confirmLabel: "Delete",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return;
    }

    const { error } = await MerchelloApi.deleteProductFeed(this._feed.id);
    if (error) {
      this.#notificationContext?.peek("danger", {
        data: {
          headline: "Delete failed",
          message: error.message,
        },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: {
        headline: "Feed deleted",
        message: `${this._feed.name} was deleted.`,
      },
    });
    navigateToProductFeedsList();
  }

  private async _reloadCurrentFeed(): Promise<void> {
    if (!this._feed?.id) return;
    const { data } = await MerchelloApi.getProductFeed(this._feed.id);
    if (!this.#isConnected || !data) return;
    this._applyFeed(data);
    this.#workspaceContext?.updateFeed(data);
  }

  private async _handleRebuild(): Promise<void> {
    if (!this._feed?.id || this._isNew) return;

    this._isRebuilding = true;
    const { data, error } = await MerchelloApi.rebuildProductFeed(this._feed.id);
    this._isRebuilding = false;
    if (!this.#isConnected) return;

    if (error || !data) {
      this.#notificationContext?.peek("danger", {
        data: {
          headline: "Rebuild failed",
          message: error?.message ?? "Unable to rebuild feed.",
        },
      });
      return;
    }

    this._lastRebuild = data;
    if (data.success) {
      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Feed rebuilt",
          message: `${data.productItemCount} products and ${data.promotionCount} promotions generated.`,
        },
      });
    } else {
      this.#notificationContext?.peek("warning", {
        data: {
          headline: "Rebuild finished with errors",
          message: data.error ?? "Feed rebuild failed.",
        },
      });
    }

    await this._reloadCurrentFeed();
    await this._handlePreview();
  }

  private async _handlePreview(): Promise<void> {
    if (!this._feed?.id || this._isNew) return;

    this._isPreviewLoading = true;
    const { data, error } = await MerchelloApi.previewProductFeed(this._feed.id);
    this._isPreviewLoading = false;
    if (!this.#isConnected) return;

    if (error || !data) {
      this.#notificationContext?.peek("danger", {
        data: {
          headline: "Preview failed",
          message: error?.message ?? "Unable to preview feed.",
        },
      });
      return;
    }

    this._preview = data;
    if (data.error) {
      this.#notificationContext?.peek("warning", {
        data: {
          headline: "Preview returned an error",
          message: data.error,
        },
      });
    }
  }

  private async _handleRegenerateToken(): Promise<void> {
    if (!this._feed?.id || this._isNew) return;

    this._isRegeneratingToken = true;
    const { data, error } = await MerchelloApi.regenerateProductFeedToken(this._feed.id);
    this._isRegeneratingToken = false;

    if (error || !data) {
      this.#notificationContext?.peek("danger", {
        data: {
          headline: "Token regeneration failed",
          message: error?.message ?? "Unable to regenerate token.",
        },
      });
      return;
    }

    const nextFeed = {
      ...this._feed,
      accessToken: data.accessToken,
    };
    this._commitFeed(nextFeed);
    this.#workspaceContext?.updateFeed(nextFeed);

    this.#notificationContext?.peek("positive", {
      data: {
        headline: "Token regenerated",
        message: "A new token has been created for this feed.",
      },
    });
  }

  private async _copyToClipboard(text: string, successMessage: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Copied",
          message: successMessage,
        },
      });
    } catch {
      this.#notificationContext?.peek("warning", {
        data: {
          headline: "Copy failed",
          message: "Clipboard access is not available.",
        },
      });
    }
  }

  private _toDateTimeLocal(value: string | null): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hour}:${minute}`;
  }

  private _fromDateTimeLocal(value: string): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  private _renderErrors(): unknown {
    if (Object.keys(this._validationErrors).length === 0) return nothing;
    const messages = Array.from(new Set(Object.values(this._validationErrors)));
    return html`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <div>
          <strong>Fix the following before saving:</strong>
          <ul>
            ${messages.map((message) => html`<li>${message}</li>`)}
          </ul>
        </div>
      </div>
    `;
  }

  private _renderGeneralTab(): unknown {
    if (!this._feed) return nothing;

    const token = this._feed.accessToken;
    const baseUrl = window.location.origin;
    const productsEndpointPath = `${baseUrl}/api/merchello/feeds/${this._feed.slug}.xml`;
    const promotionsEndpointPath = `${baseUrl}/api/merchello/feeds/${this._feed.slug}/promotions.xml`;
    const productsUrl = token
      ? `${productsEndpointPath}?token=${encodeURIComponent(token)}`
      : `${productsEndpointPath}?token=<regenerate-required>`;
    const promotionsUrl = token
      ? `${promotionsEndpointPath}?token=${encodeURIComponent(token)}`
      : `${promotionsEndpointPath}?token=<regenerate-required>`;

    const productsSnapshotStatus = this._feed.hasProductSnapshot
      ? { label: "Ready", color: "positive" as const }
      : this._feed.lastGeneratedUtc
        ? { label: "Missing", color: "warning" as const }
        : { label: "Not generated", color: "default" as const };

    const promotionsSnapshotStatus = this._feed.hasPromotionsSnapshot
      ? { label: "Ready", color: "positive" as const }
      : this._feed.lastGeneratedUtc
        ? { label: "Missing", color: "warning" as const }
        : { label: "Not generated", color: "default" as const };

    const countryOptions = this._countries
      .map((country) => ({
        name: `${country.name} (${country.code})`,
        value: country.code,
        selected: country.code === this._feed?.countryCode,
      }));

    return html`
      <uui-box headline="General Settings">
        <div class="form-stack">
          <umb-property-layout
            class="full-row"
            label="Slug"
            description="Auto-generated from Feed Name using SlugHelper. Edit to override.">
            <uui-input
              slot="editor"
              .value=${this._feed.slug ?? ""}
              @input=${(event: Event) => this._handleSlugInput((event.target as HTMLInputElement).value)}
              maxlength="200"
              placeholder="google-shopping-us">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Feed Status">
            <uui-toggle
              slot="editor"
              label="Feed enabled"
              ?checked=${this._feed.isEnabled}
              @change=${(event: Event) => this._setGeneralField("isEnabled", (event.target as HTMLInputElement).checked)}>
              Feed enabled
            </uui-toggle>
          </umb-property-layout>
        </div>
      </uui-box>

      <uui-box headline="Market Settings">
        <p class="hint">
          Google feed targets are market-specific. Country, currency, and language are required for products and promotions feeds.
        </p>
        <div class="market-grid">
          <umb-property-layout
            label="Country"
            description="Google target country (ISO 3166-1 alpha-2)."
            ?mandatory=${true}
            ?invalid=${!!this._validationErrors.countryCode}>
            ${countryOptions.length > 0
              ? html`
                  <uui-select
                    slot="editor"
                    label="Country"
                    .options=${countryOptions}
                    @change=${(event: Event) => this._setGeneralField("countryCode", (event.target as HTMLSelectElement).value)}
                    ?invalid=${!!this._validationErrors.countryCode}>
                  </uui-select>
                `
              : html`
                  <uui-input
                    slot="editor"
                    .value=${this._feed.countryCode}
                    maxlength="2"
                    @input=${(event: Event) =>
                      this._setGeneralField("countryCode", (event.target as HTMLInputElement).value.toUpperCase())}
                    ?invalid=${!!this._validationErrors.countryCode}
                    placeholder="US">
                  </uui-input>
                `}
          </umb-property-layout>

          <umb-property-layout
            label="Currency"
            description="ISO 4217 currency code."
            ?mandatory=${true}
            ?invalid=${!!this._validationErrors.currencyCode}>
            <uui-input
              slot="editor"
              .value=${this._feed.currencyCode}
              maxlength="3"
              @input=${(event: Event) =>
                this._setGeneralField("currencyCode", (event.target as HTMLInputElement).value.toUpperCase())}
              ?invalid=${!!this._validationErrors.currencyCode}
              placeholder="USD">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout
            label="Language"
            description="Required for Google language targeting (ISO 639-1, e.g. en)."
            ?mandatory=${true}
            ?invalid=${!!this._validationErrors.languageCode}>
            <uui-input
              slot="editor"
              .value=${this._feed.languageCode}
              maxlength="10"
              @input=${(event: Event) =>
                this._setGeneralField("languageCode", (event.target as HTMLInputElement).value.toLowerCase())}
              ?invalid=${!!this._validationErrors.languageCode}
                placeholder="en">
            </uui-input>
          </umb-property-layout>
        </div>

        <div class="market-toggle-row">
          <umb-property-layout
            label="Include Tax In Price"
            description="Controls whether feed prices are tax-inclusive or tax-exclusive for g:price.">
            <uui-toggle
              slot="editor"
              label="Include tax in g:price"
              ?checked=${this._feed.includeTaxInPrice}
              @change=${(event: Event) =>
                this._setGeneralField("includeTaxInPrice", (event.target as HTMLInputElement).checked)}>
              Include tax in g:price
            </uui-toggle>
          </umb-property-layout>
        </div>
      </uui-box>

      ${!this._isNew
        ? html`
            <uui-box headline="Access Token & Feed URLs">
              <div class="token-actions">
                <uui-button
                  look="secondary"
                  ?disabled=${this._isRegeneratingToken}
                  @click=${this._handleRegenerateToken}>
                  ${this._isRegeneratingToken ? "Regenerating..." : "Regenerate Token"}
                </uui-button>
              </div>

              ${token
                ? html`
                    <umb-property-layout label="Current Token">
                      <div slot="editor" class="url-row">
                        <uui-input .value=${token} readonly></uui-input>
                        <uui-button
                          look="secondary"
                          compact
                          @click=${() => this._copyToClipboard(token, "Token copied to clipboard.")}>
                          Copy
                        </uui-button>
                      </div>
                    </umb-property-layout>

                    <umb-property-layout label="Products Endpoint">
                      <div slot="editor" class="url-row">
                        <uui-input .value=${productsUrl} readonly></uui-input>
                        <uui-button
                          look="secondary"
                          compact
                          @click=${() => this._copyToClipboard(productsUrl, "Products URL copied.")}>
                          Copy
                        </uui-button>
                        <uui-button look="secondary" compact href=${productsUrl} target="_blank" rel="noopener">
                          Open
                        </uui-button>
                      </div>
                    </umb-property-layout>

                    <umb-property-layout label="Promotions Endpoint">
                      <div slot="editor" class="url-row">
                        <uui-input .value=${promotionsUrl} readonly></uui-input>
                        <uui-button
                          look="secondary"
                          compact
                          @click=${() => this._copyToClipboard(promotionsUrl, "Promotions URL copied.")}>
                          Copy
                        </uui-button>
                        <uui-button look="secondary" compact href=${promotionsUrl} target="_blank" rel="noopener">
                          Open
                        </uui-button>
                      </div>
                    </umb-property-layout>
                  `
                : html`
                    <umb-property-layout label="Products Endpoint">
                      <div slot="editor" class="url-row">
                        <uui-input .value=${productsUrl} readonly></uui-input>
                        <uui-button
                          look="secondary"
                          compact
                          @click=${() => this._copyToClipboard(productsUrl, "Products endpoint copied.")}>
                          Copy
                        </uui-button>
                      </div>
                    </umb-property-layout>

                    <umb-property-layout label="Promotions Endpoint">
                      <div slot="editor" class="url-row">
                        <uui-input .value=${promotionsUrl} readonly></uui-input>
                        <uui-button
                          look="secondary"
                          compact
                          @click=${() => this._copyToClipboard(promotionsUrl, "Promotions endpoint copied.")}>
                          Copy
                        </uui-button>
                      </div>
                    </umb-property-layout>

                    <p class="hint">
                      The API does not return plaintext tokens after save.
                      If this browser session has no saved token, regenerate to reveal and copy new feed URLs.
                    </p>
                  `}
            </uui-box>

            <uui-box headline="Generation Status">
              <div class="status-grid">
                <div>
                  <strong>Last generated:</strong>
                  <span>${this._feed.lastGeneratedUtc ? formatRelativeDate(this._feed.lastGeneratedUtc) : "Never"}</span>
                </div>
                <div>
                  <strong>Products snapshot:</strong>
                  <uui-tag color=${productsSnapshotStatus.color}>
                    ${productsSnapshotStatus.label}
                  </uui-tag>
                </div>
                <div>
                  <strong>Promotions snapshot:</strong>
                  <uui-tag color=${promotionsSnapshotStatus.color}>
                    ${promotionsSnapshotStatus.label}
                  </uui-tag>
                </div>
              </div>

              ${this._feed.lastGenerationError
                ? html`
                    <div class="error-inline">
                      <uui-icon name="icon-alert"></uui-icon>
                      <span>${this._feed.lastGenerationError}</span>
                    </div>
                  `
                : nothing}

              <p class="hint">
                Snapshots are cached XML outputs used for public feed responses and fallback behavior.
                They are created during rebuild or when feed URLs are requested.
              </p>
            </uui-box>
          `
        : nothing}
    `;
  }

  private _renderSelectionChecklist(
    config: ProductFeedFilterConfigDto,
    onProductTypeChange: (id: string, selected: boolean) => void,
    onCollectionChange: (id: string, selected: boolean) => void,
    onFilterValueChange: (groupId: string, filterId: string, selected: boolean) => void,
    onProductTypeToggleAll: (selected: boolean) => void,
    onCollectionToggleAll: (selected: boolean) => void,
    onFilterGroupToggleAll: (groupId: string, selected: boolean) => void,
  ): unknown {
    const productTypeTotal = this._productTypes.length;
    const productTypeSelected = config.productTypeIds.length;
    const allProductTypesSelected = productTypeTotal > 0 && productTypeSelected === productTypeTotal;
    const hasProductTypeRestriction = productTypeSelected > 0 && !allProductTypesSelected;
    const productTypeStatus = productTypeSelected === 0
      ? `0 of ${productTypeTotal} selected • No restriction (all product types)`
      : allProductTypesSelected
        ? `${productTypeSelected} of ${productTypeTotal} selected • Effectively no restriction`
        : `${productTypeSelected} of ${productTypeTotal} selected • OR logic (any selected type)`;

    const collectionTotal = this._collections.length;
    const collectionSelected = config.collectionIds.length;
    const allCollectionsSelected = collectionTotal > 0 && collectionSelected === collectionTotal;
    const hasCollectionRestriction = collectionSelected > 0;
    const collectionStatus = collectionSelected === 0
      ? `0 of ${collectionTotal} selected • No restriction (all collections + unassigned)`
      : allCollectionsSelected
        ? `${collectionSelected} of ${collectionTotal} selected • OR logic (products must be in at least one collection)`
        : `${collectionSelected} of ${collectionTotal} selected • OR logic (any selected collection)`;

    const activeFilterGroups = config.filterValueGroups.filter((group) => group.filterIds.length > 0);
    const selectedFilterValueCount = activeFilterGroups.reduce((total, group) => total + group.filterIds.length, 0);
    const hasFilterRestriction = activeFilterGroups.length > 0;
    const queryInfo = this._buildSelectionQueryInfo(config);

    return html`
      <div class="selection-stack">
      <uui-box headline="Selection Logic">
        <div class="logic-grid">
          <section class="logic-rule">
            <div class="logic-rule-header">
              <strong>1. Product Types</strong>
              <uui-tag color=${hasProductTypeRestriction ? "warning" : "positive"}>
                ${hasProductTypeRestriction ? "Active • OR" : "No restriction"}
              </uui-tag>
            </div>
            <p class="hint">A product matches if its type is any selected type.</p>
          </section>

          <section class="logic-rule">
            <div class="logic-rule-header">
              <strong>2. Collections</strong>
              <uui-tag color=${hasCollectionRestriction ? "warning" : "positive"}>
                ${hasCollectionRestriction ? "Active • OR" : "No restriction"}
              </uui-tag>
            </div>
            <p class="hint">
              A product matches if it is in any selected collection. If none are selected, collection matching is not used.
            </p>
          </section>

          <section class="logic-rule">
            <div class="logic-rule-header">
              <strong>3. Filter Values</strong>
              <uui-tag color=${hasFilterRestriction ? "warning" : "positive"}>
                ${hasFilterRestriction ? "Active • AND across groups" : "No restriction"}
              </uui-tag>
            </div>
            <p class="hint">
              Within each selected group values are OR. Across selected groups, products must match every group (AND).
            </p>
          </section>
        </div>

        <div class="logic-summary">
          <strong>Current rule summary:</strong>
          <ul class="logic-list">
            <li>Product Types: ${hasProductTypeRestriction ? "restricted" : "not restricted"}</li>
            <li>Collections: ${hasCollectionRestriction ? "restricted" : "not restricted"}</li>
            <li>Filter Values: ${hasFilterRestriction ? `${activeFilterGroups.length} groups / ${selectedFilterValueCount} values active` : "not restricted"}</li>
          </ul>
        </div>

        <div class="query-builder">
          <div class="query-builder-header">
            <strong>Effective Query</strong>
            <uui-tag color="default">Live preview</uui-tag>
          </div>

          <p class="query-english">${queryInfo.english}</p>
          <code class="query-expression">${queryInfo.expression}</code>

          <div class="query-groups">
            <section class="query-group">
              <strong>Product Types</strong>
              <div class="query-tag-list">
                ${queryInfo.productTypeNames.length > 0
                  ? queryInfo.productTypeNames.map((name) => html`<uui-tag color="warning">${name}</uui-tag>`)
                  : html`<uui-tag color="positive">Any</uui-tag>`}
              </div>
            </section>

            <section class="query-group">
              <strong>Collections</strong>
              <div class="query-tag-list">
                ${queryInfo.collectionNames.length > 0
                  ? queryInfo.collectionNames.map((name) => html`<uui-tag color="warning">${name}</uui-tag>`)
                  : html`<uui-tag color="positive">Any</uui-tag>`}
              </div>
            </section>

            <section class="query-group full-width">
              <strong>Filter Values</strong>
              ${queryInfo.filterGroups.length === 0
                ? html`
                    <div class="query-tag-list">
                      <uui-tag color="positive">Any</uui-tag>
                    </div>
                  `
                : html`
                    <div class="query-filter-groups">
                      ${queryInfo.filterGroups.map((group) => html`
                        <div class="query-filter-group">
                          <span class="query-filter-group-name">${group.groupName}</span>
                          <div class="query-tag-list">
                            ${group.valueNames.map((name) => html`<uui-tag color="warning">${name}</uui-tag>`)}
                          </div>
                        </div>
                      `)}
                    </div>
                  `}
            </section>
          </div>
        </div>
      </uui-box>

      <uui-box headline="Product Types">
        ${productTypeTotal > 0
          ? html`
              <div class="selection-toolbar">
                <div class="selection-meta">
                  <span class="selection-count">${productTypeStatus}</span>
                  <div class="selection-actions">
                    <uui-button
                      compact
                      look="secondary"
                      ?disabled=${allProductTypesSelected}
                      @click=${() => onProductTypeToggleAll(true)}>
                      Select all
                    </uui-button>
                    <uui-button
                      compact
                      look="secondary"
                      ?disabled=${productTypeSelected === 0}
                      @click=${() => onProductTypeToggleAll(false)}>
                      Clear
                    </uui-button>
                  </div>
                </div>
              </div>
              <p class="hint selection-hint">
                Matches products with any selected product type (OR).
              </p>
            `
          : nothing}
        ${this._productTypes.length === 0
          ? html`<p class="hint">No product types found.</p>`
          : html`
              <div class="checkbox-grid">
                ${this._productTypes.map((productType) => {
                  const checked = config.productTypeIds.includes(productType.id);
                  return html`
                    <uui-checkbox
                      ?checked=${checked}
                      @change=${(event: Event) =>
                        onProductTypeChange(productType.id, (event.target as HTMLInputElement).checked)}>
                      ${productType.name}
                    </uui-checkbox>
                  `;
                })}
              </div>
            `}
      </uui-box>

      <uui-box headline="Collections">
        ${collectionTotal > 0
          ? html`
              <div class="selection-toolbar">
                <div class="selection-meta">
                  <span class="selection-count">${collectionStatus}</span>
                  <div class="selection-actions">
                    <uui-button
                      compact
                      look="secondary"
                      ?disabled=${allCollectionsSelected}
                      @click=${() => onCollectionToggleAll(true)}>
                      Select all
                    </uui-button>
                    <uui-button
                      compact
                      look="secondary"
                      ?disabled=${collectionSelected === 0}
                      @click=${() => onCollectionToggleAll(false)}>
                      Clear
                    </uui-button>
                  </div>
                </div>
              </div>
              <p class="hint selection-hint">
                Matches products in any selected collection (OR). If any collection is selected, products with no collections are excluded.
              </p>
            `
          : nothing}
        ${this._collections.length === 0
          ? html`<p class="hint">No collections found.</p>`
          : html`
              <div class="checkbox-grid">
                ${this._collections.map((collection) => {
                  const checked = config.collectionIds.includes(collection.id);
                  return html`
                    <uui-checkbox
                      ?checked=${checked}
                      @change=${(event: Event) =>
                        onCollectionChange(collection.id, (event.target as HTMLInputElement).checked)}>
                      ${collection.name}
                    </uui-checkbox>
                  `;
                })}
              </div>
            `}
      </uui-box>

      <uui-box headline="Filter Values">
        <p class="hint">Within each group values are OR. Across groups selection is AND.</p>
        <p class="hint selection-hint">
          Selecting all values in a group still requires the product to have at least one value from that group.
        </p>
        ${this._filterGroups.length === 0
          ? html`<p class="hint">No filter groups found.</p>`
          : html`
              <div class="group-list">
                ${this._filterGroups.map((group) => {
                  const selectedForGroup = config.filterValueGroups.find((x) => x.filterGroupId === group.id);
                  const selectedCount = this._getSelectedFilterCount(config, group.id);
                  const totalCount = (group.filters ?? []).length;
                  const isGroupFullySelected = totalCount > 0 && selectedCount === totalCount;
                  const groupStatus = selectedCount === 0
                    ? `0 of ${totalCount} selected • Group ignored`
                    : `${selectedCount} of ${totalCount} selected • OR in this group`;
                  return html`
                    <section class="group-card">
                      <div class="selection-toolbar selection-toolbar-with-title">
                        <h4>${group.name}</h4>
                        <div class="selection-meta">
                          <span class="selection-count">${groupStatus}</span>
                          <div class="selection-actions">
                            <uui-button
                              compact
                              look="secondary"
                              ?disabled=${isGroupFullySelected}
                              @click=${() => onFilterGroupToggleAll(group.id, true)}>
                              Select all
                            </uui-button>
                            <uui-button
                              compact
                              look="secondary"
                              ?disabled=${selectedCount === 0}
                              @click=${() => onFilterGroupToggleAll(group.id, false)}>
                              Clear
                            </uui-button>
                          </div>
                        </div>
                      </div>
                      <div class="checkbox-grid">
                        ${(group.filters ?? []).map((filter) => {
                          const checked = selectedForGroup?.filterIds.includes(filter.id) ?? false;
                          return html`
                            <uui-checkbox
                              ?checked=${checked}
                              @change=${(event: Event) =>
                                onFilterValueChange(group.id, filter.id, (event.target as HTMLInputElement).checked)}>
                              ${filter.name}
                            </uui-checkbox>
                          `;
                        })}
                      </div>
                    </section>
                  `;
                })}
              </div>
            `}
      </uui-box>
      </div>
    `;
  }

  private _renderSelectionTab(): unknown {
    if (!this._feed) return nothing;

    return html`
      ${this._renderSelectionChecklist(
        this._feed.filterConfig,
        (id, selected) => this._handleRootSelectionChange("productTypeIds", id, selected),
        (id, selected) => this._handleRootSelectionChange("collectionIds", id, selected),
        (groupId, filterId, selected) => this._handleRootFilterValueChange(groupId, filterId, selected),
        (selected) =>
          this._setRootSelectionIds(
            "productTypeIds",
            selected ? this._productTypes.map((productType) => productType.id) : [],
          ),
        (selected) =>
          this._setRootSelectionIds(
            "collectionIds",
            selected ? this._collections.map((collection) => collection.id) : [],
          ),
        (groupId, selected) => this._setRootFilterGroupSelection(groupId, selected),
      )}
    `;
  }

  private _renderManualPromotion(promotion: ProductFeedManualPromotionDto, index: number): unknown {
    return html`
      <uui-box headline=${promotion.name?.trim() ? promotion.name : `Manual Promotion ${index + 1}`}>
        <div class="promotion-actions">
          <uui-button look="secondary" color="danger" compact @click=${() => this._removeManualPromotion(index)}>
            Remove
          </uui-button>
        </div>

        ${this._validationErrors[`promotionName-${index}`]
          ? html`<p class="error-message">${this._validationErrors[`promotionName-${index}`]}</p>`
          : nothing}

        ${this._validationErrors[`promotionId-${index}`]
          ? html`<p class="error-message">${this._validationErrors[`promotionId-${index}`]}</p>`
          : nothing}

        ${this._validationErrors[`promotionCoupon-${index}`]
          ? html`<p class="error-message">${this._validationErrors[`promotionCoupon-${index}`]}</p>`
          : nothing}

        ${this._validationErrors[`promotionValue-${index}`]
          ? html`<p class="error-message">${this._validationErrors[`promotionValue-${index}`]}</p>`
          : nothing}

        <div class="grid promotion-grid">
          <umb-property-layout label="Promotion ID" ?mandatory=${true}>
            <uui-input
              slot="editor"
              .value=${promotion.promotionId}
              @input=${(event: Event) =>
                this._updateManualPromotion(index, (item) => ({
                  ...item,
                  promotionId: (event.target as HTMLInputElement).value,
                }))}>
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Name" ?mandatory=${true}>
            <uui-input
              slot="editor"
              .value=${promotion.name}
              @input=${(event: Event) =>
                this._updateManualPromotion(index, (item) => ({
                  ...item,
                  name: (event.target as HTMLInputElement).value,
                }))}>
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Priority">
            <uui-input
              slot="editor"
              type="number"
              .value=${String(promotion.priority ?? 1000)}
              @input=${(event: Event) =>
                this._updateManualPromotion(index, (item) => ({
                  ...item,
                  priority: parseInt((event.target as HTMLInputElement).value || "1000", 10),
                }))}>
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Description">
            <uui-textarea
              slot="editor"
              .value=${promotion.description ?? ""}
              @input=${(event: Event) =>
                this._updateManualPromotion(index, (item) => ({
                  ...item,
                  description: (event.target as HTMLTextAreaElement).value || null,
                }))}>
            </uui-textarea>
          </umb-property-layout>

          <umb-property-layout label="Requires Coupon">
            <uui-toggle
              slot="editor"
              label="Requires coupon code"
              ?checked=${promotion.requiresCouponCode}
              @change=${(event: Event) =>
                this._updateManualPromotion(index, (item) => ({
                  ...item,
                  requiresCouponCode: (event.target as HTMLInputElement).checked,
                  couponCode: (event.target as HTMLInputElement).checked ? item.couponCode : null,
                }))}>
              Requires coupon code
            </uui-toggle>
          </umb-property-layout>

          ${promotion.requiresCouponCode
            ? html`
                <umb-property-layout label="Coupon Code" ?mandatory=${true}>
                  <uui-input
                    slot="editor"
                    .value=${promotion.couponCode ?? ""}
                    @input=${(event: Event) =>
                      this._updateManualPromotion(index, (item) => ({
                        ...item,
                        couponCode: (event.target as HTMLInputElement).value || null,
                      }))}>
                  </uui-input>
                </umb-property-layout>
              `
            : nothing}

          <umb-property-layout label="Starts At (UTC)">
            <input
              slot="editor"
              type="datetime-local"
              .value=${this._toDateTimeLocal(promotion.startsAtUtc)}
              @change=${(event: Event) =>
                this._updateManualPromotion(index, (item) => ({
                  ...item,
                  startsAtUtc: this._fromDateTimeLocal((event.target as HTMLInputElement).value),
                }))}>
          </umb-property-layout>

          <umb-property-layout label="Ends At (UTC)">
            <input
              slot="editor"
              type="datetime-local"
              .value=${this._toDateTimeLocal(promotion.endsAtUtc)}
              @change=${(event: Event) =>
                this._updateManualPromotion(index, (item) => ({
                  ...item,
                  endsAtUtc: this._fromDateTimeLocal((event.target as HTMLInputElement).value),
                }))}>
          </umb-property-layout>

          <umb-property-layout label="Percent Off">
            <uui-input
              slot="editor"
              type="number"
              min="0"
              max="100"
              step="0.01"
              .value=${promotion.percentOff == null ? "" : String(promotion.percentOff)}
              @input=${(event: Event) =>
                this._updateManualPromotion(index, (item) => ({
                  ...item,
                  percentOff: (event.target as HTMLInputElement).value
                    ? Number((event.target as HTMLInputElement).value)
                    : null,
                }))}>
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Amount Off">
            <uui-input
              slot="editor"
              type="number"
              min="0"
              step="0.01"
              .value=${promotion.amountOff == null ? "" : String(promotion.amountOff)}
              @input=${(event: Event) =>
                this._updateManualPromotion(index, (item) => ({
                  ...item,
                  amountOff: (event.target as HTMLInputElement).value
                    ? Number((event.target as HTMLInputElement).value)
                    : null,
                }))}>
            </uui-input>
          </umb-property-layout>
        </div>

        <div class="promotion-filter-section">
          <h4>Promotion Filters</h4>
          ${this._renderSelectionChecklist(
            promotion.filterConfig,
            (id, selected) => this._handleManualPromotionSelectionChange(index, "productTypeIds", id, selected),
            (id, selected) => this._handleManualPromotionSelectionChange(index, "collectionIds", id, selected),
            (groupId, filterId, selected) =>
              this._handleManualPromotionFilterValueChange(index, groupId, filterId, selected),
            (selected) =>
              this._setManualPromotionSelectionIds(
                index,
                "productTypeIds",
                selected ? this._productTypes.map((productType) => productType.id) : [],
              ),
            (selected) =>
              this._setManualPromotionSelectionIds(
                index,
                "collectionIds",
                selected ? this._collections.map((collection) => collection.id) : [],
              ),
            (groupId, selected) => this._setManualPromotionFilterGroupSelection(index, groupId, selected),
          )}
        </div>
      </uui-box>
    `;
  }

  private _renderPromotionsTab(): unknown {
    if (!this._feed) return nothing;

    return html`
      <uui-box headline="Automatic Promotions">
        <p class="hint">
          Discount promotions are generated automatically from eligible discounts with <code>showInFeed=true</code>.
          Use manual promotions below for feed-specific campaigns.
        </p>
      </uui-box>

      <uui-box headline="Manual Promotions">
        <div class="promotion-actions">
          <uui-button look="secondary" @click=${this._addManualPromotion}>
            <uui-icon name="icon-add" slot="icon"></uui-icon>
            Add Manual Promotion
          </uui-button>
        </div>
      </uui-box>

      ${this._feed.manualPromotions.length === 0
        ? html`
            <merchello-empty-state
              icon="icon-megaphone"
              headline="No manual promotions"
              message="Add a promotion if you need feed-specific campaigns beyond auto-exported discounts.">
            </merchello-empty-state>
          `
        : html`${this._feed.manualPromotions.map((promotion, index) => this._renderManualPromotion(promotion, index))}`}
    `;
  }

  private _renderResolverOptions(selectedAlias: string | null): Array<{ name: string; value: string; selected: boolean }> {
    const normalizedSelectedAlias = selectedAlias?.trim().toLowerCase() ?? "";
    return [
      {
        name: "Select resolver...",
        value: "",
        selected: !selectedAlias,
      },
      ...this._resolvers.map((resolver) => {
        const displayName = resolver.displayName?.trim() || resolver.alias;
        const showAlias = displayName.toLowerCase() !== resolver.alias.trim().toLowerCase();
        return {
          name: showAlias ? `${displayName} (${resolver.alias})` : displayName,
          value: resolver.alias,
          selected: resolver.alias.trim().toLowerCase() === normalizedSelectedAlias,
        };
      }),
    ];
  }

  private _renderSourceOptions(selectedSourceType: string): Array<{ name: string; value: string; selected: boolean }> {
    return [
      { name: "Static", value: "static", selected: selectedSourceType !== "resolver" },
      { name: "Resolver", value: "resolver", selected: selectedSourceType === "resolver" },
    ];
  }

  private _renderCustomLabelsTab(): unknown {
    if (!this._feed) return nothing;

    return html`
      <uui-box headline="Custom Labels (0-4)">
        <p class="hint">
          Configure each Google custom label slot with a static value or a resolver.
        </p>
        <p class="hint">
          Resolver values are computed per product when feed XML is generated. Use static values when the same value applies to all products.
        </p>
      </uui-box>

      ${this._feed.customLabels.map((label) => {
        const error = this._validationErrors[`customLabel-${label.slot}`];
        const argsError = this._customLabelArgsErrors[label.slot];
        const argsText = this._customLabelArgsText[label.slot] ?? "{}";
        const isResolverSource = label.sourceType === "resolver";
        const hasSelectedResolver = isResolverSource && !!label.resolverAlias?.trim();
        const resolverSupportsArgs = isResolverSource && this._resolverSupportsArgs(label.resolverAlias);
        const resolverHelpText = this._getResolverHelpText(label.resolverAlias);
        const resolverArgsHelp = this._getResolverArgsHelpText(label.resolverAlias);
        const resolverArgsExample = this._getResolverArgsExample(label.resolverAlias);

        return html`
          <uui-box headline=${`Custom Label ${label.slot}`}>
            ${error ? html`<p class="error-message">${error}</p>` : nothing}

            <div class="grid two-col-grid">
              <umb-property-layout label="Source Type">
                <uui-select
                  slot="editor"
                  label="Source Type"
                  .options=${this._renderSourceOptions(label.sourceType)}
                  @change=${(event: Event) =>
                    this._updateCustomLabel(label.slot, (item) => ({
                      ...item,
                      sourceType: (event.target as HTMLSelectElement).value || "static",
                    }))}>
                </uui-select>
              </umb-property-layout>

              ${isResolverSource
                ? html`
                    <umb-property-layout label="Resolver" ?mandatory=${true}>
                      <uui-select
                        slot="editor"
                        label="Resolver"
                        .options=${this._renderResolverOptions(label.resolverAlias)}
                        @change=${(event: Event) =>
                          this._updateCustomLabel(label.slot, (item) => ({
                            ...item,
                            resolverAlias: (event.target as HTMLSelectElement).value || null,
                          }))}>
                      </uui-select>
                    </umb-property-layout>
                  `
                : html`
                    <umb-property-layout label="Static Value">
                      <uui-input
                        slot="editor"
                        .value=${label.staticValue ?? ""}
                        @input=${(event: Event) =>
                          this._updateCustomLabel(label.slot, (item) => ({
                            ...item,
                            staticValue: (event.target as HTMLInputElement).value || null,
                          }))}>
                      </uui-input>
                    </umb-property-layout>
                  `}

              <div class="resolver-panel full-row">
                ${isResolverSource
                  ? html`
                      ${hasSelectedResolver
                        ? html`<p class="hint resolver-help">${resolverHelpText}</p>`
                        : html`<p class="hint">Select a resolver to view details.</p>`}

                      ${hasSelectedResolver && resolverSupportsArgs
                        ? html`
                            <umb-property-layout label="Resolver Parameters (JSON)" class="full-row">
                              <uui-textarea
                                slot="editor"
                                .value=${argsText}
                                ?invalid=${!!argsError}
                                @input=${(event: Event) =>
                                  this._handleCustomLabelArgsInput(label.slot, (event.target as HTMLTextAreaElement).value)}>
                              </uui-textarea>
                              ${argsError
                                ? html`<p class="error-message">${argsError}</p>`
                                : html`
                                    <p class="hint">${resolverArgsHelp}</p>
                                    <p class="hint">Example: <code>${resolverArgsExample}</code></p>
                                  `}
                            </umb-property-layout>
                          `
                        : nothing}

                      ${hasSelectedResolver && !resolverSupportsArgs
                        ? html`<p class="hint resolver-no-args">This resolver does not take parameters.</p>`
                        : nothing}
                    `
                  : html`<p class="hint">Static mode: this value is used for every product in this feed.</p>`}
              </div>
            </div>
          </uui-box>
        `;
      })}
    `;
  }

  private _renderCustomFieldsTab(): unknown {
    if (!this._feed) return nothing;

    return html`
      <uui-box headline="Custom Fields">
        <div class="promotion-actions">
          <uui-button look="secondary" @click=${this._addCustomField}>
            <uui-icon name="icon-add" slot="icon"></uui-icon>
            Add Custom Field
          </uui-button>
        </div>
        <p class="hint">
          Only attributes on the Google whitelist are accepted by the backend.
        </p>
        <p class="hint">
          Resolver-based fields are calculated per product at generation time, while static fields use the same value for all products.
        </p>
      </uui-box>

      ${this._feed.customFields.length === 0
        ? html`
            <merchello-empty-state
              icon="icon-add"
              headline="No custom fields"
              message="Add custom attributes for additional Google feed fields.">
            </merchello-empty-state>
          `
        : html`
            ${this._feed.customFields.map((field, index) => {
              const fieldError = this._validationErrors[`customField-${index}`];
              const resolverError = this._validationErrors[`customFieldResolver-${index}`];
              const argsError = this._customFieldArgsErrors[index];
              const argsText = this._customFieldArgsText[index] ?? "{}";
              const isResolverSource = field.sourceType === "resolver";
              const hasSelectedResolver = isResolverSource && !!field.resolverAlias?.trim();
              const resolverSupportsArgs = isResolverSource && this._resolverSupportsArgs(field.resolverAlias);
              const resolverHelpText = this._getResolverHelpText(field.resolverAlias);
              const resolverArgsHelp = this._getResolverArgsHelpText(field.resolverAlias);
              const resolverArgsExample = this._getResolverArgsExample(field.resolverAlias);

              return html`
                <uui-box headline=${field.attribute ? field.attribute : `Custom Field ${index + 1}`}>
                  <div class="promotion-actions">
                    <uui-button look="secondary" color="danger" compact @click=${() => this._removeCustomField(index)}>
                      Remove
                    </uui-button>
                  </div>

                  ${fieldError ? html`<p class="error-message">${fieldError}</p>` : nothing}
                  ${resolverError ? html`<p class="error-message">${resolverError}</p>` : nothing}

                  <div class="grid two-col-grid">
                    <umb-property-layout label="Attribute" ?mandatory=${true}>
                      <uui-input
                        slot="editor"
                        .value=${field.attribute}
                        @input=${(event: Event) =>
                          this._updateCustomField(index, (item) => ({
                            ...item,
                            attribute: (event.target as HTMLInputElement).value,
                          }))}
                        placeholder="e.g. product_highlight">
                      </uui-input>
                    </umb-property-layout>

                    <umb-property-layout label="Source Type">
                      <uui-select
                        slot="editor"
                        label="Source Type"
                        .options=${this._renderSourceOptions(field.sourceType)}
                        @change=${(event: Event) =>
                          this._updateCustomField(index, (item) => ({
                            ...item,
                            sourceType: (event.target as HTMLSelectElement).value || "static",
                          }))}>
                      </uui-select>
                    </umb-property-layout>

                    ${isResolverSource
                      ? html`
                          <umb-property-layout label="Resolver" ?mandatory=${true}>
                            <uui-select
                              slot="editor"
                              label="Resolver"
                              .options=${this._renderResolverOptions(field.resolverAlias)}
                              @change=${(event: Event) =>
                                this._updateCustomField(index, (item) => ({
                                  ...item,
                                  resolverAlias: (event.target as HTMLSelectElement).value || null,
                                }))}>
                            </uui-select>
                          </umb-property-layout>
                        `
                      : html`
                          <umb-property-layout label="Static Value">
                            <uui-input
                              slot="editor"
                              .value=${field.staticValue ?? ""}
                              @input=${(event: Event) =>
                                this._updateCustomField(index, (item) => ({
                                  ...item,
                                  staticValue: (event.target as HTMLInputElement).value || null,
                                }))}>
                            </uui-input>
                          </umb-property-layout>
                        `}

                    <div class="resolver-panel">
                      ${isResolverSource
                        ? html`
                            ${hasSelectedResolver
                              ? html`<p class="hint resolver-help">${resolverHelpText}</p>`
                              : html`<p class="hint">Select a resolver to view details.</p>`}
                            ${hasSelectedResolver && resolverSupportsArgs
                              ? html`<p class="hint">This resolver supports parameters. Configure them below.</p>`
                              : nothing}

                            ${hasSelectedResolver && !resolverSupportsArgs
                              ? html`<p class="hint resolver-no-args">This resolver does not take parameters.</p>`
                              : nothing}
                          `
                        : html`<p class="hint">Static mode: this value is used for every product in this feed.</p>`}
                    </div>

                    ${hasSelectedResolver && resolverSupportsArgs
                      ? html`
                          <umb-property-layout label="Resolver Parameters (JSON)" class="full-row">
                            <uui-textarea
                              slot="editor"
                              .value=${argsText}
                              ?invalid=${!!argsError}
                              @input=${(event: Event) =>
                                this._handleCustomFieldArgsInput(index, (event.target as HTMLTextAreaElement).value)}>
                            </uui-textarea>
                            ${argsError
                              ? html`<p class="error-message">${argsError}</p>`
                              : html`
                                  <p class="hint">${resolverArgsHelp}</p>
                                  <p class="hint">Example: <code>${resolverArgsExample}</code></p>
                                `}
                          </umb-property-layout>
                        `
                      : nothing}
                  </div>
                </uui-box>
              `;
            })}
          `}
    `;
  }

  private _renderPreviewTab(): unknown {
    if (!this._feed) return nothing;

    if (this._isNew || !this._feed.id) {
      return html`
        <uui-box headline="Preview">
          <p class="hint">Save this feed first, then preview diagnostics and sample output.</p>
        </uui-box>
      `;
    }

    return html`
      <uui-box headline="Preview & Diagnostics">
        <div class="promotion-actions">
          <uui-button look="secondary" ?disabled=${this._isPreviewLoading} @click=${this._handlePreview}>
            ${this._isPreviewLoading ? "Loading preview..." : "Refresh Preview"}
          </uui-button>
          <uui-button look="secondary" ?disabled=${this._isRebuilding} @click=${this._handleRebuild}>
            ${this._isRebuilding ? "Rebuilding..." : "Rebuild Now"}
          </uui-button>
        </div>

        ${this._preview
          ? html`
              <div class="status-grid">
                <div>
                  <strong>Products:</strong>
                  <span>${this._preview.productItemCount}</span>
                </div>
                <div>
                  <strong>Promotions:</strong>
                  <span>${this._preview.promotionCount}</span>
                </div>
                <div>
                  <strong>Warnings:</strong>
                  <span>${this._preview.warnings.length}</span>
                </div>
              </div>

              ${this._preview.error
                ? html`
                    <div class="error-inline">
                      <uui-icon name="icon-alert"></uui-icon>
                      <span>${this._preview.error}</span>
                    </div>
                  `
                : nothing}

              ${this._preview.warnings.length > 0
                ? html`
                    <h4>Warnings</h4>
                    <ul class="bullet-list">
                      ${this._preview.warnings.map((warning) => html`<li>${warning}</li>`)}
                    </ul>
                  `
                : html`<p class="hint">No warnings in the current preview.</p>`}

              ${this._preview.sampleProductIds.length > 0
                ? html`
                    <h4>Sample Product IDs</h4>
                    <ul class="bullet-list mono">
                      ${this._preview.sampleProductIds.map((id) => html`<li>${id}</li>`)}
                    </ul>
                  `
                : nothing}
            `
          : html`<p class="hint">Run preview to inspect generated output and warnings.</p>`}
      </uui-box>

      ${this._lastRebuild
        ? html`
            <uui-box headline="Last Rebuild Result">
              <div class="status-grid">
                <div>
                  <strong>Status:</strong>
                  <uui-tag color=${this._lastRebuild.success ? "positive" : "danger"}>
                    ${this._lastRebuild.success ? "Success" : "Failed"}
                  </uui-tag>
                </div>
                <div>
                  <strong>Generated:</strong>
                  <span>${formatRelativeDate(this._lastRebuild.generatedAtUtc)}</span>
                </div>
                <div>
                  <strong>Warnings:</strong>
                  <span>${this._lastRebuild.warningCount}</span>
                </div>
              </div>

              ${this._lastRebuild.error
                ? html`
                    <div class="error-inline">
                      <uui-icon name="icon-alert"></uui-icon>
                      <span>${this._lastRebuild.error}</span>
                    </div>
                  `
                : nothing}

              ${this._lastRebuild.warnings.length > 0
                ? html`
                    <ul class="bullet-list">
                      ${this._lastRebuild.warnings.map((warning) => html`<li>${warning}</li>`)}
                    </ul>
                  `
                : nothing}
            </uui-box>
          `
        : nothing}
    `;
  }

  private _renderActiveTab(): unknown {
    const activeTab = this._getActiveTab();

    if (activeTab === "selection") return this._renderSelectionTab();
    if (activeTab === "promotions") return this._renderPromotionsTab();
    if (activeTab === "custom-labels") return this._renderCustomLabelsTab();
    if (activeTab === "custom-fields") return this._renderCustomFieldsTab();
    if (activeTab === "preview") return this._renderPreviewTab();
    return this._renderGeneralTab();
  }

  private _renderTabs(): unknown {
    const activeTab = this._getActiveTab();
    return html`
      <uui-tab-group slot="header">
        <uui-tab label="General" href=${this._getTabHref("general")} ?active=${activeTab === "general"}>
          General
        </uui-tab>
        <uui-tab label="Selection" href=${this._getTabHref("selection")} ?active=${activeTab === "selection"}>
          Selection
        </uui-tab>
        <uui-tab label="Promotions" href=${this._getTabHref("promotions")} ?active=${activeTab === "promotions"}>
          Promotions
        </uui-tab>
        <uui-tab label="Custom Labels" href=${this._getTabHref("custom-labels")} ?active=${activeTab === "custom-labels"}>
          Custom Labels
        </uui-tab>
        <uui-tab label="Custom Fields" href=${this._getTabHref("custom-fields")} ?active=${activeTab === "custom-fields"}>
          Custom Fields
        </uui-tab>
        <uui-tab label="Preview" href=${this._getTabHref("preview")} ?active=${activeTab === "preview"}>
          Preview
        </uui-tab>
      </uui-tab-group>
    `;
  }

  override render() {
    if (this._isLoading) {
      return html`
        <umb-body-layout>
          <div class="loading">
            <uui-loader></uui-loader>
          </div>
        </umb-body-layout>
      `;
    }

    if (this._loadError) {
      return html`
        <umb-body-layout>
          <merchello-empty-state
            icon="icon-alert"
            headline="Unable to load product feed"
            message=${this._loadError}>
            <uui-button slot="action" look="primary" href=${getProductFeedsListHref()}>
              Back to Feeds
            </uui-button>
          </merchello-empty-state>
        </umb-body-layout>
      `;
    }

    if (!this._feed) {
      return html`
        <umb-body-layout>
          <merchello-empty-state
            icon="icon-rss"
            headline="Feed not found"
            message="The requested feed could not be loaded.">
            <uui-button slot="action" look="primary" href=${getProductFeedsListHref()}>
              Back to Feeds
            </uui-button>
          </merchello-empty-state>
        </umb-body-layout>
      `;
    }

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <uui-button slot="header" compact href=${getProductFeedsListHref()} label="Back" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <div id="header" slot="header">
          <umb-icon name="icon-rss"></umb-icon>
          <uui-input
            id="name-input"
            label="Feed Name"
            .value=${this._feed.name}
            ?required=${true}
            ?invalid=${!!this._validationErrors.name}
            @input=${(event: Event) => this._handleNameInput((event.target as HTMLInputElement).value)}
            placeholder=${this._isNew ? "Enter feed name..." : "Feed name"}>
          </uui-input>
          <uui-tag color=${this._feed.isEnabled ? "positive" : "default"}>
            ${this._feed.isEnabled ? "Enabled" : "Disabled"}
          </uui-tag>
        </div>

        <umb-body-layout header-fit-height header-no-padding>
          ${this._renderTabs()}

          <umb-router-slot
            .routes=${this._routes}
            @init=${this._onRouterInit}
            @change=${this._onRouterChange}>
          </umb-router-slot>

          <div class="tab-content">
            ${this._renderErrors()}
            ${this._renderActiveTab()}
          </div>
        </umb-body-layout>

        <umb-footer-layout slot="footer">
          ${!this._isNew
            ? html`
                <uui-button
                  slot="actions"
                  look="secondary"
                  color="danger"
                  @click=${this._handleDelete}>
                  Delete
                </uui-button>
              `
            : nothing}

          ${!this._isNew
            ? html`
                <uui-button
                  slot="actions"
                  look="secondary"
                  ?disabled=${this._isRebuilding}
                  @click=${this._handleRebuild}>
                  ${this._isRebuilding ? "Rebuilding..." : "Rebuild Now"}
                </uui-button>
              `
            : nothing}

          <uui-button
            slot="actions"
            look="primary"
            color="positive"
            ?disabled=${this._isSaving}
            @click=${this._handleSave}>
            ${this._isSaving
              ? this._isNew ? "Creating..." : "Saving..."
              : this._isNew ? "Create Feed" : "Save Changes"}
          </uui-button>
        </umb-footer-layout>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
      height: 100%;
      --uui-tab-background: var(--uui-color-surface);
    }

    .back-button {
      margin-right: var(--uui-size-space-2);
    }

    #header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      flex: 1;
      padding: var(--uui-size-space-4) 0;
    }

    #header umb-icon {
      font-size: 24px;
      color: var(--uui-color-text-alt);
    }

    #name-input {
      flex: 1;
      --uui-input-border-color: transparent;
      --uui-input-background-color: transparent;
      font-size: var(--uui-type-h5-size);
      font-weight: 700;
    }

    #name-input:hover,
    #name-input:focus-within {
      --uui-input-border-color: var(--uui-color-border);
      --uui-input-background-color: var(--uui-color-surface);
    }

    umb-router-slot {
      display: none;
    }

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 320px;
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
      padding: var(--uui-size-layout-1);
    }

    uui-tab-group {
      --uui-tab-divider: var(--uui-color-border);
      width: 100%;
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    .form-stack {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .full-row {
      width: 100%;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--uui-size-space-4);
    }

    .grid > .full-row {
      grid-column: 1 / -1;
    }

    .two-col-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: start;
    }

    .two-col-grid > umb-property-layout,
    .two-col-grid > .resolver-panel {
      width: 100%;
      min-width: 0;
    }

    .market-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: var(--uui-size-space-4);
      margin-top: var(--uui-size-space-4);
    }

    .market-toggle-row {
      margin-top: var(--uui-size-space-4);
    }

    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--uui-size-space-4);
    }

    .status-grid div {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .error-banner {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: flex-start;
      background: color-mix(in srgb, var(--uui-color-danger) 10%, var(--uui-color-surface));
      border: 1px solid color-mix(in srgb, var(--uui-color-danger) 35%, var(--uui-color-surface));
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
    }

    .error-banner ul {
      margin: var(--uui-size-space-2) 0 0;
      padding-left: 20px;
    }

    .error-inline {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: center;
      color: var(--uui-color-danger-emphasis);
      margin-top: var(--uui-size-space-3);
    }

    .error-message {
      margin: 0 0 var(--uui-size-space-2);
      color: var(--uui-color-danger-emphasis);
      font-size: var(--uui-type-small-size);
    }

    .hint {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
      margin: var(--uui-size-space-2) 0 0;
    }

    .token-actions,
    .promotion-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-3);
      flex-wrap: wrap;
    }

    .url-row {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: center;
    }

    .url-row uui-input {
      flex: 1;
    }

    .selection-stack {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .logic-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-3);
    }

    .logic-rule {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
      background: color-mix(in srgb, var(--uui-color-surface) 95%, var(--uui-color-border) 5%);
    }

    .logic-rule-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .logic-summary {
      border-top: 1px solid var(--uui-color-border);
      padding-top: var(--uui-size-space-3);
    }

    .logic-list {
      margin: var(--uui-size-space-2) 0 0;
      padding-left: 20px;
    }

    .query-builder {
      border-top: 1px solid var(--uui-color-border);
      margin-top: var(--uui-size-space-3);
      padding-top: var(--uui-size-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .query-builder-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .query-english {
      margin: 0;
      color: var(--uui-color-text);
    }

    .query-expression {
      display: block;
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
      font-family: var(--uui-font-monospace);
      background: color-mix(in srgb, var(--uui-color-surface) 96%, var(--uui-color-border) 4%);
      white-space: pre-wrap;
      word-break: break-word;
    }

    .query-groups {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--uui-size-space-3);
    }

    .query-group {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      background: color-mix(in srgb, var(--uui-color-surface) 97%, var(--uui-color-border) 3%);
    }

    .query-group.full-width {
      grid-column: 1 / -1;
    }

    .query-tag-list {
      display: flex;
      gap: var(--uui-size-space-1);
      flex-wrap: wrap;
    }

    .query-filter-groups {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .query-filter-group {
      border: 1px dashed var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-2);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .query-filter-group-name {
      font-weight: 600;
      color: var(--uui-color-text-alt);
    }

    .checkbox-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: var(--uui-size-space-4);
      row-gap: var(--uui-size-space-2);
    }

    .selection-toolbar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-3);
      padding-bottom: var(--uui-size-space-2);
      border-bottom: 1px solid var(--uui-color-border);
      flex-wrap: wrap;
    }

    .selection-toolbar-with-title {
      justify-content: space-between;
    }

    .selection-meta {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      flex-wrap: wrap;
    }

    .selection-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .selection-count {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .group-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      margin-top: var(--uui-size-space-2);
    }

    .group-card {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
      background: color-mix(in srgb, var(--uui-color-surface) 95%, var(--uui-color-border) 5%);
    }

    .group-card h4 {
      margin: 0;
      font-size: var(--uui-type-default-size);
    }

    .selection-hint {
      margin: 0 0 var(--uui-size-space-3);
    }

    .resolver-help {
      margin: 0;
    }

    .resolver-panel {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      min-height: 64px;
      background: color-mix(in srgb, var(--uui-color-surface) 92%, var(--uui-color-border) 8%);
    }

    .resolver-no-args {
      margin: 0;
    }

    uui-input,
    uui-select,
    uui-textarea {
      width: 100%;
    }

    .promotion-filter-section {
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    .promotion-filter-section h4 {
      margin: 0 0 var(--uui-size-space-3);
    }

    .promotion-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--uui-size-space-4);
    }

    .promotion-grid > .full-row {
      grid-column: 1 / -1;
    }

    .bullet-list {
      margin: var(--uui-size-space-2) 0 0;
      padding-left: 20px;
    }

    .bullet-list.mono {
      font-family: var(--uui-font-monospace);
      font-size: var(--uui-type-small-size);
    }

    input[type="datetime-local"] {
      width: 100%;
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      font-size: var(--uui-type-default-size);
      box-sizing: border-box;
      background: var(--uui-color-surface);
      color: var(--uui-color-text);
    }

    @media (max-width: 900px) {
      .tab-content {
        padding: var(--uui-size-space-4);
      }

      .url-row {
        flex-direction: column;
        align-items: stretch;
      }

      .checkbox-grid {
        grid-template-columns: 1fr;
      }

      .promotion-grid {
        grid-template-columns: 1fr;
      }

      .logic-grid {
        grid-template-columns: 1fr;
      }

      .query-groups {
        grid-template-columns: 1fr;
      }

      .two-col-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
}

export default MerchelloProductFeedDetailElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-feed-detail": MerchelloProductFeedDetailElement;
  }
}
