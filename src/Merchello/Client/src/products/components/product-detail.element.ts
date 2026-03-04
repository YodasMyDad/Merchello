import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UmbSorterController } from "@umbraco-cms/backoffice/sorter";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { UmbRoute, UmbRouterSlotChangeEvent, UmbRouterSlotInitEvent } from "@umbraco-cms/backoffice/router";
import type { MerchelloProductsWorkspaceContext } from "@products/contexts/products-workspace.context.js";
import type {
  ProductRootDetailDto,
  ProductOptionDto,
  ProductVariantDto,
  ProductOptionSettingsDto,
  ProductOptionValueDto,
  ProductTypeDto,
  UpdateProductRootDto,
  CreateProductRootDto,
  ProductViewDto,
  RichTextEditorValue,
  ShippingOptionExclusionDto,
  ElementTypeListItemDto,
} from "@products/types/product.types.js";
import type { TaxGroupDto } from "@orders/types/order.types.js";
import type { WarehouseListDto } from "@warehouses/types/warehouses.types.js";
import type { ProductFilterGroupDto } from "@filters/types/filters.types.js";
import type { ElementTypeDto, ElementTypeContainerDto } from "@products/types/element-type.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import "@products/components/product-element-properties.element.js";
import type { ElementPropertiesChangeDetail } from "@products/components/product-element-properties.element.js";
import { MERCHELLO_OPTION_EDITOR_MODAL } from "@products/modals/option-editor-modal.token.js";
import { MERCHELLO_VARIANT_BATCH_UPDATE_MODAL } from "@products/modals/variant-batch-update-modal.token.js";
import { badgeStyles } from "@shared/styles/badge.styles.js";
import { getProductsListHref, getVariantDetailHref } from "@shared/utils/navigation.js";
import { formatCurrency } from "@shared/utils/formatting.js";
import "@shared/components/editable-text-list.element.js";

// Shared components
import "@products/components/variant-basic-info.element.js";
import "@products/components/variant-feed-settings.element.js";
import "@products/components/variant-stock-display.element.js";
import "@products/components/product-packages.element.js";
import "@products/components/product-filters.element.js";
import "@products/components/product-shipping-exclusions.element.js";
import "@products/components/product-warehouse-selector.element.js";
import type { StockSettingsChangeDetail } from "@products/components/variant-stock-display.element.js";
import type { PackagesChangeDetail } from "@products/components/product-packages.element.js";
import type { FiltersChangeDetail } from "@products/components/product-filters.element.js";
import type { ShippingExclusionsChangeDetail } from "@products/components/product-shipping-exclusions.element.js";
import type { WarehouseSelectionChangeDetail } from "@products/components/product-warehouse-selector.element.js";

// Utility functions
import {
  validateProductRoot,
  validateVariant,
  formatValidationErrorMessage,
} from "@products/utils/validation.js";
import {
  getVariantOptionDescription,
  calculateEstimatedVariantCount,
  hasVariantWarnings,
  hasOptionWarnings,
  formatUrlAsBreadcrumb,
} from "@products/utils/variant-helpers.js";
import { getSelectedWarehouseSetupSummary } from "@products/utils/warehouse-setup.js";

import { UmbDataTypeDetailRepository } from "@umbraco-cms/backoffice/data-type";
import type { UmbPropertyDatasetElement, UmbPropertyValueData } from "@umbraco-cms/backoffice/property";
import { UmbPropertyEditorConfigCollection } from "@umbraco-cms/backoffice/property-editor";
import type {
  UmbPropertyEditorConfig,
  UmbPropertyEditorConfigCollection as UmbPropertyEditorConfigCollectionType,
} from "@umbraco-cms/backoffice/property-editor";
// Import TipTap component to register the custom element
import "@umbraco-cms/backoffice/tiptap";
// Import document type input for element type picker
import "@umbraco-cms/backoffice/document-type";
import "@property-editors/collection-picker/property-editor-ui-collection-picker.element.js";
import "@property-editors/google-shopping-category-picker/property-editor-ui-google-shopping-category-picker.element.js";

// ============================================
// Component
// ============================================

/**
 * Product detail editing component.
 *
 * The main component for creating and editing products. Handles:
 * - Product root data (name, description, images, SEO, etc.)
 * - Single-variant products (merged tabs for basic info, stock, feed, filters)
 * - Multi-variant products (variants tab with table of all variants)
 * - Product options (variant-generating and add-on options)
 * - Element Type custom content properties
 *
 * For multi-variant products, individual variants are edited via variant-detail.element.ts
 */
@customElement("merchello-product-detail")
export class MerchelloProductDetailElement extends UmbElementMixin(LitElement) {
  // ============================================
  // State: Loading & Errors
  // ============================================

  @state() private _product: ProductRootDetailDto | null = null;
  @state() private _isLoading = true;
  @state() private _isSaving = false;
  @state() private _errorMessage: string | null = null;
  @state() private _validationAttempted = false;
  @state() private _fieldErrors: Record<string, string> = {};

  // ============================================
  // State: Tab Routing
  // ============================================

  @state() private _routes: UmbRoute[] = [];
  @state() private _routerPath?: string;
  @state() private _activePath = "";

  // ============================================
  // State: Form Data
  // ============================================

  /** Product root form data */
  @state() private _formData: Partial<ProductRootDetailDto> = {};

  /** Variant form data (for single-variant products) */
  @state() private _variantFormData: Partial<ProductVariantDto> = {};
  @state() private _variantFieldErrors: Record<string, string> = {};
  @state() private _selectedVariantIds: string[] = [];

  // ============================================
  // State: Reference Data (dropdowns)
  // ============================================

  @state() private _taxGroups: TaxGroupDto[] = [];
  @state() private _productTypes: ProductTypeDto[] = [];
  @state() private _warehouses: WarehouseListDto[] = [];
  @state() private _productViews: ProductViewDto[] = [];
  @state() private _optionSettings: ProductOptionSettingsDto | null = null;
  @state() private _elementTypes: ElementTypeListItemDto[] = [];

  // ============================================
  // State: Filters
  // ============================================

  @state() private _filterGroups: ProductFilterGroupDto[] = [];
  @state() private _assignedFilterIds: string[] = [];
  @state() private _originalAssignedFilterIds: string[] = [];

  // Shipping exclusions state
  @state() private _shippingOptions: ShippingOptionExclusionDto[] = [];

  // ============================================
  // State: Element Type (custom content)
  // ============================================

  @state() private _elementType: ElementTypeDto | null = null;
  @state() private _elementPropertyValues: Record<string, unknown> = {};

  // ============================================
  // State: Description Editor
  // ============================================

  /** Configuration from Umbraco DataType for TipTap editor */
  @state() private _descriptionEditorConfig: UmbPropertyEditorConfigCollectionType | undefined = undefined;

  /** Collection picker configuration: 0 means unlimited selections */
  private readonly _collectionPickerConfig = new UmbPropertyEditorConfigCollection([
    { alias: "maxItems", value: 0 },
  ]);

  /** Element type picker: allow one optional Element Type */
  private readonly _elementTypePickerConfig = new UmbPropertyEditorConfigCollection([
    { alias: "validationLimit", value: { min: 0, max: 1 } },
    { alias: "onlyPickElementTypes", value: true },
  ]);

  // ============================================
  // Private Members
  // ============================================

  /** Umbraco DataType repository for loading editor configuration */
  #dataTypeRepository = new UmbDataTypeDetailRepository(this);

  #workspaceContext?: MerchelloProductsWorkspaceContext;
  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;
  #isConnected = false;

