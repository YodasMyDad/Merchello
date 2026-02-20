import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type {
  ProductListItemDto,
  ProductListParams,
  ProductTypeDto,
  ProductCollectionDto,
  ProductColumnKey,
} from "@products/types/product.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { getStoreSettings } from "@api/store-settings.js";
import type { PaginationState, PageChangeEventDetail } from "@shared/types/pagination.types.js";
import type { SelectOption } from "@shared/types/index.js";
import { MERCHELLO_CREATE_PRODUCT_MODAL } from "@products/modals/create-product-modal.token.js";
import { navigateToProductDetail } from "@shared/utils/navigation.js";
import "@shared/components/pagination.element.js";
import "@shared/components/merchello-empty-state.element.js";
import "@products/components/product-table.element.js";
import { collectionLayoutStyles } from "@shared/styles/collection-layout.styles.js";
import type {
  ProductClickEventDetail,
  ProductSelectionChangeEventDetail,
} from "@products/components/product-table.element.js";

@customElement("merchello-products-list")
export class MerchelloProductsListElement extends UmbElementMixin(LitElement) {
  @state() private _products: ProductListItemDto[] = [];
  @state() private _isLoading = true;
  @state() private _isDeleting = false;
  @state() private _errorMessage: string | null = null;
  @state() private _page: number = 1;
  @state() private _pageSize: number = 50;
  @state() private _totalItems: number = 0;
  @state() private _totalPages: number = 0;
  @state() private _selectedProducts: Set<string> = new Set();
  @state() private _searchTerm: string = "";
  @state() private _productTypeId: string = "";
  @state() private _collectionId: string = "";
  @state() private _availability: string = "all";
  @state() private _stockStatus: string = "all";
  @state() private _productTypes: ProductTypeDto[] = [];
  @state() private _collections: ProductCollectionDto[] = [];

  private _searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;
  #isConnected = false;

  constructor() {
    super();
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
    this._initializeAndLoad();
  }

  private async _initializeAndLoad(): Promise<void> {
    const settings = await getStoreSettings();
    if (!this.#isConnected) return;
    this._pageSize = settings.defaultPaginationPageSize;
    this._loadFilterOptions();
    this._loadProducts();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }
  }

  private async _loadFilterOptions(): Promise<void> {
    const [typesResult, collectionsResult] = await Promise.all([
      MerchelloApi.getProductTypes(),
      MerchelloApi.getProductCollections(),
    ]);

    if (!this.#isConnected) return;
    if (typesResult.data) this._productTypes = typesResult.data;
    if (collectionsResult.data) this._collections = collectionsResult.data;
  }

  private async _loadProducts(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const params: ProductListParams = {
      page: this._page,
      pageSize: this._pageSize,
      sortBy: "name",
      sortDir: "asc",
    };

    if (this._searchTerm.trim()) params.search = this._searchTerm.trim();
    if (this._productTypeId) params.productTypeId = this._productTypeId;
    if (this._collectionId) params.collectionId = this._collectionId;
    if (this._availability !== "all") params.availability = this._availability as ProductListParams["availability"];
    if (this._stockStatus !== "all") params.stockStatus = this._stockStatus as ProductListParams["stockStatus"];

    const { data, error } = await MerchelloApi.getProducts(params);

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    if (data) {
      this._products = data.items;
      this._totalItems = data.totalItems;
      this._totalPages = data.totalPages;
      const visibleIds = new Set(data.items.map((item) => item.id));
      this._selectedProducts = new Set(
        Array.from(this._selectedProducts).filter((id) => visibleIds.has(id)),
      );
    }

    this._isLoading = false;
  }

  private _handleSearchInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (this._searchDebounceTimer) clearTimeout(this._searchDebounceTimer);
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

  private _handleProductTypeChange(e: Event): void {
    this._productTypeId = (e.target as HTMLSelectElement).value;
    this._page = 1;
    this._loadProducts();
  }

  private _handleCollectionChange(e: Event): void {
    this._collectionId = (e.target as HTMLSelectElement).value;
    this._page = 1;
    this._loadProducts();
  }

  private _handleAvailabilityChange(e: Event): void {
    this._availability = (e.target as HTMLSelectElement).value;
    this._page = 1;
    this._loadProducts();
  }

  private _handleStockStatusChange(e: Event): void {
    this._stockStatus = (e.target as HTMLSelectElement).value;
    this._page = 1;
    this._loadProducts();
  }

  private _handlePageChange(e: CustomEvent<PageChangeEventDetail>): void {
    this._page = e.detail.page;
    this._loadProducts();
  }

  private _getPaginationState(): PaginationState {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages,
    };
  }

