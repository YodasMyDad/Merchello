import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type {
  ProductListItemDto,
  ProductListParams,
  ProductTypeDto,
  ProductCategoryDto,
  ProductColumnKey,
} from "@products/types/product.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { PaginationState, PageChangeEventDetail } from "@shared/types/pagination.types.js";
import { MERCHELLO_CREATE_PRODUCT_MODAL } from "@products/modals/create-product-modal.token.js";
import { navigateToProductDetail } from "@shared/utils/navigation.js";
import "@shared/components/pagination.element.js";
import "@shared/components/merchello-empty-state.element.js";
import "./product-table.element.js";
import type { ProductSelectionChangeEventDetail } from "./product-table.element.js";

interface SelectOption {
  name: string;
  value: string;
  selected?: boolean;
}

@customElement("merchello-products-list")
export class MerchelloProductsListElement extends UmbElementMixin(LitElement) {
  @state() private _products: ProductListItemDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _page: number = 1;
  @state() private _pageSize: number = 50;
  @state() private _totalItems: number = 0;
  @state() private _totalPages: number = 0;
  @state() private _selectedProducts: Set<string> = new Set();
  @state() private _searchTerm: string = "";
  @state() private _productTypeId: string = "";
  @state() private _categoryId: string = "";
  @state() private _availability: string = "all";
  @state() private _stockStatus: string = "all";
  @state() private _productTypes: ProductTypeDto[] = [];
  @state() private _categories: ProductCategoryDto[] = [];

  private _searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  #modalManager?: UmbModalManagerContext;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._loadFilterOptions();
    this._loadProducts();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }
  }

  private async _loadFilterOptions(): Promise<void> {
    const [typesResult, categoriesResult] = await Promise.all([
      MerchelloApi.getProductTypes(),
      MerchelloApi.getProductCategories(),
    ]);

    if (typesResult.data) this._productTypes = typesResult.data;
    if (categoriesResult.data) this._categories = categoriesResult.data;
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
    if (this._categoryId) params.categoryId = this._categoryId;
    if (this._availability !== "all") params.availability = this._availability as ProductListParams["availability"];
    if (this._stockStatus !== "all") params.stockStatus = this._stockStatus as ProductListParams["stockStatus"];

    const { data, error } = await MerchelloApi.getProducts(params);

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    if (data) {
      this._products = data.items;
      this._totalItems = data.totalItems;
      this._totalPages = data.totalPages;
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

  private _handleCategoryChange(e: Event): void {
    this._categoryId = (e.target as HTMLSelectElement).value;
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

  private async _handleAddProduct(): Promise<void> {
    const modal = this.#modalManager?.open(this, MERCHELLO_CREATE_PRODUCT_MODAL, {
      data: {},
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (result?.created && result.productId) {
      navigateToProductDetail(result.productId);
    }
  }

  private _tableColumns: ProductColumnKey[] = ["select", "rootName", "sku", "price", "purchaseable", "stock", "variants"];

  private _getProductTypeOptions(): SelectOption[] {
    return [
      { name: "All Types", value: "", selected: this._productTypeId === "" },
      ...this._productTypes.map((t) => ({ name: t.name, value: t.id, selected: this._productTypeId === t.id })),
    ];
  }

  private _getCategoryOptions(): SelectOption[] {
    return [
      { name: "All Categories", value: "", selected: this._categoryId === "" },
      ...this._categories.map((c) => ({ name: c.name, value: c.id, selected: this._categoryId === c.id })),
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
    return html`<div class="error">${this._errorMessage}</div>`;
  }

  private _renderEmptyState(): unknown {
    return html`
      <merchello-empty-state icon="icon-box" headline="No products found"
        message="Products will appear here once you add them to your catalog.">
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

  render() {
    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="products-container">
          <div class="header-actions">
            ${this._selectedProducts.size > 0
              ? html`<uui-button look="primary" color="danger" label="Delete">Delete (${this._selectedProducts.size})</uui-button>`
              : ""}
            <uui-button look="primary" color="positive" label="Add Product" @click=${this._handleAddProduct}>Add Product</uui-button>
          </div>
          <div class="filters-row">
            <div class="search-box">
              <uui-input type="text" placeholder="Search by name or SKU..." .value=${this._searchTerm}
                @input=${this._handleSearchInput} label="Search products">
                <uui-icon name="icon-search" slot="prepend"></uui-icon>
                ${this._searchTerm
                  ? html`<uui-button slot="append" compact look="secondary" label="Clear" @click=${this._handleSearchClear}>
                      <uui-icon name="icon-wrong"></uui-icon>
                    </uui-button>`
                  : ""}
              </uui-input>
            </div>
            <div class="filter-dropdowns">
              <uui-select label="Product Type" .options=${this._getProductTypeOptions()} @change=${this._handleProductTypeChange}></uui-select>
              <uui-select label="Category" .options=${this._getCategoryOptions()} @change=${this._handleCategoryChange}></uui-select>
              <uui-select label="Availability" .options=${this._getAvailabilityOptions()} @change=${this._handleAvailabilityChange}></uui-select>
              <uui-select label="Stock Status" .options=${this._getStockStatusOptions()} @change=${this._handleStockStatusChange}></uui-select>
            </div>
          </div>
          ${this._renderProductsContent()}
        </div>
      </umb-body-layout>
    `;
  }

  static styles = css`
    :host { display: block; height: 100%; background: var(--uui-color-background); }
    .products-container { max-width: 100%; padding: var(--uui-size-layout-1); }
    .header-actions { display: flex; gap: var(--uui-size-space-2); align-items: center; justify-content: flex-end; margin-bottom: var(--uui-size-space-4); }
    .filters-row { display: flex; flex-direction: column; gap: var(--uui-size-space-3); margin-bottom: var(--uui-size-space-4); }
    @media (min-width: 768px) { .filters-row { flex-direction: row; align-items: flex-end; justify-content: space-between; } }
    .search-box { flex: 1; max-width: 300px; }
    .search-box uui-input { width: 100%; }
    .search-box uui-icon[slot="prepend"] { color: var(--uui-color-text-alt); }
    .filter-dropdowns { display: flex; gap: var(--uui-size-space-2); flex-wrap: wrap; }
    .filter-dropdowns uui-select { min-width: 140px; }
    .loading { display: flex; justify-content: center; padding: var(--uui-size-space-6); }
    .error { padding: var(--uui-size-space-4); background: #f8d7da; color: #721c24; border-radius: var(--uui-border-radius); }
    merchello-pagination { padding: var(--uui-size-space-3); border-top: 1px solid var(--uui-color-border); }
  `;
}

export default MerchelloProductsListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-products-list": MerchelloProductsListElement;
  }
}