  #optionSorter = new UmbSorterController<ProductOptionDto>(this, {
    getUniqueOfElement: (el) => el.getAttribute("data-option-id") ?? "",
    getUniqueOfModel: (model) => model.id,
    identifier: "Merchello.ProductOptions.Sorter",
    itemSelector: ".option-card",
    containerSelector: ".options-list",
    onChange: ({ model }) => {
      this._formData = { ...this._formData, productOptions: model };
    },
  });

  constructor() {
    super();
    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloProductsWorkspaceContext;
      if (this.#workspaceContext) {
        this.observe(this.#workspaceContext.product, (product) => {
          this._product = product ?? null;
          if (product) {
            this._formData = { ...product };
            this.#optionSorter.setModel(product.productOptions ?? []);
            // Initialize shipping options from product data
            this._shippingOptions = product.availableShippingOptions ?? [];
            // Reset batch-selection state when product reloads
            this._selectedVariantIds = [];
            // For single-variant products, populate variant form data and load filters
            if (product.variants.length === 1) {
              this._variantFormData = { ...product.variants[0] };
              // Load filters when product data arrives (for single-variant products)
              this._loadAssignedFilters();
            }
            // Load element property values from product
            if (product.elementProperties) {
              this._elementPropertyValues = { ...product.elementProperties };
            }
          }
          this._isLoading = !product;
        }, '_product');

        // Observe element type
        this.observe(this.#workspaceContext.elementType, (elementType) => {
          this._elementType = elementType;
        }, '_elementType');

        // Observe element property values
        this.observe(this.#workspaceContext.elementPropertyValues, (values) => {
          this._elementPropertyValues = values;
        }, '_elementPropertyValues');

        // Observe filter groups from centralized context
        this.observe(this.#workspaceContext.filterGroups, (groups) => {
          this._filterGroups = groups;
        }, '_filterGroups');
      }
    });
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadReferenceData();
    this._createRoutes();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadReferenceData(): Promise<void> {
    try {
      // Load filter groups from centralized context (shared with variant-detail)
      this.#workspaceContext?.loadFilterGroups();

      const [
        taxGroups,
        productTypes,
        warehouses,
        optionSettings,
        descriptionEditorSettings,
        productViews,
        elementTypes,
      ] = await Promise.all([
        MerchelloApi.getTaxGroups(),
        MerchelloApi.getProductTypes(),
        MerchelloApi.getWarehousesList(),
        MerchelloApi.getProductOptionSettings(),
        MerchelloApi.getDescriptionEditorSettings(),
        MerchelloApi.getProductViews(),
        MerchelloApi.getElementTypes(),
      ]);

      // Prevent state updates if component was disconnected during async operation
      if (!this.#isConnected) return;

      if (taxGroups.data) this._taxGroups = taxGroups.data;
      if (productTypes.data) this._productTypes = productTypes.data;
      if (warehouses.data) this._warehouses = warehouses.data;
      if (optionSettings.data) this._optionSettings = optionSettings.data;
      if (productViews.data) this._productViews = productViews.data;
      if (elementTypes.data) this._elementTypes = elementTypes.data;
      // Load DataType configuration using Umbraco's repository (handles auth automatically)
      if (descriptionEditorSettings.data?.dataTypeKey) {
        await this._loadDataTypeConfig(descriptionEditorSettings.data.dataTypeKey);
        // Check again after async operation
        if (!this.#isConnected) return;
      }

      // Load assigned filters for existing product
      await this._loadAssignedFilters();

    } catch {
      // Component will still function but with limited options
    }
  }

  /**
   * Loads filters assigned to the current product variant
   * Note: Filters are assigned to Products (variants), not ProductRoots
   * Only applicable for single-variant products
   */
  private async _loadAssignedFilters(): Promise<void> {
    // Only load filters for single-variant products
    if (!this._isSingleVariant()) return;

    // Use the variant ID since filters are associated with Products, not ProductRoots
    const variantId = this._product?.variants[0]?.id;
    if (!variantId || this.#workspaceContext?.isNew) return;

    const { data } = await MerchelloApi.getFiltersForProduct(variantId);
    if (!this.#isConnected) return;

    if (data) {
      const filterIds = data.map((f) => f.id);
      this._assignedFilterIds = filterIds;
      this._originalAssignedFilterIds = [...filterIds];
    }
  }

  /**
   * Fetches the DataType configuration using Umbraco's DataType repository.
   * This handles authentication automatically through Umbraco's internal mechanisms.
   */
  private async _loadDataTypeConfig(dataTypeKey: string): Promise<void> {
    try {
      // Request the DataType through Umbraco's repository (handles auth)
      const { error } = await this.#dataTypeRepository.requestByUnique(dataTypeKey);

      if (error) {
        this._setFallbackEditorConfig();
        return;
      }

      // Observe the DataType to get its configuration
      this.observe(
        await this.#dataTypeRepository.byUnique(dataTypeKey),
        (dataType) => {
          if (!this.#isConnected) return;
          
          if (!dataType) {
            this._setFallbackEditorConfig();
            return;
          }

          this._descriptionEditorConfig = new UmbPropertyEditorConfigCollection(dataType.values);
        },
        '_observeDescriptionDataType',
      );
    } catch {
      this._setFallbackEditorConfig();
    }
  }

  /**
   * Sets a fallback editor configuration if the DataType cannot be loaded.
   */
  private _setFallbackEditorConfig(): void {
    this._descriptionEditorConfig = new UmbPropertyEditorConfigCollection([
      {
        alias: "toolbar",
        value: [
          [
            ["Umb.Tiptap.Toolbar.Bold", "Umb.Tiptap.Toolbar.Italic", "Umb.Tiptap.Toolbar.Underline"],
            ["Umb.Tiptap.Toolbar.BulletList", "Umb.Tiptap.Toolbar.OrderedList"],
            ["Umb.Tiptap.Toolbar.Link", "Umb.Tiptap.Toolbar.Unlink"],
          ],
        ],
      },
      {
        alias: "extensions",
        value: [
          "Umb.Tiptap.RichTextEssentials",
          "Umb.Tiptap.Bold",
          "Umb.Tiptap.Italic",
          "Umb.Tiptap.Underline",
          "Umb.Tiptap.Link",
          "Umb.Tiptap.BulletList",
          "Umb.Tiptap.OrderedList",
        ],
      },
    ]);
  }

  /**
   * Creates routes for tab navigation.
   * The router-slot is hidden via CSS - we use it purely for URL tracking.
   * Content is rendered inline based on _getActiveTab().
   */
  private _createRoutes(): void {
    // Simple stub component - router-slot is hidden, content rendered inline
    const stubComponent = (): HTMLElement => document.createElement("div");

    this._routes = [
      {
        path: "tab/details",
        component: stubComponent,
      },
      {
        path: "tab/basic-info",
        component: stubComponent,
      },
      {
        path: "tab/media",
        component: stubComponent,
      },
      {
        path: "tab/shipping",
        component: stubComponent,
      },
      {
        path: "tab/seo",
        component: stubComponent,
      },
      {
        path: "tab/feed",
        component: stubComponent,
      },
      {
        path: "tab/stock",
        component: stubComponent,
      },
      {
        path: "tab/variants",
        component: stubComponent,
      },
      {
        path: "tab/options",
        component: stubComponent,
      },
      {
        path: "tab/filters",
        component: stubComponent,
      },
      // Element Type content tabs (dynamic based on configuration)
      {
        path: "tab/content",
        component: stubComponent,
      },
      {
        path: "tab/content-:tabId",
        component: stubComponent,
      },
      {
        path: "",
        redirectTo: "tab/details",
      },
      {
        path: "**",
        redirectTo: "tab/details",
      },
    ];
  }

  /**
   * Gets the currently active tab based on the route path
   */
  private _getActiveTab(): string {
    if (this._activePath.includes("tab/basic-info")) return "basic-info";
    if (this._activePath.includes("tab/media")) return "media";
    if (this._activePath.includes("tab/shipping")) return "shipping";
    if (this._activePath.includes("tab/seo")) return "seo";
    if (this._activePath.includes("tab/feed")) return "feed";
    if (this._activePath.includes("tab/stock")) return "stock";
    if (this._activePath.includes("tab/variants")) return "variants";
    if (this._activePath.includes("tab/options")) return "options";
    if (this._activePath.includes("tab/filters")) return "filters";
    // Handle Element Type content tabs
    if (this._activePath.includes("tab/content-")) {
      // Extract the tab ID from path like "tab/content-{guid}"
      const match = this._activePath.match(/tab\/content-([a-f0-9-]+)/i);
      if (match) return `content-${match[1]}`;
    }
    if (this._activePath.includes("tab/content")) return "content";
    return "details";
  }

  /**
   * Gets Element Type tabs (containers of type "Tab" at the root level)
   */
  private _getElementTypeTabs(): ElementTypeContainerDto[] {
    if (!this._elementType) return [];
    return this._elementType.containers
      .filter(c => c.type === "Tab" && !c.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Checks if the current active tab is a content tab
   */
  private _isContentTab(tab: string): boolean {
    return tab === "content" || tab.startsWith("content-");
  }

  /**
   * Gets the Element Type tab ID from the active tab string
   */
  private _getContentTabId(tab: string): string | undefined {
    if (tab === "content") return undefined;
    if (tab.startsWith("content-")) return tab.replace("content-", "");
    return undefined;
  }

  /**
   * Checks if there are validation errors on the details tab
   */
  private _hasDetailsErrors(): boolean {
    return !!(this._fieldErrors.rootName || this._fieldErrors.taxGroupId || this._fieldErrors.productTypeId || this._fieldErrors.warehouseIds);
  }

  /**
   * Checks if this product has only one variant (simple product)
   * Single-variant products show merged tabs instead of the Variants tab
   */
  private _isSingleVariant(): boolean {
    return (this._product?.variants.length ?? 0) === 1;
  }

  /**
   * Checks if there are validation errors on the basic info tab (single-variant mode)
   */
  private _hasBasicInfoErrors(): boolean {
    return !!(this._variantFieldErrors.sku || this._variantFieldErrors.price);
  }

  private _getSelectedWarehouseSetupSummary(): {
    selectedCount: number;
    selectedNeedsSetupCount: number;
    missingSelectedIdsCount: number;
  } {
    return getSelectedWarehouseSetupSummary(
      this._warehouses,
      this._formData.warehouseIds ?? []
    );
  }

  private _hasSelectedWarehouseSetupWarnings(): boolean {
    if (this._formData.isDigitalProduct) return false;

    const summary = this._getSelectedWarehouseSetupSummary();
    return summary.selectedNeedsSetupCount > 0 || summary.missingSelectedIdsCount > 0;
  }

  /**
   * Gets validation hint for a specific tab
   */
  private _getTabHint(tab: "details" | "variants" | "options"): {
    color: "danger" | "warning";
    attention?: boolean;
  } | null {
    if (tab === "details" && this._validationAttempted && this._hasDetailsErrors()) {
      return { color: "danger", attention: true };
    }
    if (tab === "details" && this._hasSelectedWarehouseSetupWarnings()) {
      return { color: "warning" };
    }
    if (tab === "variants" && this._hasVariantWarnings()) {
      return { color: "warning" };
    }
    if (tab === "options" && this._hasOptionWarnings()) {
      return { color: "warning" };
    }
    return null;
  }

  private _handleInputChange(field: keyof ProductRootDetailDto, value: string): void {
    this._formData = { ...this._formData, [field]: value };
  }

  private _getCollectionPickerValue(): string | undefined {
    const collectionIds = this._formData.collectionIds ?? [];
    return collectionIds.length > 0 ? collectionIds.join(",") : undefined;
  }

  private _toPropertyValueMap(values: UmbPropertyValueData[]): Record<string, unknown> {
    const map: Record<string, unknown> = {};
    for (const value of values) {
      map[value.alias] = value.value;
    }
    return map;
  }

  private _getStringFromPropertyValue(value: unknown): string {
    if (typeof value === "string") return value;
    return "";
  }

  private _getFirstDropdownValue(value: unknown): string {
    if (Array.isArray(value)) {
      const first = value.find((x) => typeof x === "string");
      return typeof first === "string" ? first : "";
    }
    if (typeof value === "string") return value;
    return "";
  }

  private _getStringArrayFromPropertyValue(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean);
    }
    if (typeof value === "string") {
      return value
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    }
    return [];
  }

  private _getMediaKeysFromPropertyValue(value: unknown): string[] {
    if (!Array.isArray(value)) return [];

    return value
      .map((entry) => {
        if (!entry || typeof entry !== "object") return "";
        const mediaEntry = entry as { mediaKey?: unknown; key?: unknown };
        if (typeof mediaEntry.mediaKey === "string" && mediaEntry.mediaKey) return mediaEntry.mediaKey;
        if (typeof mediaEntry.key === "string" && mediaEntry.key) return mediaEntry.key;
        return "";
      })
      .filter(Boolean);
  }

  private _createMediaPickerValue(keys: string[]): Array<{ key: string; mediaKey: string }> {
    return keys.map((key) => ({ key, mediaKey: key }));
  }

  private _getDescriptionPropertyValue(): RichTextEditorValue {
    const description = this._formData.description;
    if (!description) {
      return {
        markup: "",
        blocks: null,
      };
    }

    try {
      const parsed = JSON.parse(description) as Partial<RichTextEditorValue>;
      if (typeof parsed?.markup === "string" || parsed?.blocks !== undefined) {
        return {
          markup: parsed.markup ?? "",
          blocks: parsed.blocks ?? null,
        };
      }
    } catch {
      // Backwards compatibility: treat plain stored HTML as markup.
    }

    return {
      markup: description,
      blocks: null,
    };
  }

  private _serializeDescriptionPropertyValue(value: unknown): string | null {
    if (value === null || value === undefined) return null;

    if (typeof value === "string") {
      return JSON.stringify({
        markup: value,
        blocks: null,
      } satisfies RichTextEditorValue);
    }

    if (typeof value === "object") {
      const parsed = value as Partial<RichTextEditorValue>;
      if (typeof parsed.markup === "string" || parsed.blocks !== undefined) {
        return JSON.stringify({
          markup: parsed.markup ?? "",
          blocks: parsed.blocks ?? null,
        } satisfies RichTextEditorValue);
      }
      return JSON.stringify(value);
    }

    return null;
  }

  private _getElementTypeSelectionKey(): string | undefined {
    const alias = this._formData.elementTypeAlias;
    if (!alias) return undefined;
    const match = this._elementTypes.find((t) => t.alias.toLowerCase() === alias.toLowerCase());
    return match?.key;
  }

  private async _setElementTypeAliasFromSelectionValue(value: unknown): Promise<void> {
    const selectedRawValue = this._getFirstDropdownValue(value);
    const selectedKey = selectedRawValue
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)[0];

    let selectedType = this._elementTypes.find((t) => t.key === selectedKey);

    if (selectedKey && !selectedType) {
      const { data } = await MerchelloApi.getElementTypes();
      if (data) {
        this._elementTypes = data;
        selectedType = data.find((t) => t.key === selectedKey);
      }
    }

    const alias = selectedType?.alias ?? null;
    const currentAlias = this._formData.elementTypeAlias ?? null;

    if (alias === currentAlias) return;

    this._formData = { ...this._formData, elementTypeAlias: alias };
    this._elementPropertyValues = {};
    this.#workspaceContext?.setElementPropertyValues({});
    await this.#workspaceContext?.loadElementType(alias);
  }

  private _getProductTypePropertyConfig(): UmbPropertyEditorConfig {
    return [
      {
        alias: "items",
        value: [
          { name: "Select product type...", value: "" },
          ...this._productTypes.map((productType) => ({
            name: productType.name,
            value: productType.id,
          })),
        ],
      },
    ];
  }

  private _getTaxGroupPropertyConfig(): UmbPropertyEditorConfig {
    return [
      {
        alias: "items",
        value: [
          { name: "Select tax group...", value: "" },
          ...this._taxGroups.map((taxGroup) => ({
            name: taxGroup.name,
            value: taxGroup.id,
          })),
        ],
      },
    ];
  }

  private _getViewOptions(): Array<{ name: string; value: string; selected?: boolean }> {
    const selectedViewAlias = this._formData.viewAlias ?? "";

    return [
      { name: "", value: "", selected: selectedViewAlias === "" },
      ...this._productViews.map((view) => ({
        name: view.alias,
        value: view.alias,
        selected: view.alias === selectedViewAlias,
      })),
    ];
  }

  private _getDetailsDatasetValue(): UmbPropertyValueData[] {
    const elementTypeKey = this._getElementTypeSelectionKey();

    return [
      { alias: "rootName", value: this._formData.rootName ?? "" },
      { alias: "taxGroupId", value: this._formData.taxGroupId ? [this._formData.taxGroupId] : [] },
      { alias: "elementTypeAlias", value: elementTypeKey },
      { alias: "isDigitalProduct", value: this._formData.isDigitalProduct ?? false },
      { alias: "description", value: this._getDescriptionPropertyValue() },
    ];
  }

  private _getCategorisationDatasetValue(): UmbPropertyValueData[] {
    return [
      { alias: "productTypeId", value: this._formData.productTypeId ? [this._formData.productTypeId] : [] },
      { alias: "collectionIds", value: this._getCollectionPickerValue() },
      { alias: "googleShoppingFeedCategory", value: this._formData.googleShoppingFeedCategory ?? "" },
    ];
  }

  private _getRootFeedDatasetValue(): UmbPropertyValueData[] {
    return [
      { alias: "shoppingFeedBrand", value: this._formData.shoppingFeedBrand ?? "" },
      { alias: "shoppingFeedCondition", value: this._formData.shoppingFeedCondition ?? "new" },
    ];
  }

  private _getMediaDatasetValue(): UmbPropertyValueData[] {
    return [
      {
        alias: "rootImages",
        value: this._createMediaPickerValue(this._formData.rootImages ?? []),
      },
    ];
  }

  private _getSeoDatasetValue(): UmbPropertyValueData[] {
    return [
      { alias: "rootUrl", value: this._formData.rootUrl ?? "" },
      { alias: "pageTitle", value: this._formData.pageTitle ?? "" },
      { alias: "metaDescription", value: this._formData.metaDescription ?? "" },
      { alias: "canonicalUrl", value: this._formData.canonicalUrl ?? "" },
      { alias: "noIndex", value: this._formData.noIndex ?? false },
    ];
  }

  private _getSocialDatasetValue(): UmbPropertyValueData[] {
    return [
      {
        alias: "openGraphImage",
        value: this._formData.openGraphImage
          ? this._createMediaPickerValue([this._formData.openGraphImage])
          : [],
      },
    ];
  }

  private _handleDetailsDatasetChange(e: Event): void {
    const dataset = e.target as UmbPropertyDatasetElement;
    const values = this._toPropertyValueMap(dataset.value ?? []);

    this._formData = {
      ...this._formData,
      rootName: this._getStringFromPropertyValue(values.rootName),
      taxGroupId: this._getFirstDropdownValue(values.taxGroupId),
      isDigitalProduct: Boolean(values.isDigitalProduct),
      description: this._serializeDescriptionPropertyValue(values.description),
    };

    void this._setElementTypeAliasFromSelectionValue(values.elementTypeAlias);
  }

  private _handleViewAliasChange(e: Event): void {
    const viewAlias = (e.target as HTMLSelectElement).value;
    this._formData = { ...this._formData, viewAlias: viewAlias || null };
  }

  private _handleCategorisationDatasetChange(e: Event): void {
    const dataset = e.target as UmbPropertyDatasetElement;
    const values = this._toPropertyValueMap(dataset.value ?? []);

    this._formData = {
      ...this._formData,
      productTypeId: this._getFirstDropdownValue(values.productTypeId),
      collectionIds: this._getStringArrayFromPropertyValue(values.collectionIds),
      googleShoppingFeedCategory: this._getStringFromPropertyValue(values.googleShoppingFeedCategory) || null,
    };
  }

  private _handleRootFeedDatasetChange(e: Event): void {
    const dataset = e.target as UmbPropertyDatasetElement;
    const values = this._toPropertyValueMap(dataset.value ?? []);
    const brand = this._getStringFromPropertyValue(values.shoppingFeedBrand).trim();
    const condition = this._getStringFromPropertyValue(values.shoppingFeedCondition).trim().toLowerCase();

    this._formData = {
      ...this._formData,
      shoppingFeedBrand: brand || null,
      shoppingFeedCondition: condition || "new",
    };
  }

  private _handleWarehouseToggle(warehouseId: string, checked: boolean): void {
    const warehouseIds = this._formData.warehouseIds ?? [];
    const hasWarehouse = warehouseIds.includes(warehouseId);
    const nextWarehouseIds = checked
      ? (hasWarehouse ? warehouseIds : [...warehouseIds, warehouseId])
      : warehouseIds.filter((id) => id !== warehouseId);

    this._formData = { ...this._formData, warehouseIds: nextWarehouseIds };

    if (this._fieldErrors.warehouseIds) {
      const { warehouseIds: _warehouseIdsError, ...rest } = this._fieldErrors;
      this._fieldErrors = rest;
    }
  }

  private _handleWarehouseSelectionChange(e: CustomEvent<WarehouseSelectionChangeDetail>): void {
    this._handleWarehouseToggle(e.detail.warehouseId, e.detail.checked);
  }

  private _handleMediaDatasetChange(e: Event): void {
    const dataset = e.target as UmbPropertyDatasetElement;
    const values = this._toPropertyValueMap(dataset.value ?? []);

    this._formData = {
      ...this._formData,
      rootImages: this._getMediaKeysFromPropertyValue(values.rootImages),
    };
  }

  private _handleSeoDatasetChange(e: Event): void {
    const dataset = e.target as UmbPropertyDatasetElement;
    const values = this._toPropertyValueMap(dataset.value ?? []);

    this._formData = {
      ...this._formData,
      rootUrl: this._getStringFromPropertyValue(values.rootUrl) || null,
      pageTitle: this._getStringFromPropertyValue(values.pageTitle) || null,
      metaDescription: this._getStringFromPropertyValue(values.metaDescription) || null,
      canonicalUrl: this._getStringFromPropertyValue(values.canonicalUrl) || null,
      noIndex: Boolean(values.noIndex),
    };
  }

  private _handleSocialDatasetChange(e: Event): void {
    const dataset = e.target as UmbPropertyDatasetElement;
    const values = this._toPropertyValueMap(dataset.value ?? []);
    const openGraphImage = this._getMediaKeysFromPropertyValue(values.openGraphImage)[0] ?? null;

    this._formData = {
      ...this._formData,
      openGraphImage,
    };
  }

  private async _handleSave(): Promise<void> {
    if (!this._validateForm()) {
      return;
    }

    this._isSaving = true;
    this._errorMessage = null;

    try {
      const isNew = this.#workspaceContext?.isNew ?? true;

      if (isNew) {
        await this._createProduct();
      } else {
        await this._updateProduct();
      }
    } catch (error) {
      this._errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    } finally {
      this._isSaving = false;
    }
  }

  private async _createProduct(): Promise<void> {
    const request: CreateProductRootDto = {
      rootName: this._formData.rootName || "",
      googleShoppingFeedCategory: this._formData.googleShoppingFeedCategory ?? undefined,
      shoppingFeedBrand: this._formData.shoppingFeedBrand ?? undefined,
      shoppingFeedCondition: this._formData.shoppingFeedCondition ?? undefined,
      taxGroupId: this._formData.taxGroupId || "",
      productTypeId: this._formData.productTypeId || "",
      collectionIds: this._formData.collectionIds,
      warehouseIds: this._formData.warehouseIds,
      rootImages: this._formData.rootImages,
      isDigitalProduct: this._formData.isDigitalProduct || false,
      digitalDeliveryMethod: this._formData.digitalDeliveryMethod ?? undefined,
      digitalFileIds: this._formData.digitalFileIds ?? undefined,
      downloadLinkExpiryDays: this._formData.downloadLinkExpiryDays ?? undefined,
      maxDownloadsPerLink: this._formData.maxDownloadsPerLink ?? undefined,
      elementTypeAlias: this._formData.elementTypeAlias ?? undefined,
      elementProperties: Object.keys(this._elementPropertyValues).length > 0
        ? this._elementPropertyValues
        : undefined,
      defaultVariant: {
        sku: this._variantFormData.sku ?? undefined,
        price: this._variantFormData.price ?? 0,
        costOfGoods: this._variantFormData.costOfGoods ?? 0,
      },
    };

    const { data, error } = await MerchelloApi.createProduct(request);

    if (error) {
      this._errorMessage = error.message;
      this.#notificationContext?.peek("danger", { data: { headline: "Failed to create product", message: error.message } });
      return;
    }

    if (data) {
      this.#workspaceContext?.updateProduct(data);
      this.#notificationContext?.peek("positive", { data: { headline: "Product created", message: `"${data.rootName}" has been created successfully` } });
      this._validationAttempted = false;
      this._fieldErrors = {};
    }
  }

  private async _updateProduct(): Promise<void> {
    if (!this._product?.id) return;

    const request: UpdateProductRootDto = {
      rootName: this._formData.rootName,
      rootImages: this._formData.rootImages,
      rootUrl: this._formData.rootUrl ?? undefined,
      googleShoppingFeedCategory: this._formData.googleShoppingFeedCategory ?? undefined,
      shoppingFeedBrand: this._formData.shoppingFeedBrand ?? undefined,
      shoppingFeedCondition: this._formData.shoppingFeedCondition ?? undefined,
      isDigitalProduct: this._formData.isDigitalProduct,
      digitalDeliveryMethod: this._formData.digitalDeliveryMethod ?? undefined,
      digitalFileIds: this._formData.digitalFileIds ?? undefined,
      downloadLinkExpiryDays: this._formData.downloadLinkExpiryDays ?? undefined,
      maxDownloadsPerLink: this._formData.maxDownloadsPerLink ?? undefined,
      taxGroupId: this._formData.taxGroupId,
      productTypeId: this._formData.productTypeId,
      collectionIds: this._formData.collectionIds,
      warehouseIds: this._formData.warehouseIds,
      description: this._formData.description ?? undefined,
      metaDescription: this._formData.metaDescription ?? undefined,
      pageTitle: this._formData.pageTitle ?? undefined,
      noIndex: this._formData.noIndex,
      openGraphImage: this._formData.openGraphImage ?? undefined,
      canonicalUrl: this._formData.canonicalUrl ?? undefined,
      defaultPackageConfigurations: this._formData.defaultPackageConfigurations,
      // View alias for front-end rendering
      viewAlias: this._formData.viewAlias,
      // Element Type selection for custom properties
      elementTypeAlias: this._formData.elementTypeAlias ?? "",
      // Element Type property values
      elementProperties: Object.keys(this._elementPropertyValues).length > 0
        ? this._elementPropertyValues
        : undefined,
    };

    const { data, error } = await MerchelloApi.updateProduct(this._product.id, request);

    if (error) {
      this._errorMessage = error.message;
      this.#notificationContext?.peek("danger", { data: { headline: "Failed to save product", message: error.message } });
      return;
    }

    // For single-variant products, also save variant data
    if (this._isSingleVariant() && this._product.variants[0]) {
      const variantError = await this._saveVariantData(this._product.id, this._product.variants[0].id);
      if (variantError) {
        this._errorMessage = variantError.message;
        this.#notificationContext?.peek("danger", { data: { headline: "Failed to save variant data", message: variantError.message } });
        return;
      }
    }

    // Save filter assignments if changed (only for single-variant products)
    if (this._isSingleVariant()) {
      await this._saveFilterAssignments();
    }

    // Save shipping exclusions (bulk mode - applies to all variants)
    await this._saveShippingExclusions();

    if (data) {
      // Reload to get updated variant data
      await this.#workspaceContext?.reload();
      this.#notificationContext?.peek("positive", { data: { headline: "Product saved", message: "Changes have been saved successfully" } });
    }
  }

  /** Saves shipping exclusions for all variants (bulk mode) */
  private async _saveShippingExclusions(): Promise<void> {
    if (!this._product?.id) return;

    // Get the IDs of options that are excluded
    const excludedIds = this._shippingOptions
      .filter((o) => o.isExcluded)
      .map((o) => o.id);

    // Only call API if there are exclusions or we're clearing existing ones
    const hasExclusions = excludedIds.length > 0;
    const hadExclusions = this._shippingOptions.some((o) => o.isPartiallyExcluded || o.excludedVariantCount > 0);

    if (hasExclusions || hadExclusions) {
      const { error } = await MerchelloApi.updateProductShippingExclusions(this._product.id, excludedIds);
      if (error) {
        this.#notificationContext?.peek("warning", {
          data: { headline: "Shipping exclusions not saved", message: error.message },
        });
      }
    }
  }

  /**
   * Saves variant data for single-variant products
   */
  private async _saveVariantData(productId: string, variantId: string): Promise<Error | null> {
    const request = {
      sku: this._variantFormData.sku ?? undefined,
      gtin: this._variantFormData.gtin ?? undefined,
      supplierSku: this._variantFormData.supplierSku ?? undefined,
      price: this._variantFormData.price,
      costOfGoods: this._variantFormData.costOfGoods,
      onSale: this._variantFormData.onSale,
      previousPrice: this._variantFormData.previousPrice ?? undefined,
      availableForPurchase: this._variantFormData.availableForPurchase,
      canPurchase: this._variantFormData.canPurchase,
      url: this._variantFormData.url ?? undefined,
      hsCode: this._variantFormData.hsCode ?? undefined,
      // Shopping feed
      shoppingFeedTitle: this._variantFormData.shoppingFeedTitle ?? undefined,
      shoppingFeedDescription: this._variantFormData.shoppingFeedDescription ?? undefined,
      shoppingFeedColour: this._variantFormData.shoppingFeedColour ?? undefined,
      shoppingFeedMaterial: this._variantFormData.shoppingFeedMaterial ?? undefined,
      shoppingFeedSize: this._variantFormData.shoppingFeedSize ?? undefined,
      shoppingFeedBrand: this._variantFormData.shoppingFeedBrand ?? undefined,
      shoppingFeedCondition: this._variantFormData.shoppingFeedCondition ?? undefined,
      shoppingFeedWidth: this._variantFormData.shoppingFeedWidth ?? undefined,
      shoppingFeedHeight: this._variantFormData.shoppingFeedHeight ?? undefined,
      removeFromFeed: this._variantFormData.removeFromFeed,
      // Warehouse stock settings
      warehouseStock: this._variantFormData.warehouseStock?.map((ws) => ({
        warehouseId: ws.warehouseId,
        stock: ws.stock,
        reorderPoint: ws.reorderPoint,
        trackStock: ws.trackStock,
      })),
    };

    const { error } = await MerchelloApi.updateVariant(productId, variantId, request);
    return error ?? null;
  }

  /**
   * Validates the form and sets field-level errors.
   * Uses validation utility functions for product root and variant validation.
   */
  private _validateForm(): boolean {
    this._validationAttempted = true;
    this._errorMessage = null;

    // Validate product root using utility function
    const productResult = validateProductRoot(this._formData, {
      isDigitalProduct: this._formData.isDigitalProduct,
    });
    this._fieldErrors = productResult.errors;

    // Validate variant for single-variant products
    let variantResult = { isValid: true, errors: {} as Record<string, string> };
    if (this._isSingleVariant()) {
      variantResult = validateVariant(this._variantFormData);
    }
    this._variantFieldErrors = variantResult.errors;

    // Generate error message if validation failed
    const errorMessage = formatValidationErrorMessage(
      !productResult.isValid,
      !variantResult.isValid
    );
    if (errorMessage) {
      this._errorMessage = errorMessage;
    }

    return productResult.isValid && variantResult.isValid;
  }

  /**
   * Checks if there are warnings for variants tab.
   * Uses utility function from variant-helpers.
   */
  private _hasVariantWarnings(): boolean {
    if (!this._product?.variants) return false;
    return hasVariantWarnings(this._product.variants);
  }

  /**
   * Checks if there are warnings for options tab.
   * Uses utility function from variant-helpers.
   */
  private _hasOptionWarnings(): boolean {
    const variantCount = this._product?.variants.length ?? 0;
    const optionCount = this._product?.productOptions.length ?? 0;
    return hasOptionWarnings(variantCount, optionCount);
  }

  private _renderTabs(): unknown {
    const variantCount = this._product?.variants.length ?? 0;
    const optionCount = this._product?.productOptions.length ?? 0;
    const isSingleVariant = this._isSingleVariant();
    const activeTab = this._getActiveTab();
    const detailsHint = this._getTabHint("details");
    const variantsHint = this._getTabHint("variants");
    const optionsHint = this._getTabHint("options");

    return html`
      <uui-tab-group slot="header">
        <uui-tab
          label="Details"
          href="${this._routerPath}/tab/details"
          ?active=${activeTab === "details"}>
          Details
          ${detailsHint
            ? html`<uui-badge
                slot="extra"
                color=${detailsHint.color}
                ?attention=${detailsHint.attention ?? false}>!</uui-badge>`
            : nothing}
        </uui-tab>

        ${isSingleVariant
          ? html`
              <uui-tab
                label="Basic Info"
                href="${this._routerPath}/tab/basic-info"
                ?active=${activeTab === "basic-info"}>
                Basic Info
                ${this._validationAttempted && this._hasBasicInfoErrors() ? html`<uui-badge slot="extra" color="danger" attention>!</uui-badge>` : nothing}
              </uui-tab>
            `
          : nothing}

        <uui-tab
          label="Media"
          href="${this._routerPath}/tab/media"
          ?active=${activeTab === "media"}>
          Media
        </uui-tab>

        ${!this._formData.isDigitalProduct
          ? html`
              <uui-tab
                label="Shipping"
                href="${this._routerPath}/tab/shipping"
                ?active=${activeTab === "shipping"}>
                Shipping
              </uui-tab>
            `
          : nothing}

        <uui-tab
          label="SEO"
          href="${this._routerPath}/tab/seo"
          ?active=${activeTab === "seo"}>
          SEO
        </uui-tab>

        ${isSingleVariant
          ? html`
              <uui-tab
                label="Shopping Feed"
                href="${this._routerPath}/tab/feed"
                ?active=${activeTab === "feed"}>
                Shopping Feed
              </uui-tab>
            `
          : nothing}

        ${isSingleVariant
          ? html`
              <uui-tab
                label="Stock"
                href="${this._routerPath}/tab/stock"
                ?active=${activeTab === "stock"}>
                Stock
              </uui-tab>
            `
          : nothing}

        ${variantCount > 1
          ? html`
              <uui-tab
                label="Variants"
                href="${this._routerPath}/tab/variants"
                ?active=${activeTab === "variants"}>
                Variants (${variantCount})
                ${variantsHint ? html`<uui-badge slot="extra" color="warning">!</uui-badge>` : nothing}
              </uui-tab>
            `
          : nothing}

        <uui-tab
          label="Options"
          class=${isSingleVariant ? "" : "merchello-tab--last"}
          href="${this._routerPath}/tab/options"
          ?active=${activeTab === "options"}>
          Options (${optionCount})
          ${optionsHint ? html`<uui-badge slot="extra" color="warning">!</uui-badge>` : nothing}
        </uui-tab>

        ${isSingleVariant
          ? html`
              <uui-tab
                label="Filters"
                class="merchello-tab--last"
                href="${this._routerPath}/tab/filters"
                ?active=${activeTab === "filters"}>
                Filters
              </uui-tab>
            `
          : nothing}

        ${this._renderElementTypeTabs(activeTab)}
      </uui-tab-group>
    `;
  }

  /**
   * Renders the Element Type tabs with visual divider
   */
  private _renderElementTypeTabs(activeTab: string): unknown {
    if (!this._elementType) return nothing;

    const elementTypeTabs = this._getElementTypeTabs();

    return html`
      ${elementTypeTabs.length > 0
        ? elementTypeTabs.map((tab, index) => html`
            <uui-tab
              class=${index === 0 ? "element-type-tab element-type-tab--first" : "element-type-tab"}
              label=${tab.name ?? "Content"}
              href="${this._routerPath}/tab/content-${tab.id}"
              ?active=${activeTab === `content-${tab.id}`}>
              ${tab.name ?? "Content"}
            </uui-tab>
          `)
        : html`
            <!-- Single "Content" tab if element type has no tabs defined -->
            <uui-tab
              class="element-type-tab element-type-tab--first"
              label="Content"
              href="${this._routerPath}/tab/content"
              ?active=${activeTab === "content"}>
              Content
            </uui-tab>
          `
      }
    `;
  }

  /**
   * Renders the content tab with Element Type properties
   */
  private _renderContentTab(activeTab: string): unknown {
    if (!this._elementType) return nothing;

    const tabId = this._getContentTabId(activeTab);

    return html`
      <div class="tab-content">
        <merchello-product-element-properties
          .elementType=${this._elementType}
          .values=${this._elementPropertyValues}
          .activeTabId=${tabId}
          @values-change=${this._onElementPropertiesChange}>
        </merchello-product-element-properties>
      </div>
    `;
  }

  /**
   * Handles property value changes from the element properties component
   */
  private _onElementPropertiesChange(e: CustomEvent<ElementPropertiesChangeDetail>): void {
    const { values } = e.detail;
    this._elementPropertyValues = { ...values };
    this.#workspaceContext?.setElementPropertyValues(values);
  }

  private _renderDetailsTab(): unknown {
    const isNew = this.#workspaceContext?.isNew ?? true;

    return html`
      <div class="tab-content">
        ${isNew
          ? html`
              <uui-box class="info-banner">
                <div class="info-content">
                  <uui-icon name="icon-lightbulb"></uui-icon>
                  <div>
                    <strong>Getting Started</strong>
                    <p>Fill in the basic product information below. You can add variants and options after creating the product.</p>
                  </div>
                </div>
              </uui-box>
            `
          : nothing}

        ${this._errorMessage
          ? html`
              <uui-box class="error-box">
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              </uui-box>
            `
          : nothing}

        <uui-box headline="Basic Information">
          <umb-property-dataset
            .value=${this._getDetailsDatasetValue()}
            @change=${this._handleDetailsDatasetChange}>
            <umb-property
              alias="rootName"
              label="Product Name"
              description="Customer-facing product name"
              property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
              .validation=${{ mandatory: true }}>
            </umb-property>

            <umb-property
              alias="taxGroupId"
              label="Tax Group"
              description="Tax rate applied to this product"
              property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
              .config=${this._getTaxGroupPropertyConfig()}
              .validation=${{ mandatory: true }}>
            </umb-property>

            <umb-property-layout
              alias="viewAlias"
              label="Product View"
              description="Select the view template used to render this product on the front-end">
              <div slot="editor" class="view-select-editor">
                <uui-select
                  label="Product View"
                  .options=${this._getViewOptions()}
                  @change=${this._handleViewAliasChange}>
                </uui-select>
                ${this._productViews.length === 0
                  ? html`<p class="hint">No product views found. Add .cshtml files to ~/Views/Products/.</p>`
                  : nothing}
              </div>
            </umb-property-layout>

            <umb-property
              alias="elementTypeAlias"
              label="Element Type"
              description="Optional: select an Element Type to add custom properties to this product"
              property-editor-ui-alias="Umb.PropertyEditorUi.DocumentTypePicker"
              .config=${this._elementTypePickerConfig}>
            </umb-property>

            <umb-property
              alias="isDigitalProduct"
              label="Digital Product"
              description="No shipping costs, instant delivery, no warehouse needed"
              property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
            </umb-property>

            <umb-property
              alias="description"
              label="Description"
              description="Product description for your storefront. Edit the DataType in Settings > Data Types to customize the editor toolbar."
              property-editor-ui-alias="Umb.PropertyEditorUi.Tiptap"
              .config=${this._descriptionEditorConfig}>
            </umb-property>
          </umb-property-dataset>
        </uui-box>

        <uui-box headline="Categorisation">
          <umb-property-dataset
            .value=${this._getCategorisationDatasetValue()}
            @change=${this._handleCategorisationDatasetChange}>
            <umb-property
              alias="productTypeId"
              label="Product Type"
              description="Categorize your product for reporting and organization"
              property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
              .config=${this._getProductTypePropertyConfig()}
              .validation=${{ mandatory: true }}>
            </umb-property>

            <umb-property
              alias="collectionIds"
              label="Collections"
              description="Assign this product to one or more collections for storefront organization"
              property-editor-ui-alias="Merchello.PropertyEditorUi.CollectionPicker"
              .config=${this._collectionPickerConfig}>
            </umb-property>

            <umb-property
              alias="googleShoppingFeedCategory"
              label="Shopping Category"
              description="Select a shopping taxonomy category for this product"
              property-editor-ui-alias="Merchello.PropertyEditorUi.GoogleShoppingCategoryPicker">
            </umb-property>
          </umb-property-dataset>
        </uui-box>

        ${!this._formData.isDigitalProduct
          ? html`
              <uui-box headline="Warehouses">
                <umb-property-layout
                  label="Stock Locations"
                  description="Select which warehouses stock this product"
                  mandatory
                  ?invalid=${!!this._fieldErrors.warehouseIds}>
                  <div slot="editor">
                    ${this._renderWarehouseSelector()}
                  </div>
                  ${this._fieldErrors.warehouseIds
                    ? html`<span class="field-error-message">${this._fieldErrors.warehouseIds}</span>`
                    : nothing}
                </umb-property-layout>
                ${this._renderWarehouseSetupWarning()}
              </uui-box>
            `
          : nothing}
      </div>
    `;
  }

  private _renderWarehouseSelector(): unknown {
    const selectedWarehouseIds = this._formData.warehouseIds ?? [];

    return html`
      <merchello-product-warehouse-selector
        .warehouses=${this._warehouses}
        .selectedWarehouseIds=${selectedWarehouseIds}
        .showConfigureLinks=${true}
        @warehouse-selection-change=${this._handleWarehouseSelectionChange}>
      </merchello-product-warehouse-selector>
    `;
  }

  private _renderWarehouseSetupWarning(): unknown {
    const summary = this._getSelectedWarehouseSetupSummary();
    if (summary.selectedNeedsSetupCount === 0 && summary.missingSelectedIdsCount === 0) {
      return nothing;
    }

    const warnings: string[] = [];
    if (summary.selectedNeedsSetupCount > 0) {
      warnings.push(
        `${summary.selectedNeedsSetupCount} selected warehouse${summary.selectedNeedsSetupCount === 1 ? "" : "s"} are missing regions or shipping options`
      );
    }
    if (summary.missingSelectedIdsCount > 0) {
      warnings.push(
        `${summary.missingSelectedIdsCount} selected warehouse reference${summary.missingSelectedIdsCount === 1 ? "" : "s"} could not be found`
      );
    }

    return html`
      <div class="warehouse-setup-warning-banner" role="status">
        <uui-icon name="icon-alert"></uui-icon>
        <div>
          <strong>Warehouse setup needs attention</strong>
          <p>${warnings.join(". ")}.</p>
          <p class="hint">Saving is still allowed, but shipping availability may be incomplete.</p>
        </div>
      </div>
    `;
  }

  private _renderMediaTab(): unknown {
    return html`
      <div class="tab-content">
        <uui-box headline="Product Images">
          <umb-property-dataset
            .value=${this._getMediaDatasetValue()}
            @change=${this._handleMediaDatasetChange}>
            <umb-property
              alias="rootImages"
              label="Images"
              description="Add images that will be displayed on your storefront. These images are shared across all variants."
              property-editor-ui-alias="Umb.PropertyEditorUi.MediaPicker"
              .config=${[{ alias: "multiple", value: true }]}>
            </umb-property>
          </umb-property-dataset>
        </uui-box>
      </div>
    `;
  }

  // ============================================
  // Shipping Tab
  // ============================================

  /**
   * Renders the shipping tab with package configurations.
   * Uses the shared product-packages component.
   */
  private _renderShippingTab(): unknown {
    const packages = this._formData.defaultPackageConfigurations ?? [];
    const isNew = this.#workspaceContext?.isNew ?? true;

    return html`
      <div class="tab-content">
        <uui-box class="info-banner">
          <div class="info-content">
            <uui-icon name="icon-info"></uui-icon>
            <div>
              <strong>Default Shipping Packages</strong>
              <p>Define the default package configurations for this product. These are used for shipping rate calculations and can be overridden at the variant level.</p>
            </div>
          </div>
        </uui-box>

        <uui-box headline="Package Configurations">
          <merchello-product-packages
            .packages=${packages}
            .editable=${true}
            .disableAdd=${isNew}
            @packages-change=${this._handlePackagesChange}>
          </merchello-product-packages>
        </uui-box>

        <merchello-product-shipping-exclusions
          .shippingOptions=${this._shippingOptions}
          .variantMode=${false}
          .isNewProduct=${isNew}
          @shipping-exclusions-change=${this._handleShippingExclusionsChange}>
        </merchello-product-shipping-exclusions>
      </div>
    `;
  }

  /** Handles packages change from the shared component */
  private _handlePackagesChange(e: CustomEvent<PackagesChangeDetail>): void {
    this._formData = { ...this._formData, defaultPackageConfigurations: e.detail.packages };
  }

  /** Handles shipping exclusions change from the shared component */
  private _handleShippingExclusionsChange(e: CustomEvent<ShippingExclusionsChangeDetail>): void {
    // Update the local state - when checked=true, the option IS excluded
    this._shippingOptions = this._shippingOptions.map((o) => ({
      ...o,
      isExcluded: e.detail.excludedShippingOptionIds.includes(o.id),
      isPartiallyExcluded: false, // When bulk editing, clear partial state
    }));
  }

  private _renderSeoTab(): unknown {
    return html`
      <div class="tab-content">
        <uui-box headline="Search Engine Optimization">
          <umb-property-dataset
            .value=${this._getSeoDatasetValue()}
            @change=${this._handleSeoDatasetChange}>
            <umb-property
              alias="rootUrl"
              label="Product URL"
              description="The URL path for this product on your storefront"
              property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
              .config=${[{ alias: "maxChars", value: 1000 }]}>
            </umb-property>

            <umb-property
              alias="pageTitle"
              label="Page Title"
              description="The title shown in browser tabs and search results (recommended: under 60 characters)"
              property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
              .config=${[{ alias: "maxChars", value: 100 }]}>
            </umb-property>

            <umb-property
              alias="metaDescription"
              label="Meta Description"
              description="The description shown in search results (recommended: 150-160 characters)"
              property-editor-ui-alias="Umb.PropertyEditorUi.TextArea"
              .config=${[{ alias: "maxChars", value: 200 }]}>
            </umb-property>

            <umb-property
              alias="canonicalUrl"
              label="Canonical URL"
              description="Optional URL to indicate the preferred version of this page for SEO"
              property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
              .config=${[{ alias: "maxChars", value: 1000 }]}>
            </umb-property>

            <umb-property
              alias="noIndex"
              label="Hide from Search Engines"
              description="Adds noindex meta tag to prevent search engines from indexing this page"
              property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
            </umb-property>
          </umb-property-dataset>
        </uui-box>

        <uui-box headline="Social Sharing">
          <umb-property-dataset
            .value=${this._getSocialDatasetValue()}
            @change=${this._handleSocialDatasetChange}>
            <umb-property
              alias="openGraphImage"
              label="Open Graph Image"
              description="Image displayed when this page is shared on social media"
              property-editor-ui-alias="Umb.PropertyEditorUi.MediaPicker"
              .config=${[{ alias: "multiple", value: false }]}>
            </umb-property>
          </umb-property-dataset>
          <small class="hint">Recommended size: 1200x630 pixels</small>
        </uui-box>

        <uui-box headline="Search Preview">
          <div>${this._renderGoogleSearchPreview()}</div>
        </uui-box>
      </div>
    `;
  }

  private _renderGoogleSearchPreview(): unknown {
    const pageTitle = this._formData.pageTitle || this._formData.rootName || "Product Title";
    const metaDescription = this._formData.metaDescription || "No meta description set. Add a description to improve search visibility.";
    const url = this._formData.canonicalUrl || "https://yourstore.com/products/product-name";

    // Parse URL into breadcrumb format (how Google now displays URLs)
    const urlBreadcrumb = this._formatUrlAsBreadcrumb(url);

    // Google recommended limits (what Google displays before truncating)
    const titleRecommended = 60;
    const descRecommended = 160;

    const titleOverRecommended = pageTitle.length > titleRecommended;
    const descOverRecommended = metaDescription.length > descRecommended;

    // Show truncated version as Google would display it
    const displayTitle = titleOverRecommended ? pageTitle.substring(0, titleRecommended - 3) + "..." : pageTitle;
    const displayDescription = descOverRecommended ? metaDescription.substring(0, descRecommended - 3) + "..." : metaDescription;

    return html`
      <div class="google-preview">
        <div class="google-preview-header">
          <div class="google-preview-favicon">
            <uui-icon name="icon-globe"></uui-icon>
          </div>
          <div class="google-preview-site">
            <div class="google-preview-site-name">Your Store</div>
            <div class="google-preview-url">${urlBreadcrumb}</div>
          </div>
        </div>
        <div class="google-preview-title">${displayTitle}</div>
        <div class="google-preview-description">${displayDescription}</div>
      </div>
      <div class="google-preview-stats">
        <span class="${titleOverRecommended ? "stat-warning" : "stat-ok"}">
          Title: ${pageTitle.length}/${titleRecommended} chars ${titleOverRecommended ? "(Google may truncate)" : ""}
        </span>
        <span class="${descOverRecommended ? "stat-warning" : "stat-ok"}">
          Description: ${metaDescription.length}/${descRecommended} chars ${descOverRecommended ? "(Google may truncate)" : ""}
        </span>
      </div>
    `;
  }

  /**
   * Formats a URL as a breadcrumb string for Google Search preview.
   * Uses utility function from variant-helpers.
   */
  private _formatUrlAsBreadcrumb(url: string): string {
    return formatUrlAsBreadcrumb(url);
  }

  private _renderVariantsTab(): unknown {
    const variants = this._product?.variants ?? [];
    const selectedCount = this._selectedVariantIds.length;
    const allSelected = variants.length > 0 && selectedCount === variants.length;
    const partiallySelected = selectedCount > 0 && selectedCount < variants.length;

    return html`
      <div class="tab-content">
        <div class="section-header">
          <div>
            <h3>Product Variants</h3>
            <p class="section-description">
              Click a row to edit variant details. Select variants, choose fields, and batch update in one save.
            </p>
          </div>
          <uui-button
            look="primary"
            color="positive"
            label="Batch Update"
            @click=${this._openBatchUpdateModal}
            ?disabled=${selectedCount === 0}>
            Batch Update (${selectedCount})
          </uui-button>
        </div>

        <div class="table-container">
          <uui-table class="data-table">
            <uui-table-head>
              <uui-table-head-cell style="width: 56px;">
                <uui-checkbox
                  aria-label="Select all variants"
                  ?checked=${allSelected}
                  .indeterminate=${partiallySelected}
                  @change=${(e: Event) => this._handleSelectAllVariants((e.target as HTMLInputElement).checked)}>
                </uui-checkbox>
              </uui-table-head-cell>
              <uui-table-head-cell style="width: 60px;">Default</uui-table-head-cell>
              <uui-table-head-cell>Variant</uui-table-head-cell>
              <uui-table-head-cell>SKU</uui-table-head-cell>
              <uui-table-head-cell>Price</uui-table-head-cell>
              <uui-table-head-cell>Stock</uui-table-head-cell>
              <uui-table-head-cell>Status</uui-table-head-cell>
            </uui-table-head>
            ${variants.map((variant) =>
              this._renderVariantRow(variant, this._selectedVariantIds.includes(variant.id)),
            )}
          </uui-table>
        </div>
      </div>
    `;
  }

  private _handleVariantSelection(variantId: string, checked: boolean): void {
    if (checked) {
      if (!this._selectedVariantIds.includes(variantId)) {
        this._selectedVariantIds = [...this._selectedVariantIds, variantId];
      }
      return;
    }

    this._selectedVariantIds = this._selectedVariantIds.filter((id) => id !== variantId);
  }

  private _handleSelectAllVariants(checked: boolean): void {
    if (!checked) {
      this._selectedVariantIds = [];
      return;
    }

    this._selectedVariantIds = (this._product?.variants ?? []).map((variant) => variant.id);
  }

  private _getSelectedVariants(): ProductVariantDto[] {
    if (!this._product) return [];
    const selected = new Set(this._selectedVariantIds);
    return this._product.variants.filter((variant) => selected.has(variant.id));
  }

  private async _openBatchUpdateModal(): Promise<void> {
    if (!this._product || !this.#modalManager) return;

    const selectedVariants = this._getSelectedVariants();
    if (selectedVariants.length === 0) return;

    const modal = this.#modalManager.open(this, MERCHELLO_VARIANT_BATCH_UPDATE_MODAL, {
      data: {
        productRootId: this._product.id,
        variants: selectedVariants.map((variant) => ({ ...variant })),
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (!this.#isConnected || !result?.isSaved) return;

    this.#notificationContext?.peek("positive", {
      data: {
        headline: "Batch update complete",
        message: `${result.updatedCount} variant${result.updatedCount === 1 ? "" : "s"} updated successfully.`,
      },
    });

    this._selectedVariantIds = [];
    await this.#workspaceContext?.reload();
  }

  private _renderVariantRow(variant: ProductVariantDto, isSelected: boolean): unknown {
    const variantHref = this._product ? getVariantDetailHref(this._product.id, variant.id) : "";
    const optionDescription = this._getVariantOptionDescription(variant);
    // Use backend-calculated canBeDefault (single source of truth for eligibility)
    const canBeDefault = variant.canBeDefault;
    const disabledTitle = !canBeDefault ? "Cannot set as default: variant is unavailable or out of stock" : "";
    return html`
      <uui-table-row>
        <uui-table-cell>
          <uui-checkbox
            aria-label="Select ${variant.name || "Unnamed"} variant"
            ?checked=${isSelected}
            @change=${(e: Event) => this._handleVariantSelection(variant.id, (e.target as HTMLInputElement).checked)}
            @click=${(e: Event) => e.stopPropagation()}>
          </uui-checkbox>
        </uui-table-cell>
        <uui-table-cell>
          <uui-radio
            aria-label="Set ${variant.name || "Unnamed"} as default variant"
            name="default-variant-${variant.productRootId}"
            ?checked=${variant.default}
            ?disabled=${!canBeDefault}
            title=${disabledTitle}
            @click=${(e: Event) => {
              e.preventDefault();
              if (canBeDefault) {
                this._handleSetDefaultVariant(variant.id);
              }
            }}>
          </uui-radio>
        </uui-table-cell>
        <uui-table-cell>
          <div class="variant-name-cell">
            <a href=${variantHref} class="variant-link">${variant.name || "Unnamed"}</a>
            ${optionDescription ? html`<span class="variant-options-text">${optionDescription}</span>` : nothing}
          </div>
        </uui-table-cell>
        <uui-table-cell>${variant.sku || "-"}</uui-table-cell>
        <uui-table-cell>${formatCurrency(variant.price)}</uui-table-cell>
        <uui-table-cell>
          <span class="badge ${variant.stockStatusCssClass}" title=${variant.stockStatusLabel}>${variant.totalStock}</span>
        </uui-table-cell>
        <uui-table-cell>
          <span class="badge ${variant.availableForPurchase ? "badge-positive" : "badge-danger"}">
            ${variant.availableForPurchase ? "Available" : "Unavailable"}
          </span>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  /**
   * Parses the variant's option key and returns a human-readable description
   * of the option value combination (e.g., "Red / Large / Cotton").
   * Uses utility function from variant-helpers.
   */
  private _getVariantOptionDescription(variant: ProductVariantDto): string | null {
    if (!this._product) return null;
    return getVariantOptionDescription(variant, this._product.productOptions);
  }

  private async _handleSetDefaultVariant(variantId: string): Promise<void> {
    if (!this._product) return;

    // Skip if this variant is already the default
    const clickedVariant = this._product.variants.find(v => v.id === variantId);
    if (clickedVariant?.default) return;

    const productRootId = this._product.id;

    // Optimistic UI update - immediately show new default
    const updatedVariants = this._product.variants.map(v => ({
      ...v,
      default: v.id === variantId
    }));
    this._product = { ...this._product, variants: updatedVariants };

    try {
      const { error } = await MerchelloApi.setDefaultVariant(productRootId, variantId);

      if (!error) {
        this.#notificationContext?.peek("positive", { data: { headline: "Default variant updated", message: "" } });
        // Reload to sync with server state
        await this.#workspaceContext?.reload();
      } else {
        this.#notificationContext?.peek("danger", { data: { headline: "Failed to set default variant", message: error.message } });
        // Revert optimistic update on error
        await this.#workspaceContext?.reload();
      }
    } catch {
      this.#notificationContext?.peek("danger", { data: { headline: "Error", message: "An unexpected error occurred" } });
      // Revert optimistic update on error
      await this.#workspaceContext?.reload();
    }
  }

  /**
   * Renders the Basic Info tab for single-variant products using shared component
   */
  private _renderBasicInfoTab(): unknown {
    return html`
      <div class="tab-content">
        <merchello-variant-basic-info
          .formData=${this._variantFormData}
          .fieldErrors=${this._variantFieldErrors}
          @variant-change=${(e: CustomEvent) => (this._variantFormData = e.detail)}>
        </merchello-variant-basic-info>
      </div>
    `;
  }

  /**
   * Renders the Shopping Feed tab for single-variant products using shared component
   */
  private _renderShoppingFeedTab(): unknown {
    return html`
      <div class="tab-content">
        <uui-box headline="Product Feed Defaults">
          <umb-property-dataset
            .value=${this._getRootFeedDatasetValue()}
            @change=${this._handleRootFeedDatasetChange}>
            <umb-property
              alias="shoppingFeedBrand"
              label="Default Brand"
              description="Used when a variant does not define a brand override."
              property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
              .config=${[{ alias: "maxChars", value: 150 }]}>
            </umb-property>

            <umb-property
              alias="shoppingFeedCondition"
              label="Default Condition"
              description="Default Google condition for variants. Variants can override this."
              property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
              .config=${[{
                alias: "items",
                value: [
                  { name: "New", value: "new" },
                  { name: "Used", value: "used" },
                  { name: "Refurbished", value: "refurbished" },
                ],
              }]}>
            </umb-property>
          </umb-property-dataset>
        </uui-box>

        <merchello-variant-feed-settings
          .formData=${this._variantFormData}
          @variant-change=${(e: CustomEvent) => (this._variantFormData = e.detail)}>
        </merchello-variant-feed-settings>
      </div>
    `;
  }

  /**
   * Renders the Stock tab for single-variant products using shared component
   */
  private _renderStockTab(): unknown {
    return html`
      <div class="tab-content">
        <merchello-variant-stock-display
          .warehouseStock=${this._variantFormData.warehouseStock ?? []}
          .totalAvailableStock=${this._variantFormData.totalStock ?? 0}
          .totalReservedStock=${this._variantFormData.totalReservedStock ?? 0}
          @stock-settings-change=${this._handleStockSettingsChange}>
        </merchello-variant-stock-display>
      </div>
    `;
  }

  private _handleStockSettingsChange(e: CustomEvent<StockSettingsChangeDetail>): void {
    const { warehouseId, stock, reorderPoint, trackStock } = e.detail;
    const updatedStock = (this._variantFormData.warehouseStock ?? []).map((ws) => {
      if (ws.warehouseId !== warehouseId) return ws;
      return {
        ...ws,
        ...(stock !== undefined && { stock }),
        ...(reorderPoint !== undefined && { reorderPoint }),
        ...(trackStock !== undefined && { trackStock }),
      };
    });
    this._variantFormData = { ...this._variantFormData, warehouseStock: updatedStock };
  }

  private _renderOptionsTab(): unknown {
    const options = this._formData.productOptions ?? [];
    const isNew = this.#workspaceContext?.isNew ?? true;
    const estimatedVariants = calculateEstimatedVariantCount(options);
    const maxOptions = this._optionSettings?.maxProductOptions ?? 5;
    const isAtMaxOptions = options.length >= maxOptions;

    return html`
      <div class="tab-content">
        ${isNew
          ? html`
              <uui-box class="info-banner warning">
                <div class="info-content">
                  <uui-icon name="icon-alert"></uui-icon>
                  <div>
                    <strong>Save Required</strong>
                    <p>You must save the product before adding options.</p>
                  </div>
                </div>
              </uui-box>
            `
          : html`
              <uui-box class="info-banner">
                <div class="info-content">
                  <uui-icon name="icon-lightbulb"></uui-icon>
                  <div>
                    <strong>About Product Options</strong>
                    <p>Options with "Generates Variants" create all combinations (for example, 3 sizes x 4 colors = 12 variants). Options without this are add-ons that modify price.</p>
                  </div>
                </div>
              </uui-box>
            `}

        <div class="section-header">
          <div>
            <h3>Product Options <span class="option-count">${options.length}/${maxOptions}</span></h3>
            ${estimatedVariants > 0 ? html`<small class="hint">Will generate ${estimatedVariants} variant${estimatedVariants !== 1 ? 's' : ''}</small>` : nothing}
          </div>
          <uui-button
            look="primary"
            color="positive"
            label="Add Option"
            ?disabled=${isNew || isAtMaxOptions}
            @click=${this._addNewOption}>
            <uui-icon name="icon-add"></uui-icon>
            Add Option
          </uui-button>
        </div>

        <div class="options-list">${options.map((option) => this._renderOptionCard(option))}</div>
        ${options.length === 0 && !isNew
          ? html`
              <div class="empty-state">
                <uui-icon name="icon-layers"></uui-icon>
                <p>No options configured</p>
                <p class="hint">Use the <strong>Add Option</strong> button above to add options like Size, Color, or Material</p>
              </div>
            `
          : nothing}

      </div>
    `;
  }

  private _renderOptionCard(option: ProductOptionDto): unknown {
    return html`
      <uui-box class="option-card" data-option-id=${option.id}>
        <div class="option-header">
          <uui-icon class="option-drag-handle" name="icon-navigation"></uui-icon>
          <div class="option-info">
            <strong>${option.name}</strong>
            <span class="badge ${option.isVariant ? "badge-positive" : "badge-default"}">
              ${option.isVariant ? "Generates Variants" : "Add-on"}
            </span>
            ${!option.isVariant
              ? html` <span class="badge badge-default">${option.isMultiSelect ? "Multi-select" : "Single-select"}</span> `
              : nothing}
            ${!option.isVariant
              ? html` <span class="badge badge-default">${option.isRequired ? "Required" : "Optional"}</span> `
              : nothing}
            ${option.optionUiAlias
              ? html` <span class="badge badge-default">${option.optionUiAlias}</span> `
              : nothing}
          </div>
          <div class="option-actions">
            <uui-button compact look="secondary" @click=${() => this._editOption(option)} label="Edit option" aria-label="Edit ${option.name}">
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button compact look="primary" color="danger" @click=${() => this._deleteOption(option.id)} label="Delete option" aria-label="Delete ${option.name}">
              <uui-icon name="icon-trash"></uui-icon>
            </uui-button>
          </div>
        </div>

        <div class="option-values">
          ${option.values.map((value) => this._renderOptionValue(value, option.optionUiAlias))}
          ${option.values.length === 0 ? html`<p class="hint">No values added yet</p>` : nothing}
        </div>
      </uui-box>
    `;
  }

  private _renderOptionValue(value: ProductOptionValueDto, uiAlias: string | null): unknown {
    const hasAdjustments = value.priceAdjustment !== 0 || value.costAdjustment !== 0;

    return html`
      <div class="option-value-chip">
        ${uiAlias === "colour" && value.hexValue
          ? html` <span class="color-swatch" style="background-color: ${value.hexValue}"></span> `
          : nothing}
        <span>${value.name}</span>
        ${hasAdjustments
          ? html`
              <span class="adjustments">
                ${value.priceAdjustment !== 0
                  ? html`<span class="price-adjustment">${value.priceAdjustment > 0 ? "+" : ""}${formatCurrency(value.priceAdjustment)}</span>`
                  : nothing}
                ${value.priceAdjustment !== 0 && value.costAdjustment !== 0
                  ? html`<span class="adjustment-separator">/</span>`
                  : nothing}
                ${value.costAdjustment !== 0
                  ? html`<span class="cost-adjustment">${value.costAdjustment > 0 ? "+" : ""}${formatCurrency(value.costAdjustment)} cost</span>`
                  : nothing}
              </span>
            `
          : nothing}
      </div>
    `;
  }

  private async _addNewOption(): Promise<void> {
    if (!this.#modalManager || !this._optionSettings) return;

    const modal = this.#modalManager.open(this, MERCHELLO_OPTION_EDITOR_MODAL, {
      data: {
        option: undefined,
        settings: this._optionSettings,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.isSaved && result.option) {
      // Add option to form data
      const options = this._formData.productOptions || [];
      this._formData = {
        ...this._formData,
        productOptions: [...options, result.option],
      };
      await this._saveOptions();
    }
  }

  private async _editOption(option: ProductOptionDto): Promise<void> {
    if (!this.#modalManager || !this._optionSettings) return;

    const modal = this.#modalManager.open(this, MERCHELLO_OPTION_EDITOR_MODAL, {
      data: {
        option: option,
        settings: this._optionSettings,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.isSaved) {
      if (result.isDeleted) {
        await this._deleteOption(option.id);
      } else if (result.option) {
        // Update option in form data - spread to create mutable copy (original may be frozen)
        const options = [...(this._formData.productOptions || [])];
        const index = options.findIndex((o) => o.id === option.id);
        if (index !== -1) {
          options[index] = result.option;
          this._formData = { ...this._formData, productOptions: options };
          await this._saveOptions();
        }
      }
    }
  }

  private async _deleteOption(optionId: string): Promise<void> {
    const option = this._formData.productOptions?.find((o) => o.id === optionId);
    const optionName = option?.name || "this option";

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Option",
        content: `Delete "${optionName}" and remove it from this product. This cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return; // User cancelled
    }
    if (!this.#isConnected) return; // Component disconnected while modal was open

    const options = (this._formData.productOptions || []).filter((o) => o.id !== optionId);
    this._formData = { ...this._formData, productOptions: options };
    await this._saveOptions();
  }

  /**
   * Checks if the variant structure has changed in a way that requires regeneration.
   * Regeneration is needed when:
   * - Variant options are added or removed
   * - Values are added or removed from variant options
   * - The isVariant flag changed on any option
   *
   * Regeneration is NOT needed for metadata-only changes (name, mediaKey, hexValue, etc.)
   */
  private _hasVariantStructureChanged(): boolean {
    const originalOptions = this._product?.productOptions || [];
    const newOptions = this._formData.productOptions || [];

    // Get variant options from both
    const originalVariantOptions = originalOptions.filter((o) => o.isVariant);
    const newVariantOptions = newOptions.filter((o) => o.isVariant);

    // Check if number of variant options changed
    if (originalVariantOptions.length !== newVariantOptions.length) {
      return true;
    }

    // Check each variant option for structural changes
    for (const newOpt of newVariantOptions) {
      const originalOpt = originalVariantOptions.find((o) => o.id === newOpt.id);

      // New variant option was added (ID doesn't exist in original)
      if (!originalOpt) {
        return true;
      }

      // Check if isVariant flag changed (option converted to/from variant)
      if (originalOpt.isVariant !== newOpt.isVariant) {
        return true;
      }

      // Check if value count changed
      if (originalOpt.values.length !== newOpt.values.length) {
        return true;
      }

      // Check if value IDs changed (values added/removed, not just reordered)
      const originalValueIds = new Set(originalOpt.values.map((v) => v.id));
      const newValueIds = new Set(newOpt.values.map((v) => v.id));
      if (originalValueIds.size !== newValueIds.size) {
        return true;
      }
      for (const id of newValueIds) {
        if (!originalValueIds.has(id)) {
          return true;
        }
      }
    }

    // Check if any original variant option was removed
    for (const originalOpt of originalVariantOptions) {
      const stillExists = newVariantOptions.some((o) => o.id === originalOpt.id);
      if (!stillExists) {
        return true;
      }
    }

    return false;
  }

  /**
   * Confirms with user before saving options that will regenerate variants.
   * Returns true if user confirms or no confirmation needed, false if cancelled.
   */
  private async _confirmVariantRegeneration(): Promise<boolean> {
    const currentVariantCount = this._product?.variants.length ?? 0;

    // If no structural changes, no confirmation needed
    if (!this._hasVariantStructureChanged()) {
      return true;
    }

    const options = this._formData.productOptions || [];
    const variantOptions = options.filter((o) => o.isVariant);

    // Calculate new variant count from cartesian product
    const newVariantCount = variantOptions.length > 0
      ? variantOptions.reduce((acc, opt) => acc * (opt.values.length || 1), 1)
      : 1;

    // Show warning if there are existing variants and variant options exist
    if (currentVariantCount > 0 && variantOptions.length > 0) {
      const content = currentVariantCount === newVariantCount
        ? `This will regenerate all ${currentVariantCount} variants. Variant-specific data (pricing, stock levels, images, SKUs) will need to be re-entered.`
        : `${currentVariantCount} existing variant${currentVariantCount !== 1 ? "s" : ""} will be replaced with ${newVariantCount} new variant${newVariantCount !== 1 ? "s" : ""}. Variant-specific data (pricing, stock levels, images, SKUs) will need to be re-entered.`;

      const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
        data: {
          headline: "Regenerate Variants",
          content,
          confirmLabel: "Regenerate",
          color: "danger",
        },
      });

      try {
        await modalContext?.onSubmit();
      } catch {
        return false; // User cancelled
      }
      if (!this.#isConnected) return false; // Component disconnected while modal was open
      return true;
    }

    // Show warning if removing all variant options (will collapse to single variant)
    if (currentVariantCount > 1 && variantOptions.length === 0) {
      const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
        data: {
          headline: "Remove Variant Options",
          content: `Removing all variant options will collapse this product to a single variant. Current variants: ${currentVariantCount}. After save: 1 variant (default only). ${currentVariantCount - 1} variants will be DELETED. Only the default variant will be kept.`,
          confirmLabel: "Continue",
          color: "danger",
        },
      });

      try {
        await modalContext?.onSubmit();
      } catch {
        return false; // User cancelled
      }
      if (!this.#isConnected) return false; // Component disconnected while modal was open
      return true;
    }

    return true;
  }

  private async _saveOptions(): Promise<void> {
    if (!this._product?.id) return;

    // Confirm with user before potentially destructive operation
    const confirmed = await this._confirmVariantRegeneration();
    if (!confirmed) {
      // User cancelled - reload to revert form state
      this.#workspaceContext?.reload();
      return;
    }

    try {
      const options = (this._formData.productOptions || []).map((opt, index) => ({
        id: opt.id,
        name: opt.name,
        alias: opt.alias ?? undefined,
        sortOrder: index,
        optionTypeAlias: opt.optionTypeAlias ?? undefined,
        optionUiAlias: opt.optionUiAlias ?? undefined,
        isVariant: opt.isVariant,
        isMultiSelect: opt.isVariant ? false : (opt.isMultiSelect ?? true),
        isRequired: opt.isVariant ? false : (opt.isRequired ?? false),
        values: opt.values.map((val, valIndex) => ({
          id: val.id,
          name: val.name,
          sortOrder: valIndex,
          hexValue: val.hexValue ?? undefined,
          mediaKey: val.mediaKey ?? undefined,
          priceAdjustment: val.priceAdjustment,
          costAdjustment: val.costAdjustment,
          skuSuffix: val.skuSuffix ?? undefined,
          weightKg: val.weightKg ?? undefined,
        })),
      }));

      // Check if variant structure changed (for conditional notifications)
      const willRegenerate = this._hasVariantStructureChanged();

      this.#notificationContext?.peek("default", {
        data: { headline: "Saving options...", message: willRegenerate ? "Variants will be regenerated" : "" },
      });

      const { data, error } = await MerchelloApi.saveProductOptions(this._product.id, options);

      // Prevent state updates if component was disconnected during async operation
      if (!this.#isConnected) return;

      if (!error && data) {
        this._formData = { ...this._formData, productOptions: data };
        this.#optionSorter.setModel(data);
        this.#notificationContext?.peek("positive", {
          data: { headline: "Options saved", message: willRegenerate ? "Variants have been regenerated" : "" },
        });
        this.#workspaceContext?.reload();
      } else if (error) {
        this._errorMessage = "Failed to save options: " + error.message;
        this.#notificationContext?.peek("danger", { data: { headline: "Failed to save options", message: error.message } });
      }
    } catch (error) {
      if (!this.#isConnected) return;
      this._errorMessage = error instanceof Error ? error.message : "Failed to save options";
      this.#notificationContext?.peek("danger", { data: { headline: "Error", message: "An unexpected error occurred" } });
    }
  }

  /**
   * Renders the Filters tab for assigning filters to the product.
   * Uses the shared product-filters component.
   * Note: Only shown for single-variant products.
   */
  private _renderFiltersTab(): unknown {
    const isNew = this.#workspaceContext?.isNew ?? true;

    return html`
      <div class="tab-content">
        <merchello-product-filters
          .filterGroups=${this._filterGroups}
          .assignedFilterIds=${this._assignedFilterIds}
          .isNewProduct=${isNew}
          @filters-change=${this._handleFiltersChange}>
        </merchello-product-filters>
      </div>
    `;
  }

  /** Handles filter selection changes from the shared component */
  private _handleFiltersChange(e: CustomEvent<FiltersChangeDetail>): void {
    this._assignedFilterIds = e.detail.filterIds;
  }

  /**
   * Checks if filter assignments have changed
   */
  private _hasFilterChanges(): boolean {
    if (this._assignedFilterIds.length !== this._originalAssignedFilterIds.length) return true;
    const sortedCurrent = [...this._assignedFilterIds].sort();
    const sortedOriginal = [...this._originalAssignedFilterIds].sort();
    return sortedCurrent.some((id, index) => id !== sortedOriginal[index]);
  }

  /**
   * Saves filter assignments for the product variant
   * Note: Filters are assigned to Products (variants), not ProductRoots
   * Only applicable for single-variant products
   */
  private async _saveFilterAssignments(): Promise<void> {
    // Only save filters for single-variant products
    if (!this._isSingleVariant()) return;

    // Use the variant ID since filters are associated with Products, not ProductRoots
    const variantId = this._product?.variants[0]?.id;
    if (!variantId || !this._hasFilterChanges()) return;

    const { error } = await MerchelloApi.assignFiltersToProduct(variantId, this._assignedFilterIds);

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to save filters", message: error.message },
      });
      return;
    }

    // Update original to match current after successful save
    this._originalAssignedFilterIds = [...this._assignedFilterIds];
  }

  /**
   * Handles router slot initialization
   */
  private _onRouterInit(event: UmbRouterSlotInitEvent): void {
    this._routerPath = event.target.absoluteRouterPath;
  }

  /**
   * Handles router slot path changes
   */
  private _onRouterChange(event: UmbRouterSlotChangeEvent): void {
    this._activePath = event.target.localActiveViewPath || "";
  }

  override render() {
    if (this._isLoading) {
      return html`
        <umb-body-layout header-fit-height>
          <div class="loading">
            <uui-loader></uui-loader>
          </div>
        </umb-body-layout>
      `;
    }

    const isNew = this.#workspaceContext?.isNew ?? true;
    const activeTab = this._getActiveTab();

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Header: back button + icon + name input -->
        <uui-button slot="header" compact href=${getProductsListHref()} label="Back" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <div id="header" slot="header">
          <umb-icon name="icon-box"></umb-icon>
          <uui-input
            id="name-input"
            label="Product name"
            .value=${this._formData.rootName || ""}
            @input=${(e: Event) => this._handleInputChange("rootName", (e.target as HTMLInputElement).value)}
            placeholder=${isNew ? "Enter product name..." : "Product name"}
            ?invalid=${!!this._fieldErrors.rootName}
            aria-label="Product name"
            aria-required="true">
          </uui-input>
        </div>

        <!-- Inner body layout for tabs + content -->
        <umb-body-layout header-fit-height header-no-padding>
          ${this._renderTabs()}

          <umb-router-slot
            .routes=${this._routes}
            @init=${this._onRouterInit}
            @change=${this._onRouterChange}>
          </umb-router-slot>

          ${activeTab === "details" ? this._renderDetailsTab() : nothing}
          ${activeTab === "basic-info" && this._isSingleVariant() ? this._renderBasicInfoTab() : nothing}
          ${activeTab === "media" ? this._renderMediaTab() : nothing}
          ${activeTab === "shipping" ? this._renderShippingTab() : nothing}
          ${activeTab === "seo" ? this._renderSeoTab() : nothing}
          ${activeTab === "feed" && this._isSingleVariant() ? this._renderShoppingFeedTab() : nothing}
          ${activeTab === "stock" && this._isSingleVariant() ? this._renderStockTab() : nothing}
          ${activeTab === "variants" ? this._renderVariantsTab() : nothing}
          ${activeTab === "options" ? this._renderOptionsTab() : nothing}
          ${activeTab === "filters" && this._isSingleVariant() ? this._renderFiltersTab() : nothing}
          ${this._isContentTab(activeTab) ? this._renderContentTab(activeTab) : nothing}
        </umb-body-layout>

        <!-- Footer with save button -->
        <umb-footer-layout slot="footer">
          <uui-button
            slot="actions"
            look="primary"
            color="positive"
            @click=${this._handleSave}
            ?disabled=${this._isSaving}
            label=${this._isSaving ? "Saving..." : isNew ? "Create Product" : "Save Changes"}>
            ${this._isSaving ? "Saving..." : isNew ? "Create Product" : "Save Changes"}
          </uui-button>
        </umb-footer-layout>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    badgeStyles,
    css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
        --uui-tab-background: var(--uui-color-surface);
      }

      /* Header layout */
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
        flex: 1 1 auto;
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

      .back-button {
        margin-right: var(--uui-size-space-2);
      }

      /* Loading state */
      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 400px;
      }

      /* Tab styling - Umbraco pattern */
      uui-tab-group {
        --uui-tab-divider: var(--uui-color-border);
        width: 100%;
      }

      /* Fix badge overflow on tabs */
      uui-tab {
        overflow: visible;
      }

      uui-tab::part(button) {
        overflow: visible;
      }

      /* Element Type tabs (rendered after Merchello tabs) */
      uui-tab.merchello-tab--last {
        border-right: none !important;
      }

      uui-tab.element-type-tab--first {
        position: relative;
        margin-left: 0;
        z-index: 1;
      }

      /* Section divider between Merchello tabs and Element Type tabs */
      uui-tab.element-type-tab--first::before {
        content: "";
        position: absolute;
        left: -1px;
        top: 6px;
        bottom: 6px;
        width: 2px;
        background: repeating-linear-gradient(
          to bottom,
          var(--uui-color-border-emphasis, var(--uui-color-divider-standalone, var(--uui-color-border-standalone))) 0 2px,
          transparent 2px 5px
        );
        pointer-events: none;
        z-index: 2;
      }

      uui-tab.element-type-tab--first::part(button) {
        padding-left: var(--uui-size-space-2);
      }

      uui-tab.element-type-tab--first::part(button)::before {
        content: "CONTENT";
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
        margin-right: var(--uui-size-space-2);
      }

      /* Hide router slot as we render content inline */
      umb-router-slot {
        display: none;
      }

      /* Box styling - Umbraco pattern */
      uui-box {
        --uui-box-default-padding: var(--uui-size-space-5);
      }

      /* Property adjustments */
      umb-property:first-child {
        padding-top: 0;
      }

      umb-property:last-child {
        padding-bottom: 0;
      }

      umb-property uui-select,
      umb-property uui-input,
      umb-property uui-textarea,
      umb-property-layout uui-select,
      umb-property-layout uui-input,
      umb-property-layout uui-textarea {
        width: 100%;
      }

      .view-select-editor {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
      }

      /* Tab content */
      .tab-content {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-5);
      }

      .warehouse-setup-warning-banner {
        display: flex;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-3);
        margin-top: var(--uui-size-space-3);
        border: 1px solid var(--uui-color-warning);
        border-radius: var(--uui-border-radius);
        background: color-mix(in srgb, var(--uui-color-warning) 8%, var(--uui-color-surface));
      }

      .warehouse-setup-warning-banner uui-icon {
        color: var(--uui-color-warning-emphasis);
        flex-shrink: 0;
      }

      .warehouse-setup-warning-banner strong {
        display: block;
        margin-bottom: var(--uui-size-space-1);
      }

      .warehouse-setup-warning-banner p {
        margin: 0;
        color: var(--uui-color-text);
      }

      .field-error-message {
        color: var(--uui-color-danger);
        display: block;
        font-size: var(--uui-type-small-size);
        margin-top: var(--uui-size-space-1);
      }

      .hint {
        font-size: 0.875rem;
        color: var(--uui-color-text-alt);
        margin: 0;
      }

      /* Info and error banners */
      .error-box {
        background: var(--uui-color-danger-surface);
        border-left: 3px solid var(--uui-color-danger);
      }

      .info-banner {
        background: var(--uui-color-surface);
        border-left: 3px solid var(--uui-color-selected);
      }

      .info-banner.warning {
        background: var(--uui-color-warning-surface);
        border-left-color: var(--uui-color-warning);
      }

      .info-content {
        display: flex;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-3);
      }

      .info-content uui-icon {
        font-size: 24px;
        flex-shrink: 0;
      }

      .info-content strong {
        display: block;
        margin-bottom: var(--uui-size-space-1);
      }

      .info-content p {
        margin: 0;
        color: var(--uui-color-text-alt);
      }

      .error-message {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        color: var(--uui-color-danger);
        padding: var(--uui-size-space-3);
      }

      /* Section headers */
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--uui-size-space-3);
        margin-bottom: var(--uui-size-space-3);
      }

      .section-header h3 {
        margin: 0;
        font-size: 1.25rem;
      }

      .option-count {
        font-size: 0.875rem;
        font-weight: normal;
        color: var(--uui-color-text-alt);
        margin-left: var(--uui-size-space-2);
      }

      .section-description {
        color: var(--uui-color-text-alt);
        margin: var(--uui-size-space-2) 0;
      }

      /* Table styles */
      .table-container {
        overflow-x: auto;
      }

      .data-table {
        width: 100%;
      }

      .data-table uui-table-cell:first-child,
      .data-table uui-table-head-cell:first-child {
        width: 56px;
      }

      .variant-name-cell {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }

      .variant-link {
        font-weight: 500;
        color: var(--uui-color-interactive);
        text-decoration: none;
      }

      .variant-link:hover {
        text-decoration: underline;
        color: var(--uui-color-interactive-emphasis);
      }

      .variant-options-text {
        font-size: 0.8125rem;
        color: var(--uui-color-text-alt);
      }

      /* Options */
      .options-list {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-3);
      }

      .option-card {
        background: var(--uui-color-surface);
      }

      .option-card.--umb-sorter-placeholder {
        opacity: 0.3;
      }

      .option-drag-handle {
        cursor: grab;
        color: var(--uui-color-text-alt);
        flex-shrink: 0;
      }

      .option-drag-handle:active {
        cursor: grabbing;
      }

      .option-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--uui-size-space-3);
        border-bottom: 1px solid var(--uui-color-border);
      }

      .option-info {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        flex-wrap: wrap;
        flex: 1;
        min-width: 0;
      }

      .option-actions {
        display: flex;
        gap: var(--uui-size-space-2);
      }

      .option-values {
        display: flex;
        flex-wrap: wrap;
        gap: var(--uui-size-space-2);
        padding: var(--uui-size-space-3);
        min-height: 60px;
        align-items: center;
      }

      .option-value-chip {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-1);
        padding: var(--uui-size-space-2) var(--uui-size-space-3);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
        font-size: 0.875rem;
      }

      .color-swatch {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 1px solid var(--uui-color-border);
      }

      .adjustments {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-1);
        font-size: 0.8125rem;
      }

      .price-adjustment {
        font-weight: 600;
        color: var(--uui-color-positive);
      }

      .cost-adjustment {
        font-weight: 500;
        color: var(--uui-color-text-alt);
        font-style: italic;
      }

      .adjustment-separator {
        color: var(--uui-color-border-standalone);
      }

      /* Empty state for options */
      .empty-state {
        text-align: center;
        padding: var(--uui-size-space-6);
        color: var(--uui-color-text-alt);
      }

      .empty-state uui-icon {
        font-size: 48px;
        opacity: 0.5;
        margin-bottom: var(--uui-size-space-3);
      }

      .empty-state p {
        margin: var(--uui-size-space-2) 0;
      }

      .empty-state strong {
        color: var(--uui-color-text);
      }

      /* Google Search Preview - Updated 2024/2025 styling */
      .google-preview {
        font-family: Arial, sans-serif;
        max-width: 600px;
        padding: var(--uui-size-space-4);
        background: #fff;
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
      }

      .google-preview-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 4px;
      }

      .google-preview-favicon {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #f1f3f4;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .google-preview-favicon uui-icon {
        font-size: 16px;
        color: #5f6368;
      }

      .google-preview-site {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .google-preview-site-name {
        font-size: 14px;
        color: #202124;
        line-height: 1.3;
      }

      .google-preview-url {
        font-size: 12px;
        color: #4d5156;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .google-preview-title {
        font-size: 20px;
        color: #1a0dab;
        line-height: 1.3;
        margin-bottom: 4px;
        word-wrap: break-word;
      }

      .google-preview-title:hover {
        text-decoration: underline;
        cursor: pointer;
      }

      .google-preview-description {
        font-size: 14px;
        color: #4d5156;
        line-height: 1.58;
        word-wrap: break-word;
      }

      .google-preview-stats {
        display: flex;
        gap: var(--uui-size-space-4);
        margin-top: var(--uui-size-space-3);
        font-size: 12px;
        flex-wrap: wrap;
      }

      .google-preview-stats .stat-ok {
        color: var(--uui-color-positive);
      }

      .google-preview-stats .stat-warning {
        color: var(--uui-color-warning);
      }

      /* Element Type content styling */
      merchello-product-element-properties umb-property {
        --umb-property-layout-description-display: none;
      }

    `,
  ];
}

export default MerchelloProductDetailElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-detail": MerchelloProductDetailElement;
  }
}