  private _handleSelectionChange(e: CustomEvent<ProductSelectionChangeEventDetail>): void {
    this._selectedProducts = new Set(e.detail.selectedIds);
    this.requestUpdate();
  }

  private _handleProductClick(e: CustomEvent<ProductClickEventDetail>): void {
    const productRootId = e.detail.product.productRootId || e.detail.productId;
    if (!productRootId) return;
    navigateToProductDetail(productRootId);
  }

  private _hasActiveFilters(): boolean {
    return !!(
      this._searchTerm.trim() ||
      this._productTypeId ||
      this._collectionId ||
      this._availability !== "all" ||
      this._stockStatus !== "all"
    );
  }

  private _handleResetFilters(): void {
    this._searchTerm = "";
    this._productTypeId = "";
    this._collectionId = "";
    this._availability = "all";
    this._stockStatus = "all";
    this._page = 1;
    this._selectedProducts = new Set();
    this._loadProducts();
  }

  private async _handleDeleteSelected(): Promise<void> {
    const count = this._selectedProducts.size;
    if (count === 0) return;

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Products",
        content: `Delete ${count} product${count === 1 ? "" : "s"}? This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return;
    }
    if (!this.#isConnected) return;

    this._isDeleting = true;

    const selectedIds = Array.from(this._selectedProducts);
    const selectedProductsById = new Map(this._products.map((product) => [product.id, product]));
    const productRootIds = selectedIds.map((id) => selectedProductsById.get(id)?.productRootId ?? id);

    let successCount = 0;
    let errorCount = 0;

    for (const productRootId of productRootIds) {
      const { error } = await MerchelloApi.deleteProduct(productRootId);
      if (!this.#isConnected) return;
      if (error) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    this._isDeleting = false;

    if (errorCount === count) {
      this.#notificationContext?.peek("danger", {
        data: {
          headline: "Failed to delete products",
          message: "No selected products could be deleted.",
        },
      });
      return;
    }

    if (errorCount > 0) {
      this.#notificationContext?.peek("warning", {
        data: {
          headline: "Partial success",
          message: `Deleted ${successCount} of ${count} selected products.`,
        },
      });
    } else {
      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Products deleted",
          message: `${count} product${count === 1 ? "" : "s"} deleted successfully.`,
        },
      });
    }

    this._selectedProducts = new Set();
    await this._loadProducts();
  }

  private async _handleAddProduct(): Promise<void> {
    const modal = this.#modalManager?.open(this, MERCHELLO_CREATE_PRODUCT_MODAL, {
      data: {},
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (result?.isCreated && result.productId) {
      navigateToProductDetail(result.productId);
    }
  }

  private _tableColumns: ProductColumnKey[] = ["select", "warnings", "rootName", "sku", "price", "purchaseable", "variants"];

  private _getProductTypeOptions(): SelectOption[] {
    return [
      { name: "All Types", value: "", selected: this._productTypeId === "" },
      ...this._productTypes.map((t) => ({ name: t.name, value: t.id, selected: this._productTypeId === t.id })),
    ];
  }

  private _getCollectionOptions(): SelectOption[] {
    return [
      { name: "All Collections", value: "", selected: this._collectionId === "" },
      ...this._collections.map((c) => ({ name: c.name, value: c.id, selected: this._collectionId === c.id })),
    ];
  }

  private _getAvailabilityOptions(): SelectOption[] {
    return [
      { name: "All", value: "all", selected: this._availability === "all" },
      { name: "Available", value: "available", selected: this._availability === "available" },
      { name: "Unavailable", value: "unavailable", selected: this._availability === "unavailable" },
    ];
  }

  private _getStockStatusOptions(): SelectOption[] {
    return [
      { name: "All Stock", value: "all", selected: this._stockStatus === "all" },
      { name: "In Stock", value: "in-stock", selected: this._stockStatus === "in-stock" },
      { name: "Low Stock", value: "low-stock", selected: this._stockStatus === "low-stock" },
      { name: "Out of Stock", value: "out-of-stock", selected: this._stockStatus === "out-of-stock" },
    ];
  }

  private _renderLoadingState(): unknown {
    return html`<div class="loading"><uui-loader></uui-loader></div>`;
  }

  private _renderErrorState(): unknown {
    return html`<div class="error" role="alert">${this._errorMessage}</div>`;
  }

  private _renderEmptyState(): unknown {
    const hasFilters = this._hasActiveFilters();

    return html`
      <merchello-empty-state
        icon="icon-box"
        headline=${hasFilters ? "No matching products" : "No products found"}
        message=${hasFilters
          ? "Try adjusting your filters to see more results."
          : "Products will appear here once you add them to your catalog."}>
        ${hasFilters
          ? html`
              <uui-button slot="actions" look="secondary" label="Reset filters" @click=${this._handleResetFilters}>
                Reset filters
              </uui-button>
            `
          : html`
              <uui-button slot="actions" look="primary" color="positive" label="Add Product" @click=${this._handleAddProduct}>
                Add Product
              </uui-button>
            `}
      </merchello-empty-state>
    `;
  }

  private _renderProductsTable(): unknown {
    return html`
      <merchello-product-table
        .products=${this._products}
        .columns=${this._tableColumns}
        .selectable=${true}
        .selectedIds=${Array.from(this._selectedProducts)}
        @selection-change=${this._handleSelectionChange}
        @product-click=${this._handleProductClick}
      ></merchello-product-table>
      <merchello-pagination
        .state=${this._getPaginationState()}
        .disabled=${this._isLoading}
        @page-change=${this._handlePageChange}
      ></merchello-pagination>
    `;
  }

  private _renderProductsContent(): unknown {
    if (this._isLoading) return this._renderLoadingState();
    if (this._errorMessage) return this._renderErrorState();
    if (this._products.length === 0) return this._renderEmptyState();
    return this._renderProductsTable();
  }

  override render() {
    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="products-container layout-container">
          <div class="filters">
            <div class="filters-top">
              <div class="search-box">
                <uui-input type="text" placeholder="Search by name or SKU..." .value=${this._searchTerm}
                  @input=${this._handleSearchInput} label="Search products">
                  <uui-icon name="icon-search" slot="prepend"></uui-icon>
                  ${this._searchTerm
                    ? html`<uui-button slot="append" compact look="secondary" label="Clear search" @click=${this._handleSearchClear}>
                        <uui-icon name="icon-wrong"></uui-icon>
                      </uui-button>`
                    : ""}
                </uui-input>
              </div>
              <div class="header-actions">
                ${this._selectedProducts.size > 0
                  ? html`
                      <uui-button
                        look="primary"
                        color="danger"
                        label="Delete products"
                        ?disabled=${this._isDeleting}
                        @click=${this._handleDeleteSelected}>
                        ${this._isDeleting
                          ? "Deleting..."
                          : `Delete (${this._selectedProducts.size})`}
                      </uui-button>
                    `
                  : ""}
                <uui-button look="primary" color="positive" label="Add Product" @click=${this._handleAddProduct}>Add Product</uui-button>
              </div>
              <div class="filter-dropdowns">
                <uui-select label="Product Type" .options=${this._getProductTypeOptions()} @change=${this._handleProductTypeChange}></uui-select>
                <uui-select label="Collection" .options=${this._getCollectionOptions()} @change=${this._handleCollectionChange}></uui-select>
                <uui-select label="Availability" .options=${this._getAvailabilityOptions()} @change=${this._handleAvailabilityChange}></uui-select>
                <uui-select label="Stock Status" .options=${this._getStockStatusOptions()} @change=${this._handleStockStatusChange}></uui-select>
                ${this._hasActiveFilters()
                  ? html`
                      <uui-button look="secondary" label="Reset filters" @click=${this._handleResetFilters}>
                        Reset
                      </uui-button>
                    `
                  : ""}
              </div>
            </div>
          </div>
          ${this._renderProductsContent()}
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    collectionLayoutStyles,
    css`
    :host { display: block; height: 100%; background: var(--uui-color-background); }
    .search-box { max-width: 320px; }
    .search-box uui-icon[slot="prepend"] { color: var(--uui-color-text-alt); }
    .filter-dropdowns { display: flex; gap: var(--uui-size-space-2); flex-wrap: wrap; }
    .filter-dropdowns uui-select { min-width: 140px; }
    .filter-dropdowns uui-button { align-self: stretch; }
    .loading { display: flex; justify-content: center; padding: var(--uui-size-space-6); }
    .error { padding: var(--uui-size-space-4); background: var(--uui-color-danger-standalone); color: var(--uui-color-danger-contrast); border-radius: var(--uui-border-radius); }
    merchello-pagination { padding: var(--uui-size-space-3); border-top: 1px solid var(--uui-color-border); }
  `,
  ];
}

export default MerchelloProductsListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-products-list": MerchelloProductsListElement;
  }
}
