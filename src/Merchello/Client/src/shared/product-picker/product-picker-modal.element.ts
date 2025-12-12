import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { ProductPickerModalData, ProductPickerModalValue } from "./product-picker-modal.token.js";
import type {
  ProductPickerSelection,
  PickerProductRoot,
  PickerVariant,
  WarehouseRegionCache,
} from "./product-picker.types.js";
import type { ProductListItemDto, ProductListParams, ProductRootDetailDto } from "@products/types/product.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { getVariantImageUrl, buildOptionValuesDisplay } from "./product-picker.types.js";
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

  // Region validation cache
  private _regionCache: WarehouseRegionCache = {
    destinations: new Map(),
    regions: new Map(),
  };

  private _searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this._loadProducts();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
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
    if (this._config?.categoryId) {
      params.categoryId = this._config.categoryId;
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
    return {
      id: item.productRootId,
      rootName: item.rootName,
      imageUrl: item.imageUrl,
      variantCount: item.variantCount,
      minPrice: item.minPrice,
      maxPrice: item.maxPrice,
      totalStock: item.totalStock,
      isDigitalProduct: item.isDigitalProduct,
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
      console.error("Failed to load product variants:", error);
      return;
    }

    // Map variants with eligibility check
    const variants = await Promise.all(
      data.variants.map(async (v) => this._mapToPickerVariant(v, data))
    );

    // Update the root with loaded variants
    this._productRoots = this._productRoots.map((root, i) =>
      i === rootIndex
        ? { ...root, variants, variantsLoaded: true }
        : root
    );
  }

  private async _mapToPickerVariant(
    variant: ProductRootDetailDto["variants"][0],
    root: ProductRootDetailDto
  ): Promise<PickerVariant> {
    // Calculate available stock
    const availableStock = variant.warehouseStock.reduce((sum, ws) => {
      if (!ws.trackStock) return sum + 999999; // Treat as unlimited
      return sum + Math.max(0, ws.stock);
    }, 0);

    // Check if any warehouse tracks stock
    const trackStock = variant.warehouseStock.some((ws) => ws.trackStock);

    // Region validation
    let canShipToRegion = true;
    let regionMessage: string | null = null;
    let fulfillingWarehouseId: string | null = null;
    let fulfillingWarehouseName: string | null = null;

    if (this._config?.shippingAddress && !root.isDigitalProduct) {
      const regionResult = await this._checkRegionEligibility(variant.warehouseStock);
      canShipToRegion = regionResult.canShip;
      regionMessage = regionResult.message;
      fulfillingWarehouseId = regionResult.warehouseId;
      fulfillingWarehouseName = regionResult.warehouseName;
    } else if (variant.warehouseStock.length > 0) {
      // No address = use first warehouse with stock
      const firstWithStock = variant.warehouseStock.find((ws) => !ws.trackStock || ws.stock > 0);
      if (firstWithStock) {
        fulfillingWarehouseId = firstWithStock.warehouseId;
        fulfillingWarehouseName = firstWithStock.warehouseName;
      }
    }

    // Determine if can select
    let canSelect = true;
    let blockedReason: string | null = null;

    // Check stock
    if (trackStock && availableStock <= 0) {
      canSelect = false;
      blockedReason = "Out of stock";
    }

    // Check region
    if (canSelect && !canShipToRegion) {
      canSelect = false;
      blockedReason = "Cannot ship to region";
    }

    // Check availability
    if (canSelect && !variant.availableForPurchase) {
      canSelect = false;
      blockedReason = "Not available for purchase";
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
      trackStock,
      canShipToRegion,
      regionMessage,
      fulfillingWarehouseId,
      fulfillingWarehouseName,
      warehouseStock: variant.warehouseStock,
    };
  }

  // ============================================
  // Region Validation
  // ============================================

  private async _checkRegionEligibility(
    warehouseStock: { warehouseId: string; warehouseName: string | null; stock: number; trackStock: boolean }[]
  ): Promise<{ canShip: boolean; warehouseId: string | null; warehouseName: string | null; message: string | null }> {
    const address = this._config?.shippingAddress;
    if (!address) {
      return { canShip: true, warehouseId: null, warehouseName: null, message: null };
    }

    // Check each warehouse that has stock
    for (const ws of warehouseStock) {
      // Skip warehouses with no stock (if tracking)
      if (ws.trackStock && ws.stock <= 0) continue;

      const canServe = await this._canWarehouseServeRegion(ws.warehouseId, address.countryCode, address.stateCode);
      if (canServe) {
        return { canShip: true, warehouseId: ws.warehouseId, warehouseName: ws.warehouseName, message: null };
      }
    }

    return {
      canShip: false,
      warehouseId: null,
      warehouseName: null,
      message: `Cannot ship to ${address.countryCode}`,
    };
  }

  private async _canWarehouseServeRegion(
    warehouseId: string,
    countryCode: string,
    stateCode?: string
  ): Promise<boolean> {
    // Check cache first
    if (!this._regionCache.destinations.has(warehouseId)) {
      // Load destinations for this warehouse
      const { data } = await MerchelloApi.getAvailableDestinationsForWarehouse(warehouseId);
      if (data) {
        this._regionCache.destinations.set(warehouseId, new Set(data.map((d) => d.code)));
      } else {
        this._regionCache.destinations.set(warehouseId, new Set());
      }
    }

    const destinations = this._regionCache.destinations.get(warehouseId)!;

    // Check country
    if (!destinations.has(countryCode)) {
      return false;
    }

    // If no state specified, country match is enough
    if (!stateCode) {
      return true;
    }

    // Check state/region
    const regionCacheKey = `${warehouseId}:${countryCode}`;
    if (!this._regionCache.regions.has(regionCacheKey)) {
      const { data } = await MerchelloApi.getAvailableRegionsForWarehouse(warehouseId, countryCode);
      if (data && data.length > 0) {
        this._regionCache.regions.set(regionCacheKey, new Set(data.map((r) => r.regionCode)));
      } else {
        // Empty regions = all regions allowed
        this._regionCache.regions.set(regionCacheKey, null);
      }
    }

    const regions = this._regionCache.regions.get(regionCacheKey);

    // null or undefined means all regions allowed
    if (regions === null || regions === undefined) {
      return true;
    }

    return regions.has(stateCode);
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

  private _handleVariantSelect(variant: PickerVariant): void {
    if (!variant.canSelect) return;

    const selection: ProductPickerSelection = {
      productId: variant.id,
      productRootId: variant.productRootId,
      name: variant.optionValuesDisplay
        ? `${variant.rootName} - ${variant.optionValuesDisplay}`
        : variant.rootName,
      sku: variant.sku,
      price: variant.price,
      imageUrl: variant.imageUrl,
      warehouseId: variant.fulfillingWarehouseId ?? "",
      warehouseName: variant.fulfillingWarehouseName ?? "",
    };

    // Toggle selection
    if (this._selections.has(variant.id)) {
      this._selections.delete(variant.id);
    } else {
      this._selections.set(variant.id, selection);
    }

    // Trigger reactivity
    this._selections = new Map(this._selections);
  }

  private _handleAdd(): void {
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
        .currencySymbol=${this._currencySymbol}
        @toggle-expand=${(e: CustomEvent<{ rootId: string }>) => this._handleToggleExpand(e.detail.rootId)}
        @variant-select=${(e: CustomEvent<{ variant: PickerVariant }>) => this._handleVariantSelect(e.detail.variant)}
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
    const count = this._selections.size;
    if (count === 0) {
      return html`<span class="selection-count">No products selected</span>`;
    }
    return html`<span class="selection-count">${count} product${count === 1 ? "" : "s"} selected</span>`;
  }

  override render() {
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
            ?disabled=${this._selections.size === 0}
            @click=${this._handleAdd}
          >
            Add Selected (${this._selections.size})
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
  `;
}

export default MerchelloProductPickerModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-picker-modal": MerchelloProductPickerModalElement;
  }
}
