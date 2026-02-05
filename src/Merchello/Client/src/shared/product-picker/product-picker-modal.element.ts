import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { ProductPickerModalData, ProductPickerModalValue } from "./product-picker-modal.token.js";
import type {
  ProductPickerSelection,
  PickerProductRoot,
  PickerVariant,
  PickerViewState,
  PendingAddonSelection,
  PendingShippingSelection,
  ShippingOptionForPicker,
  SelectedAddon,
  PickerAddonOption,
} from "./product-picker.types.js";
import type { ProductListItemDto, ProductListParams, ProductRootDetailDto } from "@products/types/product.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { getVariantImageUrl, buildOptionValuesDisplay, formatPrice } from "./product-picker.types.js";
import "./product-picker-list.element.js";

@customElement("merchello-product-picker-modal")
export class MerchelloProductPickerModalElement extends UmbModalBaseElement<
  ProductPickerModalData,
  ProductPickerModalValue
> {
  // Search & pagination state
  @state() private _searchTerm = "";
  @state() private _page = 1;
  @state() private _pageSize = 20;
  @state() private _totalPages = 0;
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;

  // Product data
  @state() private _productRoots: PickerProductRoot[] = [];

  // Selection state (variant ID -> selection data)
  @state() private _selections: Map<string, ProductPickerSelection> = new Map();

  // Root selection state (root ID -> root data) - used when selectRoots = true
  @state() private _selectedRoots: Map<string, PickerProductRoot> = new Map();

  // View state for multi-step flow
  @state() private _viewState: PickerViewState = "product-selection";
  @state() private _pendingAddonSelection: PendingAddonSelection | null = null;
  @state() private _selectedAddons: Map<string, SelectedAddon> = new Map(); // optionId -> selected addon

  // Shipping selection state
  @state() private _pendingShippingSelection: PendingShippingSelection | null = null;
  @state() private _selectedShippingOptionId: string | null = null;

  // Cache product detail for add-on options
  private _productDetailCache: Map<string, ProductRootDetailDto> = new Map();

  private _searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _addonPreviewDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Addon price preview (from backend API - single source of truth)
  @state() private _addonPricePreview: { basePrice: number; addonsTotal: number; totalPrice: number } | null = null;
  @state() private _isLoadingAddonPreview = false;
  @state() private _addonPreviewError: string | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this._loadProducts();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }
    if (this._addonPreviewDebounceTimer) {
      clearTimeout(this._addonPreviewDebounceTimer);
    }
  }

  private get _config() {
    return this.data?.config;
  }

  private get _currencySymbol(): string {
    return this._config?.currencySymbol ?? "£";
  }

  private get _excludeProductIds(): string[] {
    return this._config?.excludeProductIds ?? [];
  }

  private get _showAddons(): boolean {
    return this._config?.showAddons !== false; // Default true
  }

  private get _showImages(): boolean {
    return this._config?.showImages !== false; // Default true
  }

  private get _isPropertyEditorMode(): boolean {
    return this._config?.propertyEditorMode === true;
  }

  private get _maxItems(): number {
    return this._config?.maxItems ?? Infinity;
  }

  private get _selectRoots(): boolean {
    return this._config?.selectRoots === true;
  }

  // ============================================
  // Data Loading
  // ============================================

  private async _loadProducts(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const params: ProductListParams = {
      page: this._page,
      pageSize: this._pageSize,
      sortBy: "name",
      sortDir: "asc",
    };

    if (this._searchTerm.trim()) {
      params.search = this._searchTerm.trim();
    }
    if (this._config?.productTypeId) {
      params.productTypeId = this._config.productTypeId;
    }
    if (this._config?.collectionId) {
      params.collectionId = this._config.collectionId;
    }

    const { data, error } = await MerchelloApi.getProducts(params);

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    if (data) {
      // Transform to picker product roots
      const excludeIds = this._excludeProductIds;
      this._productRoots = data.items
        .filter((item) => !excludeIds.includes(item.productRootId))
        .map((item) => this._mapToPickerRoot(item));
      this._totalPages = data.totalPages;
    }

    this._isLoading = false;
  }

  private _mapToPickerRoot(item: ProductListItemDto): PickerProductRoot {
    const isDigital = item.isDigitalProduct;
    return {
      id: item.productRootId,
      rootName: item.rootName,
      imageUrl: item.imageUrl,
      variantCount: item.variantCount,
      minPrice: item.minPrice,
      maxPrice: item.maxPrice,
      // Stock is calculated when variants are loaded
      totalStock: 0,
      stockStatus: isDigital ? "Untracked" : "InStock",
      stockStatusLabel: isDigital ? "Digital" : "",
      stockStatusCssClass: isDigital ? "badge-default" : "",
      isDigitalProduct: isDigital,
      isExpanded: false,
      variantsLoaded: false,
      variants: [],
    };
  }

  private async _loadVariantsForRoot(rootId: string): Promise<void> {
    const rootIndex = this._productRoots.findIndex((r) => r.id === rootId);
    if (rootIndex === -1) return;

    const { data, error } = await MerchelloApi.getProductDetail(rootId);
    if (error || !data) {
      return;
    }

    // Cache the product detail for add-on option access
    this._productDetailCache.set(rootId, data);

    // Map variants with eligibility check
    const variants = await Promise.all(
      data.variants.map(async (v) => this._mapToPickerVariant(v, data))
    );

    // Use backend-calculated aggregate stock (single source of truth)
    const totalStock = data.variants.reduce((sum, v) => sum + v.totalStock, 0);
    const stockStatus = data.aggregateStockStatus as PickerProductRoot["stockStatus"];
    const stockStatusLabel = data.aggregateStockStatusLabel ?? "";
    const stockStatusCssClass = data.aggregateStockStatusCssClass ?? "";

    // Update the root with loaded variants and backend-calculated stock status
    this._productRoots = this._productRoots.map((root, i) =>
      i === rootIndex
        ? {
            ...root,
            variants,
            variantsLoaded: true,
            totalStock,
            stockStatus,
            stockStatusLabel,
            stockStatusCssClass,
          }
        : root
    );
  }

  private async _mapToPickerVariant(
    variant: ProductRootDetailDto["variants"][0],
    root: ProductRootDetailDto
  ): Promise<PickerVariant> {
    // Use backend-calculated available stock from the variant DTO (single source of truth)
    const availableStock = variant.totalStock;

    // Check if any warehouse tracks stock
    const trackStock = variant.warehouseStock.some((ws) => ws.trackStock);

    // Get eligibility from backend API - this is the single source of truth
    // Backend consolidates: region eligibility, stock availability, availableForPurchase flag, aggregate stock status
    let canSelect = true;
    let blockedReason: string | null = null;
    let canShipToRegion = true;
    let fulfillingWarehouseId: string | null = null;
    let fulfillingWarehouseName: string | null = null;
    let aggregateStockStatus = variant.stockStatus as PickerVariant["stockStatus"];
    let aggregateStockStatusLabel = variant.stockStatusLabel;
    let aggregateStockStatusCssClass = variant.stockStatusCssClass;

    // In property editor mode, skip warehouse/shipping eligibility checks
    // All variants are selectable for content editing purposes
    if (!this._isPropertyEditorMode) {
      if (this._config?.shippingAddress && !root.isDigitalProduct) {
        // Use centralized backend API to determine fulfillment options with region check
        const fulfillmentResult = await this._getFulfillmentOptions(variant.id);
        canSelect = fulfillmentResult.canAddToOrder;
        blockedReason = fulfillmentResult.blockedReason;
        canShipToRegion = fulfillmentResult.canAddToOrder; // If can add to order, region is valid
        fulfillingWarehouseId = fulfillmentResult.warehouseId;
        fulfillingWarehouseName = fulfillmentResult.warehouseName;
        if (fulfillmentResult.aggregateStockStatusLabel && fulfillmentResult.aggregateStockStatusCssClass) {
          aggregateStockStatus = fulfillmentResult.aggregateStockStatus;
          aggregateStockStatusLabel = fulfillmentResult.aggregateStockStatusLabel;
          aggregateStockStatusCssClass = fulfillmentResult.aggregateStockStatusCssClass;
        }
      } else if (!root.isDigitalProduct && variant.warehouseStock.length > 0) {
        // No address = use backend API to get highest-priority warehouse with stock
        const defaultWarehouse = await this._getDefaultFulfillingWarehouse(variant.id);
        canSelect = defaultWarehouse.canAddToOrder;
        blockedReason = defaultWarehouse.blockedReason;
        fulfillingWarehouseId = defaultWarehouse.warehouseId;
        fulfillingWarehouseName = defaultWarehouse.warehouseName;
        if (defaultWarehouse.aggregateStockStatusLabel && defaultWarehouse.aggregateStockStatusCssClass) {
          aggregateStockStatus = defaultWarehouse.aggregateStockStatus;
          aggregateStockStatusLabel = defaultWarehouse.aggregateStockStatusLabel;
          aggregateStockStatusCssClass = defaultWarehouse.aggregateStockStatusCssClass;
        }
      }
    }

    // Use fulfilling warehouse's stock status if available, otherwise use backend-provided aggregate status
    let stockStatus: PickerVariant["stockStatus"] = aggregateStockStatus as PickerVariant["stockStatus"];
    let stockStatusLabel = aggregateStockStatusLabel;
    let stockStatusCssClass = aggregateStockStatusCssClass;
    if (fulfillingWarehouseId) {
      const fulfilling = variant.warehouseStock.find((ws) => ws.warehouseId === fulfillingWarehouseId);
      if (fulfilling) {
        stockStatus = fulfilling.stockStatus;
        stockStatusLabel = fulfilling.stockStatusLabel;
        stockStatusCssClass = fulfilling.stockStatusCssClass;
      }
    }

    return {
      id: variant.id,
      productRootId: root.id,
      name: variant.name,
      rootName: root.rootName,
      sku: variant.sku,
      price: variant.price,
      imageUrl: getVariantImageUrl(variant, root.rootImages),
      optionValuesDisplay: buildOptionValuesDisplay(variant),
      canSelect,
      blockedReason,
      availableStock,
      stockStatus,
      stockStatusLabel,
      stockStatusCssClass,
      trackStock,
      canShipToRegion,
      regionMessage: blockedReason, // Use blockedReason for any message (region or other)
      fulfillingWarehouseId,
      fulfillingWarehouseName,
      warehouseStock: variant.warehouseStock,
    };
  }

  // ============================================
  // Fulfillment Options (centralized backend API)
  // ============================================

  /**
   * Get fulfillment options for a product variant using the centralized backend API.
   * This is a single API call that determines the best warehouse for fulfillment
   * based on priority, region eligibility, and stock availability.
   */
  private async _getFulfillmentOptions(
    variantId: string
  ): Promise<{
    canAddToOrder: boolean;
    warehouseId: string | null;
    warehouseName: string | null;
    blockedReason: string | null;
    aggregateStockStatus: PickerVariant["stockStatus"];
    aggregateStockStatusLabel: string | null;
    aggregateStockStatusCssClass: string | null;
  }> {
    const address = this._config?.shippingAddress;
    if (!address) {
      return {
        canAddToOrder: true,
        warehouseId: null,
        warehouseName: null,
        blockedReason: null,
        aggregateStockStatus: "InStock",
        aggregateStockStatusLabel: null,
        aggregateStockStatusCssClass: null,
      };
    }

    try {
      const { data, error } = await MerchelloApi.getProductFulfillmentOptions(
        variantId,
        address.countryCode,
        address.regionCode
      );

      if (error) {
        return {
          canAddToOrder: false,
          warehouseId: null,
          warehouseName: null,
          blockedReason: "Unable to check fulfillment",
          aggregateStockStatus: "OutOfStock",
          aggregateStockStatusLabel: null,
          aggregateStockStatusCssClass: null,
        };
      }

      // Use backend-provided values - this is the single source of truth
      // Backend consolidates: region eligibility, stock availability, availableForPurchase flag, aggregate stock status
      return {
        canAddToOrder: data?.canAddToOrder ?? false,
        warehouseId: data?.fulfillingWarehouse?.id ?? null,
        warehouseName: data?.fulfillingWarehouse?.name ?? null,
        blockedReason: data?.blockedReason ?? null,
        aggregateStockStatus: data?.aggregateStockStatus ?? "InStock",
        aggregateStockStatusLabel: data?.aggregateStockStatusLabel ?? null,
        aggregateStockStatusCssClass: data?.aggregateStockStatusCssClass ?? null,
      };
    } catch {
      return {
        canAddToOrder: false,
        warehouseId: null,
        warehouseName: null,
        blockedReason: "Unable to check fulfillment",
        aggregateStockStatus: "OutOfStock",
        aggregateStockStatusLabel: null,
        aggregateStockStatusCssClass: null,
      };
    }
  }

  /**
   * Get the default fulfilling warehouse for a product variant when no shipping address is known.
   * Uses the centralized backend API to select based on warehouse priority and stock availability.
   */
  private async _getDefaultFulfillingWarehouse(
    variantId: string
  ): Promise<{
    canAddToOrder: boolean;
    warehouseId: string | null;
    warehouseName: string | null;
    blockedReason: string | null;
    aggregateStockStatus: PickerVariant["stockStatus"];
    aggregateStockStatusLabel: string | null;
    aggregateStockStatusCssClass: string | null;
  }> {
    try {
      const { data, error } = await MerchelloApi.getDefaultFulfillingWarehouse(variantId);

      if (error) {
        return {
          canAddToOrder: false,
          warehouseId: null,
          warehouseName: null,
          blockedReason: "Unable to check fulfillment",
          aggregateStockStatus: "OutOfStock",
          aggregateStockStatusLabel: null,
          aggregateStockStatusCssClass: null,
        };
      }

      // Use backend-provided values - this is the single source of truth
      return {
        canAddToOrder: data?.canAddToOrder ?? false,
        warehouseId: data?.fulfillingWarehouse?.id ?? null,
        warehouseName: data?.fulfillingWarehouse?.name ?? null,
        blockedReason: data?.blockedReason ?? null,
        aggregateStockStatus: data?.aggregateStockStatus ?? "InStock",
        aggregateStockStatusLabel: data?.aggregateStockStatusLabel ?? null,
        aggregateStockStatusCssClass: data?.aggregateStockStatusCssClass ?? null,
      };
    } catch {
      return {
        canAddToOrder: false,
        warehouseId: null,
        warehouseName: null,
        blockedReason: "Unable to check fulfillment",
        aggregateStockStatus: "OutOfStock",
        aggregateStockStatusLabel: null,
        aggregateStockStatusCssClass: null,
      };
    }
  }

  // ============================================
  // Event Handlers
  // ============================================

  private _handleSearchInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }
    this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = input.value;
      this._page = 1;
      this._loadProducts();
    }, 300);
  }

  private _handleSearchClear(): void {
    this._searchTerm = "";
    this._page = 1;
    this._loadProducts();
  }

  private _handlePageChange(page: number): void {
    this._page = page;
    this._loadProducts();
  }

  private async _handleToggleExpand(rootId: string): Promise<void> {
    const root = this._productRoots.find((r) => r.id === rootId);
    if (!root) return;

    // If not loaded, load variants first
    if (!root.variantsLoaded) {
      await this._loadVariantsForRoot(rootId);
    }

    // Toggle expanded state
    this._productRoots = this._productRoots.map((r) =>
      r.id === rootId ? { ...r, isExpanded: !r.isExpanded } : r
    );
  }

  private _handleRootSelect(root: PickerProductRoot): void {
    // Toggle root selection
    if (this._selectedRoots.has(root.id)) {
      this._selectedRoots.delete(root.id);
    } else {
      // Check if we've reached max items
      if (this._selectedRoots.size >= this._maxItems) {
        // At max - if single-select (max=1), replace selection
        if (this._maxItems === 1) {
          this._selectedRoots.clear();
        } else {
          // Already at max, can't add more
          return;
        }
      }
      this._selectedRoots.set(root.id, root);
    }
    this._selectedRoots = new Map(this._selectedRoots);
  }

  private _handleVariantSelect(variant: PickerVariant): void {
    if (!variant.canSelect) return;

    // Property editor mode - simplified selection (no addons, no shipping)
    if (this._isPropertyEditorMode) {
      // Toggle selection if already selected
      if (this._selections.has(variant.id)) {
        this._selections.delete(variant.id);
        this._selections = new Map(this._selections);
        return;
      }

      // Check if we've reached max items
      if (this._selections.size >= this._maxItems) {
        // At max - if single-select (max=1), replace selection
        if (this._maxItems === 1) {
          this._selections.clear();
        } else {
          // Already at max, can't add more
          return;
        }
      }

      // Add simplified selection (no warehouse/shipping info)
      const selection: ProductPickerSelection = {
        productId: variant.id,
        productRootId: variant.productRootId,
        name: variant.optionValuesDisplay
          ? `${variant.rootName} - ${variant.optionValuesDisplay}`
          : variant.rootName,
        sku: variant.sku,
        price: variant.price,
        imageUrl: variant.imageUrl,
      };

      this._selections.set(variant.id, selection);
      this._selections = new Map(this._selections);
      return;
    }

    // Check if product has add-on options and showAddons is enabled
    if (this._showAddons) {
      const productDetail = this._productDetailCache.get(variant.productRootId);
      if (productDetail) {
        const addonOptions = this._getAddonOptions(productDetail);
        if (addonOptions.length > 0) {
          // Show add-on selection view
          this._pendingAddonSelection = {
            variant,
            addonOptions,
            rootName: variant.rootName,
          };
          this._selectedAddons = new Map();
          // Initialize addon price preview with base price
          this._addonPricePreview = {
            basePrice: variant.price,
            addonsTotal: 0,
            totalPrice: variant.price,
          };
          this._isLoadingAddonPreview = false;
          this._viewState = "addon-selection";
          return;
        }
      }
    }

    // No add-ons or showAddons disabled - go to shipping selection
    this._transitionToShippingSelection(variant, []);
  }

  private _getAddonOptions(productDetail: ProductRootDetailDto): PickerAddonOption[] {
    // Filter to non-variant options only (isVariant === false)
    return productDetail.productOptions
      .filter((opt) => !opt.isVariant && opt.values.length > 0)
      .map((opt) => ({
        id: opt.id,
        name: opt.name ?? "",
        alias: opt.alias,
        optionUiAlias: opt.optionUiAlias,
        values: opt.values.map((v) => ({
          id: v.id,
          name: v.name ?? "",
          priceAdjustment: v.priceAdjustment,
          costAdjustment: v.costAdjustment,
          skuSuffix: v.skuSuffix,
        })),
      }));
  }

  // ============================================
  // Add-on Selection Handlers
  // ============================================

  private _handleAddonSelect(optionId: string, optionName: string, value: PickerAddonOption["values"][0]): void {
    const addon: SelectedAddon = {
      optionId,
      optionName,
      valueId: value.id,
      valueName: value.name,
      priceAdjustment: value.priceAdjustment,
      costAdjustment: value.costAdjustment,
      skuSuffix: value.skuSuffix,
    };
    this._selectedAddons.set(optionId, addon);
    this._selectedAddons = new Map(this._selectedAddons);
    this._fetchAddonPricePreviewDebounced();
  }

  private _handleAddonClear(optionId: string): void {
    this._selectedAddons.delete(optionId);
    this._selectedAddons = new Map(this._selectedAddons);
    this._fetchAddonPricePreviewDebounced();
  }

  /**
   * Fetch addon price preview from backend API with debouncing.
   * This is the single source of truth for addon pricing calculations.
   */
  private _fetchAddonPricePreviewDebounced(): void {
    if (this._addonPreviewDebounceTimer) {
      clearTimeout(this._addonPreviewDebounceTimer);
    }
    this._addonPreviewDebounceTimer = setTimeout(() => {
      void this._fetchAddonPricePreview();
    }, 150);
  }

  private async _fetchAddonPricePreview(): Promise<void> {
    const pending = this._pendingAddonSelection;
    if (!pending) return;

    // Clear any previous error
    this._addonPreviewError = null;

    // If no addons selected, just use the base price
    if (this._selectedAddons.size === 0) {
      this._addonPricePreview = {
        basePrice: pending.variant.price,
        addonsTotal: 0,
        totalPrice: pending.variant.price,
      };
      this._isLoadingAddonPreview = false;
      return;
    }

    this._isLoadingAddonPreview = true;

    const request = {
      selectedAddons: Array.from(this._selectedAddons.values()).map((addon) => ({
        optionId: addon.optionId,
        valueId: addon.valueId,
      })),
    };

    const { data, error } = await MerchelloApi.previewAddonPrice(pending.variant.id, request);

    // Guard against race condition - user may have navigated away during API call
    if (!this._pendingAddonSelection) {
      return;
    }

    if (error) {
      // Do NOT fall back to local calculation - show error state instead
      // Backend is single source of truth for pricing
      this._addonPricePreview = null;
      this._addonPreviewError = "Unable to calculate price. Please try again.";
    } else if (data) {
      this._addonPricePreview = {
        basePrice: data.basePrice,
        addonsTotal: data.addonsTotal,
        totalPrice: data.totalPrice,
      };
    }

    this._isLoadingAddonPreview = false;
  }

  private _handleBackToProducts(): void {
    this._viewState = "product-selection";
    this._pendingAddonSelection = null;
    this._selectedAddons = new Map();
    this._addonPricePreview = null;
    this._isLoadingAddonPreview = false;
    this._addonPreviewError = null;
  }

  private _handleSkipAddons(): void {
    if (!this._pendingAddonSelection) return;

    // Transition to shipping selection with no add-ons
    this._transitionToShippingSelection(this._pendingAddonSelection.variant, []);
    this._pendingAddonSelection = null;
    this._selectedAddons = new Map();
  }

  private _handleConfirmWithAddons(): void {
    if (!this._pendingAddonSelection) return;

    const addons = Array.from(this._selectedAddons.values());
    // Transition to shipping selection with selected add-ons
    this._transitionToShippingSelection(this._pendingAddonSelection.variant, addons);
    this._pendingAddonSelection = null;
    this._selectedAddons = new Map();
  }

  // ============================================
  // Shipping Selection Handlers
  // ============================================

  private async _transitionToShippingSelection(variant: PickerVariant, addons: SelectedAddon[]): Promise<void> {
    const warehouseId = variant.fulfillingWarehouseId;
    const warehouseName = variant.fulfillingWarehouseName;

    if (!warehouseId || !warehouseName) {
      // No warehouse - this shouldn't happen for selectable variants
      return;
    }

    // Use backend-calculated total price, falling back to base price if no addons were selected
    const totalPrice = this._addonPricePreview?.totalPrice ?? variant.price;

    // Set up pending shipping selection with loading state
    this._pendingShippingSelection = {
      variant,
      addons,
      totalPrice,
      warehouseId,
      warehouseName,
      isLoadingOptions: true,
      shippingOptions: [],
    };
    this._selectedShippingOptionId = null;
    this._viewState = "shipping-selection";

    // Load shipping options from API
    const address = this._config?.shippingAddress;
    if (!address) {
      // No shipping address - shouldn't happen in order editing context
      if (this._pendingShippingSelection) {
        this._pendingShippingSelection = {
          ...this._pendingShippingSelection,
          isLoadingOptions: false,
        };
      }
      return;
    }

    const { data, error } = await MerchelloApi.getShippingOptionsForWarehouse(
      warehouseId,
      address.countryCode,
      address.regionCode
    );

    // Guard against race condition - user may have navigated away during API call
    if (!this._pendingShippingSelection) {
      return;
    }

    if (error || !data) {
      this._pendingShippingSelection = {
        ...this._pendingShippingSelection,
        isLoadingOptions: false,
      };
      return;
    }

    // Map API response to picker format
    const shippingOptions: ShippingOptionForPicker[] = data.availableOptions.map((opt) => ({
      id: opt.id,
      name: opt.name,
      deliveryTimeDescription: opt.deliveryTimeDescription,
      estimatedCost: opt.estimatedCost ?? null,
      isEstimate: opt.isEstimate,
      isNextDay: opt.isNextDay,
    }));

    this._pendingShippingSelection = {
      ...this._pendingShippingSelection,
      isLoadingOptions: false,
      shippingOptions,
    };

    // Auto-select first option if only one available
    if (shippingOptions.length === 1) {
      this._selectedShippingOptionId = shippingOptions[0].id;
    }
  }

  private _handleShippingOptionSelect(optionId: string): void {
    this._selectedShippingOptionId = optionId;
  }

  private _handleBackFromShipping(): void {
    // If we came from add-ons, we'd need to go back there - but for simplicity just go to product list
    this._viewState = "product-selection";
    this._pendingShippingSelection = null;
    this._selectedShippingOptionId = null;
  }

  private _handleConfirmWithShipping(): void {
    if (!this._pendingShippingSelection || !this._selectedShippingOptionId) return;

    const selectedOption = this._pendingShippingSelection.shippingOptions.find(
      (opt) => opt.id === this._selectedShippingOptionId
    );
    if (!selectedOption) return;

    const { variant, addons, warehouseId, warehouseName } = this._pendingShippingSelection;

    // Add selection with shipping info
    const selection: ProductPickerSelection = {
      productId: variant.id,
      productRootId: variant.productRootId,
      name: variant.optionValuesDisplay
        ? `${variant.rootName} - ${variant.optionValuesDisplay}`
        : variant.rootName,
      sku: variant.sku,
      price: variant.price,
      imageUrl: variant.imageUrl,
      warehouseId,
      warehouseName,
      selectedAddons: addons.length > 0 ? addons : undefined,
      shippingOptionId: selectedOption.id,
      shippingOptionName: selectedOption.name,
    };

    this._selections.set(variant.id, selection);
    this._selections = new Map(this._selections);

    // Reset and return to product list
    this._viewState = "product-selection";
    this._pendingShippingSelection = null;
    this._selectedShippingOptionId = null;
  }

  private _handleAdd(): void {
    // In selectRoots mode, convert root selections to ProductPickerSelection format
    if (this._selectRoots) {
      const selections: ProductPickerSelection[] = Array.from(this._selectedRoots.values()).map((root) => ({
        productId: root.id, // Use root ID as productId for compatibility
        productRootId: root.id,
        name: root.rootName,
        sku: null, // Roots don't have SKUs
        price: root.minPrice ?? 0,
        imageUrl: root.imageUrl,
      }));
      this.value = { selections };
      this.modalContext?.submit();
      return;
    }

    // Normal mode: return variant selections
    this.value = {
      selections: Array.from(this._selections.values()),
    };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  // ============================================
  // Render Methods
  // ============================================

  private _renderSearch() {
    return html`
      <div class="search-container">
        <uui-input
          type="text"
          placeholder="Search by name or SKU..."
          .value=${this._searchTerm}
          @input=${this._handleSearchInput}
          label="Search products"
        >
          <uui-icon name="icon-search" slot="prepend"></uui-icon>
          ${this._searchTerm
            ? html`
                <uui-button slot="append" compact look="secondary" label="Clear" @click=${this._handleSearchClear}>
                  <uui-icon name="icon-wrong"></uui-icon>
                </uui-button>
              `
            : nothing}
        </uui-input>
      </div>
    `;
  }

  private _renderContent() {
    if (this._isLoading) {
      return html`<div class="loading"><uui-loader></uui-loader></div>`;
    }

    if (this._errorMessage) {
      return html`<div class="error">${this._errorMessage}</div>`;
    }

    if (this._productRoots.length === 0) {
      return html`
        <div class="empty">
          <uui-icon name="icon-box"></uui-icon>
          <p>No products found</p>
        </div>
      `;
    }

    return html`
      <merchello-product-picker-list
        .productRoots=${this._productRoots}
        .selectedIds=${Array.from(this._selections.keys())}
        .selectedRootIds=${Array.from(this._selectedRoots.keys())}
        .currencySymbol=${this._currencySymbol}
        .showImages=${this._showImages}
        .selectRoots=${this._selectRoots}
        @toggle-expand=${(e: CustomEvent<{ rootId: string }>) => this._handleToggleExpand(e.detail.rootId)}
        @variant-select=${(e: CustomEvent<{ variant: PickerVariant }>) => this._handleVariantSelect(e.detail.variant)}
        @root-select=${(e: CustomEvent<{ root: PickerProductRoot }>) => this._handleRootSelect(e.detail.root)}
      ></merchello-product-picker-list>
      ${this._renderPagination()}
    `;
  }

  private _renderPagination() {
    if (this._totalPages <= 1) return nothing;

    return html`
      <div class="pagination">
        <uui-button
          look="secondary"
          ?disabled=${this._page <= 1}
          @click=${() => this._handlePageChange(this._page - 1)}
        >
          Previous
        </uui-button>
        <span class="page-info">Page ${this._page} of ${this._totalPages}</span>
        <uui-button
          look="secondary"
          ?disabled=${this._page >= this._totalPages}
          @click=${() => this._handlePageChange(this._page + 1)}
        >
          Next
        </uui-button>
      </div>
    `;
  }

  private _renderSelectionSummary() {
    const count = this._selectRoots ? this._selectedRoots.size : this._selections.size;
    if (count === 0) {
      return html`<span class="selection-count">No products selected</span>`;
    }
    return html`<span class="selection-count">${count} product${count === 1 ? "" : "s"} selected</span>`;
  }

  // ============================================
  // Add-on Selection View
  // ============================================

  private _renderAddonSelectionView() {
    const pending = this._pendingAddonSelection;
    if (!pending) return nothing;

    const variant = pending.variant;
    const variantName = variant.optionValuesDisplay
      ? `${variant.rootName} - ${variant.optionValuesDisplay}`
      : variant.rootName;

    // Use backend-calculated addon pricing (single source of truth)
    const preview = this._addonPricePreview;
    const hasPreviewError = this._addonPreviewError !== null;
    const basePrice = preview?.basePrice ?? variant.price;
    const addonsTotal = preview?.addonsTotal ?? 0;
    const totalPrice = preview?.totalPrice ?? variant.price;

    // Disable continue if preview failed (backend is source of truth for pricing)
    const canContinue = !hasPreviewError && !this._isLoadingAddonPreview;

    return html`
      <umb-body-layout headline="Select Add-ons (Optional)">
        <div id="main">
          ${hasPreviewError
            ? html`
                <div class="addon-error">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._addonPreviewError}</span>
                  <uui-button
                    look="secondary"
                    compact
                    @click=${() => this._fetchAddonPricePreview()}
                  >
                    Retry
                  </uui-button>
                </div>
              `
            : nothing}

          <div class="addon-product-summary">
            <div class="product-info">
              <strong>${variantName}</strong>
              ${variant.sku ? html`<span class="sku">${variant.sku}</span>` : nothing}
            </div>
            <div class="product-pricing ${this._isLoadingAddonPreview ? "loading" : ""} ${hasPreviewError ? "error" : ""}">
              <span class="base-price">${formatPrice(basePrice, this._currencySymbol)}</span>
              ${!hasPreviewError && addonsTotal !== 0
                ? html`
                    <span class="addon-total">
                      ${addonsTotal > 0 ? "+" : ""}${formatPrice(addonsTotal, this._currencySymbol)}
                    </span>
                    <span class="total-price">= ${formatPrice(totalPrice, this._currencySymbol)}</span>
                  `
                : nothing}
              ${this._isLoadingAddonPreview ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
            </div>
          </div>

          <div class="addon-options">
            ${pending.addonOptions.map((option) => this._renderAddonOption(option))}
          </div>
        </div>

        <div slot="actions">
          <uui-button look="secondary" label="Back" @click=${this._handleBackToProducts}>
            <uui-icon name="icon-arrow-left"></uui-icon>
            Back
          </uui-button>
          <uui-button look="secondary" label="Skip Add-ons" @click=${this._handleSkipAddons}>
            Skip Add-ons
          </uui-button>
          <uui-button
            look="primary"
            color="positive"
            label="Continue"
            ?disabled=${!canContinue}
            @click=${this._handleConfirmWithAddons}
          >
            Continue
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  private _renderAddonOption(option: PickerAddonOption) {
    const selectedAddon = this._selectedAddons.get(option.id);

    return html`
      <div class="addon-option">
        <div class="addon-option-header">
          <span class="addon-option-name">${option.name}</span>
          <span class="addon-optional">(optional)</span>
          ${selectedAddon
            ? html`
                <uui-button compact look="secondary" label="Clear" @click=${() => this._handleAddonClear(option.id)}>
                  Clear
                </uui-button>
              `
            : nothing}
        </div>
        <div class="addon-values">
          ${option.values.map((value) => this._renderAddonValue(option, value, selectedAddon?.valueId === value.id))}
        </div>
      </div>
    `;
  }

  private _renderAddonValue(option: PickerAddonOption, value: PickerAddonOption["values"][0], isSelected: boolean) {
    return html`
      <button
        type="button"
        class="addon-value-button ${isSelected ? "selected" : ""}"
        @click=${() => this._handleAddonSelect(option.id, option.name, value)}
      >
        <span class="value-name">${value.name}</span>
        ${value.priceAdjustment !== 0
          ? html`
              <span class="value-price ${value.priceAdjustment > 0 ? "positive" : "negative"}">
                ${value.priceAdjustment > 0 ? "+" : ""}${formatPrice(value.priceAdjustment, this._currencySymbol)}
              </span>
            `
          : nothing}
      </button>
    `;
  }

  // ============================================
  // Shipping Selection View
  // ============================================

  private _renderShippingSelectionView() {
    const pending = this._pendingShippingSelection;
    if (!pending) return nothing;

    const variant = pending.variant;
    const variantName = variant.optionValuesDisplay
      ? `${variant.rootName} - ${variant.optionValuesDisplay}`
      : variant.rootName;

    // Use backend-calculated total price (stored when transitioning from addon selection)
    const totalPrice = pending.totalPrice;

    return html`
      <umb-body-layout headline="Select Shipping">
        <div id="main">
          <div class="shipping-product-summary">
            <div class="product-info">
              <strong>${variantName}</strong>
              ${variant.sku ? html`<span class="sku">${variant.sku}</span>` : nothing}
              <div class="warehouse-info">
                <uui-icon name="icon-home"></uui-icon>
                ${pending.warehouseName}
              </div>
            </div>
            <div class="product-pricing">
              <span class="total-price">${formatPrice(totalPrice, this._currencySymbol)}</span>
            </div>
          </div>

          ${pending.isLoadingOptions
            ? html`<div class="loading"><uui-loader></uui-loader></div>`
            : pending.shippingOptions.length === 0
              ? html`<div class="no-options">No shipping options available for this destination.</div>`
              : html`
                  <div class="shipping-options">
                    ${pending.shippingOptions.map((option) => this._renderShippingOption(option))}
                  </div>
                `}
        </div>

        <div slot="actions">
          <uui-button look="secondary" label="Back" @click=${this._handleBackFromShipping}>
            <uui-icon name="icon-arrow-left"></uui-icon>
            Back
          </uui-button>
          <uui-button
            look="primary"
            color="positive"
            label="Add to Order"
            ?disabled=${!this._selectedShippingOptionId || pending.isLoadingOptions}
            @click=${this._handleConfirmWithShipping}
          >
            Add to Order
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  private _renderShippingOption(option: ShippingOptionForPicker) {
    const isSelected = this._selectedShippingOptionId === option.id;

    return html`
      <button
        type="button"
        class="shipping-option-button ${isSelected ? "selected" : ""}"
        @click=${() => this._handleShippingOptionSelect(option.id)}
      >
        <div class="shipping-option-info">
          <span class="shipping-option-name">${option.name}</span>
          <span class="shipping-option-delivery">${option.deliveryTimeDescription}</span>
        </div>
        <div class="shipping-option-cost">
          ${option.estimatedCost !== null
            ? html`
                <span class="cost">${formatPrice(option.estimatedCost, this._currencySymbol)}</span>
                ${option.isEstimate ? html`<span class="estimate-label">est.</span>` : nothing}
              `
            : html`<span class="cost-at-checkout">Calculated at checkout</span>`}
        </div>
      </button>
    `;
  }

  // ============================================
  // Main Render
  // ============================================

  override render() {
    // Switch between views
    if (this._viewState === "addon-selection") {
      return this._renderAddonSelectionView();
    }
    if (this._viewState === "shipping-selection") {
      return this._renderShippingSelectionView();
    }

    return html`
      <umb-body-layout headline="Select Products">
        <div id="main">
          ${this._renderSearch()}
          <div class="product-list-container">
            ${this._renderContent()}
          </div>
        </div>

        <div slot="actions">
          ${this._renderSelectionSummary()}
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            label="Add Selected"
            look="primary"
            color="positive"
            ?disabled=${this._selectRoots ? this._selectedRoots.size === 0 : this._selections.size === 0}
            @click=${this._handleAdd}
          >
            Add Selected (${this._selectRoots ? this._selectedRoots.size : this._selections.size})
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override styles = css`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      height: 100%;
    }

    .search-container {
      flex-shrink: 0;
    }

    .search-container uui-input {
      width: 100%;
    }

    .search-container uui-icon[slot="prepend"] {
      color: var(--uui-color-text-alt);
    }

    .product-list-container {
      flex: 1;
      overflow: auto;
      min-height: 200px;
    }

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: var(--uui-size-space-6);
    }

    .error {
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-space-6);
      color: var(--uui-color-text-alt);
    }

    .empty uui-icon {
      font-size: 3rem;
      margin-bottom: var(--uui-size-space-3);
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
    }

    .page-info {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: center;
    }

    .selection-count {
      flex: 1;
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    /* Add-on Selection View Styles */
    .addon-product-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    .addon-product-summary .product-info {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .addon-product-summary .sku {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .addon-product-summary .product-pricing {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-size: 0.875rem;
    }

    .addon-product-summary .base-price {
      font-weight: 600;
    }

    .addon-product-summary .addon-total {
      color: var(--uui-color-positive);
    }

    .addon-product-summary .total-price {
      font-weight: 700;
      color: var(--uui-color-current);
    }

    .addon-product-summary .product-pricing.loading {
      opacity: 0.6;
    }

    .addon-product-summary .product-pricing.error {
      opacity: 0.5;
    }

    .addon-error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    .addon-error uui-icon {
      flex-shrink: 0;
    }

    .addon-error span {
      flex: 1;
    }

    .addon-product-summary .product-pricing uui-loader-circle {
      font-size: 0.75rem;
    }

    .addon-options {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .addon-option {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .addon-option-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .addon-option-name {
      font-weight: 600;
    }

    .addon-optional {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .addon-values {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
    }

    .addon-value-button {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--uui-size-space-1);
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 2px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      cursor: pointer;
      transition: all 0.15s ease;
      min-width: 100px;
    }

    .addon-value-button:hover {
      border-color: var(--uui-color-selected);
      background: var(--uui-color-surface-emphasis);
    }

    .addon-value-button.selected {
      border-color: var(--uui-color-positive);
      background: var(--uui-color-positive-surface);
    }

    .addon-value-button .value-name {
      font-weight: 500;
    }

    .addon-value-button .value-price {
      font-size: 0.75rem;
      font-weight: 600;
    }

    .addon-value-button .value-price.positive {
      color: var(--uui-color-positive);
    }

    .addon-value-button .value-price.negative {
      color: var(--uui-color-danger);
    }

    /* Shipping Selection View Styles */
    .shipping-product-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    .shipping-product-summary .product-info {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .shipping-product-summary .sku {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .shipping-product-summary .warehouse-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      margin-top: var(--uui-size-space-1);
    }

    .shipping-product-summary .warehouse-info uui-icon {
      font-size: 0.875rem;
    }

    .shipping-product-summary .product-pricing .total-price {
      font-weight: 700;
      font-size: 1rem;
    }

    .shipping-options {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .shipping-option-button {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 2px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      cursor: pointer;
      transition: all 0.15s ease;
      width: 100%;
      text-align: left;
    }

    .shipping-option-button:hover {
      border-color: var(--uui-color-selected);
      background: var(--uui-color-surface-emphasis);
    }

    .shipping-option-button.selected {
      border-color: var(--uui-color-positive);
      background: var(--uui-color-positive-surface);
    }

    .shipping-option-info {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .shipping-option-name {
      font-weight: 600;
    }

    .shipping-option-delivery {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .shipping-option-cost {
      display: flex;
      align-items: baseline;
      gap: var(--uui-size-space-1);
    }

    .shipping-option-cost .cost {
      font-weight: 700;
      font-size: 1rem;
    }

    .shipping-option-cost .estimate-label {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .shipping-option-cost .cost-at-checkout {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    .no-options {
      padding: var(--uui-size-space-4);
      text-align: center;
      color: var(--uui-color-text-alt);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }
  `;
}

export default MerchelloProductPickerModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-picker-modal": MerchelloProductPickerModalElement;
  }
}
