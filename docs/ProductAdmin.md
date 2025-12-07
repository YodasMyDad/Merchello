\# Products List Page - Development Guide

This guide provides a staged approach to implementing the Products List page in the Merchello backoffice. Follow the existing orders module patterns for consistency.

\---

\## Prerequisites

Before starting, familiarize yourself with:

\- [Umbraco-Backoffice-Dev.md](./Umbraco-Backoffice-Dev.md) - Umbraco v17 extension patterns

\- [Typescript.md](./Typescript.md) - TypeScript conventions

\- [Developer-Guidelines.md](./Developer-Guidelines.md) - .NET and DTO naming conventions

**Key Reference Files:**

| Pattern Source | Purpose |

|---------------|---------|

| `orders/components/orders-list.element.ts` | List page structure, search, filters, pagination |

| `orders/components/order-table.element.ts` | Reusable table component pattern |

| `orders/types/order.types.ts` | TypeScript type definitions |

| `Controllers/OrdersApiController.cs` | API controller pattern |

\---

\## Stage 1: Backend API Setup

\### 1.1 Create Product DTOs

Create the `Dtos` folder and DTOs for the products API.

**File:** `src/Merchello.Core/Products/Dtos/ProductListItemDto.cs`

sharp

namespace Merchello.Core.Products.Dtos;

/// <summary>

/// Product list item for the admin backoffice grid view

/// </summary>

public class ProductListItemDto

{

  public Guid Id { get; set; }

  public Guid ProductRootId { get; set; }

  public string RootName { get; set; } = string.Empty;

  public string? Sku { get; set; }

  public decimal Price { get; set; }

  public bool Purchaseable { get; set; }

  public int TotalStock { get; set; }

  public int VariantCount { get; set; }

  public string ProductTypeName { get; set; } = string.Empty;

  public List<string> CategoryNames { get; set; } = [];

  public string? ImageUrl { get; set; }

}**File:** `src/Merchello.Core/Products/Dtos/ProductPageDto.cs`

arp

namespace Merchello.Core.Products.Dtos;

public class ProductPageDto

{

  public List<ProductListItemDto> Items { get; set; } = [];

  public int Page { get; set; }

  public int PageSize { get; set; }

  public int TotalItems { get; set; }

  public int TotalPages { get; set; }

}**File:** `src/Merchello.Core/Products/Dtos/ProductQueryDto.cs`

namespace Merchello.Core.Products.Dtos;

public class ProductQueryDto

{

  public int Page { get; set; } = 1;

  public int PageSize { get; set; } = 50;

  public string? Search { get; set; }

  public Guid? ProductTypeId { get; set; }

  public Guid? CategoryId { get; set; }

  public string? Availability { get; set; } // "all", "available", "unavailable"

  public string? StockStatus { get; set; }  // "all", "in-stock", "low-stock", "out-of-stock"

  public string? SortBy { get; set; }

  public string? SortDir { get; set; }

}### 1.2 Create Products API Controller

**File:** `src/Merchello/Controllers/ProductsApiController.cs`

using Asp.Versioning;

using Merchello.Core.Products.Dtos;

using Merchello.Core.Products.Models;

using Merchello.Core.Products.Services.Interfaces;

using Merchello.Core.Products.Services.Parameters;

using Microsoft.AspNetCore.Http;

using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

[ApiVersion("1.0")]

[ApiExplorerSettings(GroupName = "Merchello")]

public class ProductsApiController(IProductService productService) : MerchelloApiControllerBase

{

  [HttpGet("products")]

  [ProducesResponseType<ProductPageDto>(StatusCodes.Status200OK)]

  public async Task<ProductPageDto> GetProducts([FromQuery] ProductQueryDto query)

  {

​    var parameters = new ProductQueryParameters

​    {

​      CurrentPage = query.Page,

​      AmountPerPage = query.PageSize,

​      ProductTypeKey = query.ProductTypeId,

​      NoTracking = true,

​      IncludeProductWarehouses = true,

​      AllVariants = false

​    };

​    if (query.CategoryId.HasValue)

​    {

​      parameters.CategoryIds = [query.CategoryId.Value];

​    }

​    var result = await productService.QueryProducts(parameters);

​    var items = result.Items.Select(MapToListItem).ToList();

​    items = ApplyFilters(items, query);

​    return new ProductPageDto

​    {

​      Items = items,

​      Page = result.PageIndex,

​      PageSize = query.PageSize,

​      TotalItems = result.TotalItems,

​      TotalPages = result.TotalPages

​    };

  }

  [HttpGet("products/types")]

  [ProducesResponseType<List<ProductTypeDto>>(StatusCodes.Status200OK)]

  public async Task<List<ProductTypeDto>> GetProductTypes()

  {

​    var types = await productService.GetProductTypes();

​    return types.Select(t => new ProductTypeDto { Id = t.Id, Name = t.Name, Alias = t.Alias }).ToList();

  }

  [HttpGet("products/categories")]

  [ProducesResponseType<List<ProductCategoryDto>>(StatusCodes.Status200OK)]

  public async Task<List<ProductCategoryDto>> GetProductCategories()

  {

​    var categories = await productService.GetProductCategories();

​    return categories.Select(c => new ProductCategoryDto { Id = c.Id, Name = c.Name }).ToList();

  }

  private static ProductListItemDto MapToListItem(Product product)

  {

​    var totalStock = product.ProductWarehouses?.Sum(pw => pw.Stock) ?? 0;

​    var variantCount = product.ProductRoot?.Products?.Count ?? 1;

​    return new ProductListItemDto

​    {

​      Id = product.Id,

​      ProductRootId = product.ProductRootId,

​      RootName = product.ProductRoot?.RootName ?? product.Name ?? "Unknown",

​      Sku = product.Sku,

​      Price = product.Price,

​      Purchaseable = product.AvailableForPurchase && product.CanPurchase,

​      TotalStock = totalStock,

​      VariantCount = variantCount,

​      ProductTypeName = product.ProductRoot?.ProductType?.Name ?? "",

​      CategoryNames = product.ProductRoot?.Categories?.Select(c => c.Name).ToList() ?? [],

​      ImageUrl = product.Images.FirstOrDefault() ?? product.ProductRoot?.RootImages.FirstOrDefault()

​    };

  }

  private static List<ProductListItemDto> ApplyFilters(List<ProductListItemDto> items, ProductQueryDto query)

  {

​    if (!string.IsNullOrWhiteSpace(query.Search))

​    {

​      var search = query.Search.ToLower();

​      items = items.Where(p =>

​        (p.RootName?.ToLower().Contains(search) == true) ||

​        (p.Sku?.ToLower().Contains(search) == true)

​      ).ToList();

​    }

​    if (!string.IsNullOrEmpty(query.Availability) && query.Availability != "all")

​    {

​      items = query.Availability switch

​      {

​        "available" => items.Where(p => p.Purchaseable).ToList(),

​        "unavailable" => items.Where(p => !p.Purchaseable).ToList(),

​        _ => items

​      };

​    }

​    if (!string.IsNullOrEmpty(query.StockStatus) && query.StockStatus != "all")

​    {

​      items = query.StockStatus switch

​      {

​        "in-stock" => items.Where(p => p.TotalStock > 10).ToList(),

​        "low-stock" => items.Where(p => p.TotalStock > 0 && p.TotalStock <= 10).ToList(),

​        "out-of-stock" => items.Where(p => p.TotalStock <= 0).ToList(),

​        _ => items

​      };

​    }

​    return items;

  }

}

public class ProductTypeDto

{

  public Guid Id { get; set; }

  public string Name { get; set; } = string.Empty;

  public string? Alias { get; set; }

}

public class ProductCategoryDto

{

  public Guid Id { get; set; }

  public string Name { get; set; } = string.Empty;

}---

\## Stage 2: Frontend Types and API

\### 2.1 Create Product Types

**File:** `src/Merchello/Client/src/products/types/product.types.ts`

// Product types matching the API DTOs

export interface ProductListItemDto {

 id: string;

 productRootId: string;

 rootName: string;

 sku: string | null;

 price: number;

 purchaseable: boolean;

 totalStock: number;

 variantCount: number;

 productTypeName: string;

 categoryNames: string[];

 imageUrl: string | null;

}

export interface ProductPageDto {

 items: ProductListItemDto[];

 page: number;

 pageSize: number;

 totalItems: number;

 totalPages: number;

}

export interface ProductListParams {

 page?: number;

 pageSize?: number;

 search?: string;

 productTypeId?: string;

 categoryId?: string;

 availability?: "all" | "available" | "unavailable";

 stockStatus?: "all" | "in-stock" | "low-stock" | "out-of-stock";

 sortBy?: string;

 sortDir?: string;

}

export interface ProductTypeDto {

 id: string;

 name: string;

 alias: string | null;

}

export interface ProductCategoryDto {

 id: string;

 name: string;

}

export type ProductColumnKey =

 | "select"

 | "rootName"

 | "sku"

 | "price"

 | "purchaseable"

 | "stock"

 | "variants";

export const PRODUCT_COLUMN_LABELS: Record<ProductColumnKey, string> = {

 select: "",

 rootName: "Product",

 sku: "SKU",

 price: "Price",

 purchaseable: "Available",

 stock: "Stock",

 variants: "Variants",

};

export const DEFAULT_PRODUCT_COLUMNS: ProductColumnKey[] = [

 "rootName",

 "sku",

 "price",

 "purchaseable",

 "stock",

 "variants",

];### 2.2 Add API Methods

Add to `src/Merchello/Client/src/api/merchello-api.ts`:

// Add imports

import type {

 ProductPageDto,

 ProductListParams,

 ProductTypeDto,

 ProductCategoryDto,

} from '../products/types/product.types.js';

// Add to MerchelloApi object

getProducts: (params?: ProductListParams) => {

 const queryString = buildQueryString(params as Record<string, unknown>);

 return apiGet<ProductPageDto>(`products${queryString ? `?${queryString}` : ''}`);

},

getProductTypes: () => apiGet<ProductTypeDto[]>('products/types'),

getProductCategories: () => apiGet<ProductCategoryDto[]>('products/categories'),---

\## Stage 3: Products List Component

\### 3.1 Create Products List Element

**File:** `src/Merchello/Client/src/products/components/products-list.element.ts`

import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";

import { customElement, state } from "@umbraco-cms/backoffice/external/lit";

import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";

import type {

 ProductListItemDto,

 ProductListParams,

 ProductTypeDto,

 ProductCategoryDto,

 ProductColumnKey,

} from "@products/types/product.types.js";

import { MerchelloApi } from "@api/merchello-api.js";

import type { PaginationState, PageChangeEventDetail } from "@shared/types/pagination.types.js";

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

​    message="Products will appear here once you add them to your catalog.">

   </merchello-empty-state>

  `;

 }

 private _renderProductsTable(): unknown {

  return html`

   <merchello-product-table

​    .products=${this._products}

​    .columns=${this._tableColumns}

​    .selectable=${true}

​    .selectedIds=${Array.from(this._selectedProducts)}

​    @selection-change=${this._handleSelectionChange}

   \></merchello-product-table>

   <merchello-pagination

​    .state=${this._getPaginationState()}

​    .disabled=${this._isLoading}

​    @page-change=${this._handlePageChange}

   \></merchello-pagination>

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

​      ${this._selectedProducts.size > 0

​       ? html`<uui-button look="primary" color="danger" label="Delete">Delete (${this._selectedProducts.size})</uui-button>`

​       : ""}

​      <uui-button look="primary" color="positive" label="Add Product">Add Product</uui-button>

​     </div>

          <div class="filters-row">

            <div class="search-box">

​       <uui-input type="text" placeholder="Search by name or SKU..." .value=${this._searchTerm}

​        @input=${this._handleSearchInput} label="Search products">

​        <uui-icon name="icon-search" slot="prepend"></uui-icon>

​        ${this._searchTerm

​         ? html`<uui-button slot="append" compact look="secondary" label="Clear" @click=${this._handleSearchClear}>

​           <uui-icon name="icon-wrong"></uui-icon>

​          </uui-button>`

​         : ""}

​       </uui-input>

​      </div>

            <div class="filter-dropdowns">

​       <uui-select label="Product Type" .options=${this._getProductTypeOptions()} @change=${this._handleProductTypeChange}></uui-select>

​       <uui-select label="Category" .options=${this._getCategoryOptions()} @change=${this._handleCategoryChange}></uui-select>

​       <uui-select label="Availability" .options=${this._getAvailabilityOptions()} @change=${this._handleAvailabilityChange}></uui-select>

​       <uui-select label="Stock Status" .options=${this._getStockStatusOptions()} @change=${this._handleStockStatusChange}></uui-select>

​      </div>

​     </div>

​     ${this._renderProductsContent()}

​    </div>

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

}### 3.2 Create Products Table Element

**File:** `src/Merchello/Client/src/products/components/product-table.element.ts`

import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";

import { customElement, property } from "@umbraco-cms/backoffice/external/lit";

import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";

import type { ProductListItemDto, ProductColumnKey } from "@products/types/product.types.js";

import { PRODUCT_COLUMN_LABELS, DEFAULT_PRODUCT_COLUMNS } from "@products/types/product.types.js";

import { formatCurrency } from "@shared/utils/formatting.js";

import { getProductDetailHref } from "@shared/utils/navigation.js";

import { badgeStyles } from "@shared/styles/badge.styles.js";

export interface ProductClickEventDetail {

 productId: string;

 product: ProductListItemDto;

}

export interface ProductSelectionChangeEventDetail {

 selectedIds: string[];

}

@customElement("merchello-product-table")

export class MerchelloProductTableElement extends UmbElementMixin(LitElement) {

 @property({ type: Array }) products: ProductListItemDto[] = [];

 @property({ type: Array }) columns: ProductColumnKey[] = [...DEFAULT_PRODUCT_COLUMNS];

 @property({ type: Boolean }) selectable = false;

 @property({ type: Array }) selectedIds: string[] = [];

 @property({ type: Boolean }) clickable = true;

 private _getEffectiveColumns(): ProductColumnKey[] {

  const cols = [...this.columns];

  if (!cols.includes("rootName")) cols.unshift("rootName");

  if (this.selectable && !cols.includes("select")) cols.unshift("select");

  return cols;

 }

 private _handleSelectAll(e: Event): void {

  const checked = (e.target as HTMLInputElement).checked;

  const newSelection = checked ? this.products.map((p) => p.id) : [];

  this._dispatchSelectionChange(newSelection);

 }

 private _handleSelectProduct(id: string, e: Event): void {

  e.stopPropagation();

  const checked = (e.target as HTMLInputElement).checked;

  const newSelection = checked

   ? [...this.selectedIds, id]

   : this.selectedIds.filter((selectedId) => selectedId !== id);

  this._dispatchSelectionChange(newSelection);

 }

 private _dispatchSelectionChange(selectedIds: string[]): void {

  this.dispatchEvent(new CustomEvent("selection-change", {

   detail: { selectedIds } as ProductSelectionChangeEventDetail,

   bubbles: true,

   composed: true,

  }));

 }

 private _handleRowClick(product: ProductListItemDto): void {

  if (!this.clickable) return;

  this.dispatchEvent(new CustomEvent("product-click", {

   detail: { productId: product.id, product } as ProductClickEventDetail,

   bubbles: true,

   composed: true,

  }));

 }

 private _renderHeaderCell(column: ProductColumnKey): unknown {

  if (column === "select") {

   return html`

​    <uui-table-head-cell class="checkbox-col">

​     <uui-checkbox aria-label="Select all" @change=${this._handleSelectAll}

​      ?checked=${this.selectedIds.length === this.products.length && this.products.length > 0}></uui-checkbox>

​    </uui-table-head-cell>

   `;

  }

  return html`<uui-table-head-cell>${PRODUCT_COLUMN_LABELS[column]}</uui-table-head-cell>`;

 }

 private _renderCell(product: ProductListItemDto, column: ProductColumnKey): unknown {

  switch (column) {

   case "select":

​    return html`

​     <uui-table-cell class="checkbox-col">

​      <uui-checkbox aria-label="Select ${product.rootName}" ?checked=${this.selectedIds.includes(product.id)}

​       @change=${(e: Event) => this._handleSelectProduct(product.id, e)}

​       @click=${(e: Event) => e.stopPropagation()}></uui-checkbox>

​     </uui-table-cell>

​    `;

   case "rootName":

​    return html`<uui-table-cell class="product-name"><a href=${getProductDetailHref(product.id)}>${product.rootName}</a></uui-table-cell>`;

   case "sku":

​    return html`<uui-table-cell>${product.sku ?? "-"}</uui-table-cell>`;

   case "price":

​    return html`<uui-table-cell>${formatCurrency(product.price)}</uui-table-cell>`;

   case "purchaseable":

​    return html`<uui-table-cell><span class="badge ${product.purchaseable ? "badge-positive" : "badge-danger"}">${product.purchaseable ? "Available" : "Unavailable"}</span></uui-table-cell>`;

   case "stock":

​    return html`<uui-table-cell><span class="badge ${this._getStockBadgeClass(product.totalStock)}">${product.totalStock}</span></uui-table-cell>`;

   case "variants":

​    return html`<uui-table-cell><span class="badge badge-default">${product.variantCount}</span></uui-table-cell>`;

   default:

​    return nothing;

  }

 }

 private _getStockBadgeClass(stock: number): string {

  if (stock <= 0) return "badge-danger";

  if (stock <= 10) return "badge-warning";

  return "badge-positive";

 }

 private _renderRow(product: ProductListItemDto): unknown {

  const cols = this._getEffectiveColumns();

  return html`

   <uui-table-row class=${this.clickable ? "clickable" : ""} @click=${() => this._handleRowClick(product)}>

​    ${cols.map((col) => this._renderCell(product, col))}

   </uui-table-row>

  `;

 }

 render() {

  const cols = this._getEffectiveColumns();

  return html`

      <div class="table-container">

​    <uui-table class="product-table">

​     <uui-table-head>${cols.map((col) => this._renderHeaderCell(col))}</uui-table-head>

​     ${this.products.map((product) => this._renderRow(product))}

​    </uui-table>

   </div>

  `;

 }

 static styles = [

  badgeStyles,

  css`

   :host { display: block; }

   .table-container { overflow-x: auto; background: var(--uui-color-surface); border: 1px solid var(--uui-color-border); border-radius: var(--uui-border-radius); }

   .product-table { width: 100%; }

   uui-table-head-cell, uui-table-cell { white-space: nowrap; }

   uui-table-row.clickable { cursor: pointer; }

   uui-table-row.clickable:hover { background: var(--uui-color-surface-emphasis); }

   .checkbox-col { width: 40px; }

   .product-name a { font-weight: 500; color: var(--uui-color-interactive); text-decoration: none; }

   .product-name a:hover { text-decoration: underline; }

  `,

 ];

}

export default MerchelloProductTableElement;

declare global {

 interface HTMLElementTagNameMap {

  "merchello-product-table": MerchelloProductTableElement;

 }

}---

\## Stage 4: Manifest Updates and Navigation

\### 4.1 Update Products Manifest

**File:** `src/Merchello/Client/src/products/manifest.ts`

export const manifests: Array<UmbExtensionManifest> = [

 {

  type: "workspace",

  kind: "default",

  alias: "Merchello.Products.Workspace",

  name: "Merchello Products Workspace",

  meta: {

   entityType: "merchello-products",

   headline: "Products",

  },

 },

 {

  type: "workspaceView",

  alias: "Merchello.Products.Workspace.View",

  name: "Merchello Products View",

  js: () => import("./components/products-list.element.js"),

  weight: 100,

  meta: {

   label: "Products",

   pathname: "products",

   icon: "icon-box",

  },

  conditions: [

   {

​    alias: "Umb.Condition.WorkspaceAlias",

​    match: "Merchello.Products.Workspace",

   },

  ],

 },

];### 4.2 Add Navigation Utilities

Add to `src/Merchello/Client/src/shared/utils/navigation.ts`:

export const PRODUCT_ENTITY_TYPE = "merchello-product";

export function getProductDetailHref(productId: string): string {

 return getMerchelloWorkspaceHref(PRODUCT_ENTITY_TYPE, `edit/${productId}`);

}

export function navigateToProductDetail(productId: string): void {

 navigateToMerchelloWorkspace(PRODUCT_ENTITY_TYPE, `edit/${productId}`);

}---

\## Testing Checklist

\### Stage 1 (Backend)

\- [ ] DTOs compile without errors

\- [ ] API responds to GET `/umbraco/api/v1/products`

\- [ ] Filter parameters work correctly

\- [ ] Pagination returns correct counts

\### Stage 2 (Frontend Types)

\- [ ] Types compile without errors

\- [ ] API methods added to `merchello-api.ts`

\- [ ] Build completes successfully

\### Stage 3 (Components)

\- [ ] Products list renders in workspace

\- [ ] Search filters products correctly

\- [ ] Dropdown filters work

\- [ ] Pagination navigates between pages

\- [ ] Multi-select checkboxes function

\- [ ] Loading/error/empty states display correctly

\### Stage 4 (Integration)

\- [ ] Clicking "Products" in tree opens products list

\- [ ] Product rows are clickable

\- [ ] Build and hot-reload work correctly

\---

\## Column Reference

| Column | Field | Badge Style |

|--------|-------|-------------|

| Product | `rootName` | Link to detail |

| SKU | `sku` | Plain text |

| Price | `price` | Formatted currency |

| Available | `purchaseable` | Green/Red |

| Stock | `totalStock` | Green (>10) / Yellow (1-10) / Red (0) |

| Variants | `variantCount` | Default badge |

\---

\## Filter Reference

| Filter | API Parameter | Options |

|--------|--------------|---------|

| Product Type | `productTypeId` | Dynamic from `/products/types` |

| Category | `categoryId` | Dynamic from `/products/categories` |

| Availability | `availability` | All, Available, Unavailable |

| Stock Status | `stockStatus` | All, In Stock, Low Stock, Out of Stock |

File: src/Merchello.Core/Products/Dtos/ProductPageDto.cs

namespace Merchello.Core.Products.Dtos;

public class ProductPageDto

{

  public List<ProductListItemDto> Items { get; set; } = [];

  public int Page { get; set; }

  public int PageSize { get; set; }

  public int TotalItems { get; set; }

  public int TotalPages { get; set; }

}

File: src/Merchello.Core/Products/Dtos/ProductQueryDto.cs

namespace Merchello.Core.Products.Dtos;

public class ProductQueryDto

{

  public int Page { get; set; } = 1;

  public int PageSize { get; set; } = 50;

  public string? Search { get; set; }

  public Guid? ProductTypeId { get; set; }

  public Guid? CategoryId { get; set; }

  public string? Availability { get; set; } // "all", "available", "unavailable"

  public string? StockStatus { get; set; }  // "all", "in-stock", "low-stock", "out-of-stock"

  public string? SortBy { get; set; }

  public string? SortDir { get; set; }

}

### 1.2 Create Products API Controller

File: src/Merchello/Controllers/ProductsApiController.cs

using Asp.Versioning;

using Merchello.Core.Products.Dtos;

using Merchello.Core.Products.Models;

using Merchello.Core.Products.Services.Interfaces;

using Merchello.Core.Products.Services.Parameters;

using Microsoft.AspNetCore.Http;

using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

[ApiVersion("1.0")]

[ApiExplorerSettings(GroupName = "Merchello")]

public class ProductsApiController(IProductService productService) : MerchelloApiControllerBase

{

  [HttpGet("products")]

  [ProducesResponseType<ProductPageDto>(StatusCodes.Status200OK)]

  public async Task<ProductPageDto> GetProducts([FromQuery] ProductQueryDto query)

  {

​    var parameters = new ProductQueryParameters

​    {

​      CurrentPage = query.Page,

​      AmountPerPage = query.PageSize,

​      ProductTypeKey = query.ProductTypeId,

​      NoTracking = true,

​      IncludeProductWarehouses = true,

​      AllVariants = false

​    };

​    if (query.CategoryId.HasValue)

​    {

​      parameters.CategoryIds = [query.CategoryId.Value];

​    }

​    var result = await productService.QueryProducts(parameters);

​    var items = result.Items.Select(MapToListItem).ToList();

​    items = ApplyFilters(items, query);

​    return new ProductPageDto

​    {

​      Items = items,

​      Page = result.PageIndex,

​      PageSize = query.PageSize,

​      TotalItems = result.TotalItems,

​      TotalPages = result.TotalPages

​    };

  }

  [HttpGet("products/types")]

  [ProducesResponseType<List<ProductTypeDto>>(StatusCodes.Status200OK)]

  public async Task<List<ProductTypeDto>> GetProductTypes()

  {

​    var types = await productService.GetProductTypes();

​    return types.Select(t => new ProductTypeDto { Id = t.Id, Name = t.Name, Alias = t.Alias }).ToList();

  }

  [HttpGet("products/categories")]

  [ProducesResponseType<List<ProductCategoryDto>>(StatusCodes.Status200OK)]

  public async Task<List<ProductCategoryDto>> GetProductCategories()

  {

​    var categories = await productService.GetProductCategories();

​    return categories.Select(c => new ProductCategoryDto { Id = c.Id, Name = c.Name }).ToList();

  }

  private static ProductListItemDto MapToListItem(Product product)

  {

​    var totalStock = product.ProductWarehouses?.Sum(pw => pw.Stock) ?? 0;

​    var variantCount = product.ProductRoot?.Products?.Count ?? 1;

​    return new ProductListItemDto

​    {

​      Id = product.Id,

​      ProductRootId = product.ProductRootId,

​      RootName = product.ProductRoot?.RootName ?? product.Name ?? "Unknown",

​      Sku = product.Sku,

​      Price = product.Price,

​      Purchaseable = product.AvailableForPurchase && product.CanPurchase,

​      TotalStock = totalStock,

​      VariantCount = variantCount,

​      ProductTypeName = product.ProductRoot?.ProductType?.Name ?? "",

​      CategoryNames = product.ProductRoot?.Categories?.Select(c => c.Name).ToList() ?? [],

​      ImageUrl = product.Images.FirstOrDefault() ?? product.ProductRoot?.RootImages.FirstOrDefault()

​    };

  }

  private static List<ProductListItemDto> ApplyFilters(List<ProductListItemDto> items, ProductQueryDto query)

  {

​    if (!string.IsNullOrWhiteSpace(query.Search))

​    {

​      var search = query.Search.ToLower();

​      items = items.Where(p =>

​        (p.RootName?.ToLower().Contains(search) == true) ||

​        (p.Sku?.ToLower().Contains(search) == true)

​      ).ToList();

​    }

​    if (!string.IsNullOrEmpty(query.Availability) && query.Availability != "all")

​    {

​      items = query.Availability switch

​      {

​        "available" => items.Where(p => p.Purchaseable).ToList(),

​        "unavailable" => items.Where(p => !p.Purchaseable).ToList(),

​        _ => items

​      };

​    }

​    if (!string.IsNullOrEmpty(query.StockStatus) && query.StockStatus != "all")

​    {

​      items = query.StockStatus switch

​      {

​        "in-stock" => items.Where(p => p.TotalStock > 10).ToList(),

​        "low-stock" => items.Where(p => p.TotalStock > 0 && p.TotalStock <= 10).ToList(),

​        "out-of-stock" => items.Where(p => p.TotalStock <= 0).ToList(),

​        _ => items

​      };

​    }

​    return items;

  }

}

public class ProductTypeDto

{

  public Guid Id { get; set; }

  public string Name { get; set; } = string.Empty;

  public string? Alias { get; set; }

}

public class ProductCategoryDto

{

  public Guid Id { get; set; }

  public string Name { get; set; } = string.Empty;

}

------

## Stage 2: Frontend Types and API

### 2.1 Create Product Types

File: src/Merchello/Client/src/products/types/product.types.ts

// Product types matching the API DTOs

export interface ProductListItemDto {

 id: string;

 productRootId: string;

 rootName: string;

 sku: string | null;

 price: number;

 purchaseable: boolean;

 totalStock: number;

 variantCount: number;

 productTypeName: string;

 categoryNames: string[];

 imageUrl: string | null;

}

export interface ProductPageDto {

 items: ProductListItemDto[];

 page: number;

 pageSize: number;

 totalItems: number;

 totalPages: number;

}

export interface ProductListParams {

 page?: number;

 pageSize?: number;

 search?: string;

 productTypeId?: string;

 categoryId?: string;

 availability?: "all" | "available" | "unavailable";

 stockStatus?: "all" | "in-stock" | "low-stock" | "out-of-stock";

 sortBy?: string;

 sortDir?: string;

}

export interface ProductTypeDto {

 id: string;

 name: string;

 alias: string | null;

}

export interface ProductCategoryDto {

 id: string;

 name: string;

}

export type ProductColumnKey =

 | "select"

 | "rootName"

 | "sku"

 | "price"

 | "purchaseable"

 | "stock"

 | "variants";

export const PRODUCT_COLUMN_LABELS: Record<ProductColumnKey, string> = {

 select: "",

 rootName: "Product",

 sku: "SKU",

 price: "Price",

 purchaseable: "Available",

 stock: "Stock",

 variants: "Variants",

};

export const DEFAULT_PRODUCT_COLUMNS: ProductColumnKey[] = [

 "rootName",

 "sku",

 "price",

 "purchaseable",

 "stock",

 "variants",

];

### 2.2 Add API Methods

Add to src/Merchello/Client/src/api/merchello-api.ts:

// Add imports

import type {

 ProductPageDto,

 ProductListParams,

 ProductTypeDto,

 ProductCategoryDto,

} from '../products/types/product.types.js';

// Add to MerchelloApi object

getProducts: (params?: ProductListParams) => {

 const queryString = buildQueryString(params as Record<string, unknown>);

 return apiGet<ProductPageDto>(`products${queryString ? `?${queryString}` : ''}`);

},

getProductTypes: () => apiGet<ProductTypeDto[]>('products/types'),

getProductCategories: () => apiGet<ProductCategoryDto[]>('products/categories'),

------

## Stage 3: Products List Component

### 3.1 Create Products List Element

File: src/Merchello/Client/src/products/components/products-list.element.ts

import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";

import { customElement, state } from "@umbraco-cms/backoffice/external/lit";

import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";

import type {

 ProductListItemDto,

 ProductListParams,

 ProductTypeDto,

 ProductCategoryDto,

 ProductColumnKey,

} from "@products/types/product.types.js";

import { MerchelloApi } from "@api/merchello-api.js";

import type { PaginationState, PageChangeEventDetail } from "@shared/types/pagination.types.js";

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

​    message="Products will appear here once you add them to your catalog.">

   </merchello-empty-state>

  `;

 }

 private _renderProductsTable(): unknown {

  return html`

   <merchello-product-table

​    .products=${this._products}

​    .columns=${this._tableColumns}

​    .selectable=${true}

​    .selectedIds=${Array.from(this._selectedProducts)}

​    @selection-change=${this._handleSelectionChange}

   \></merchello-product-table>

   <merchello-pagination

​    .state=${this._getPaginationState()}

​    .disabled=${this._isLoading}

​    @page-change=${this._handlePageChange}

   \></merchello-pagination>

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

​      ${this._selectedProducts.size > 0

​       ? html`<uui-button look="primary" color="danger" label="Delete">Delete (${this._selectedProducts.size})</uui-button>`

​       : ""}

​      <uui-button look="primary" color="positive" label="Add Product">Add Product</uui-button>

​     </div>

          <div class="filters-row">

            <div class="search-box">

​       <uui-input type="text" placeholder="Search by name or SKU..." .value=${this._searchTerm}

​        @input=${this._handleSearchInput} label="Search products">

​        <uui-icon name="icon-search" slot="prepend"></uui-icon>

​        ${this._searchTerm

​         ? html`<uui-button slot="append" compact look="secondary" label="Clear" @click=${this._handleSearchClear}>

​           <uui-icon name="icon-wrong"></uui-icon>

​          </uui-button>`

​         : ""}

​       </uui-input>

​      </div>

            <div class="filter-dropdowns">

​       <uui-select label="Product Type" .options=${this._getProductTypeOptions()} @change=${this._handleProductTypeChange}></uui-select>

​       <uui-select label="Category" .options=${this._getCategoryOptions()} @change=${this._handleCategoryChange}></uui-select>

​       <uui-select label="Availability" .options=${this._getAvailabilityOptions()} @change=${this._handleAvailabilityChange}></uui-select>

​       <uui-select label="Stock Status" .options=${this._getStockStatusOptions()} @change=${this._handleStockStatusChange}></uui-select>

​      </div>

​     </div>

​     ${this._renderProductsContent()}

​    </div>

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

### 3.2 Create Products Table Element

File: src/Merchello/Client/src/products/components/product-table.element.ts

import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";

import { customElement, property } from "@umbraco-cms/backoffice/external/lit";

import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";

import type { ProductListItemDto, ProductColumnKey } from "@products/types/product.types.js";

import { PRODUCT_COLUMN_LABELS, DEFAULT_PRODUCT_COLUMNS } from "@products/types/product.types.js";

import { formatCurrency } from "@shared/utils/formatting.js";

import { getProductDetailHref } from "@shared/utils/navigation.js";

import { badgeStyles } from "@shared/styles/badge.styles.js";

export interface ProductClickEventDetail {

 productId: string;

 product: ProductListItemDto;

}

export interface ProductSelectionChangeEventDetail {

 selectedIds: string[];

}

@customElement("merchello-product-table")

export class MerchelloProductTableElement extends UmbElementMixin(LitElement) {

 @property({ type: Array }) products: ProductListItemDto[] = [];

 @property({ type: Array }) columns: ProductColumnKey[] = [...DEFAULT_PRODUCT_COLUMNS];

 @property({ type: Boolean }) selectable = false;

 @property({ type: Array }) selectedIds: string[] = [];

 @property({ type: Boolean }) clickable = true;

 private _getEffectiveColumns(): ProductColumnKey[] {

  const cols = [...this.columns];

  if (!cols.includes("rootName")) cols.unshift("rootName");

  if (this.selectable && !cols.includes("select")) cols.unshift("select");

  return cols;

 }

 private _handleSelectAll(e: Event): void {

  const checked = (e.target as HTMLInputElement).checked;

  const newSelection = checked ? this.products.map((p) => p.id) : [];

  this._dispatchSelectionChange(newSelection);

 }

 private _handleSelectProduct(id: string, e: Event): void {

  e.stopPropagation();

  const checked = (e.target as HTMLInputElement).checked;

  const newSelection = checked

   ? [...this.selectedIds, id]

   : this.selectedIds.filter((selectedId) => selectedId !== id);

  this._dispatchSelectionChange(newSelection);

 }

 private _dispatchSelectionChange(selectedIds: string[]): void {

  this.dispatchEvent(new CustomEvent("selection-change", {

   detail: { selectedIds } as ProductSelectionChangeEventDetail,

   bubbles: true,

   composed: true,

  }));

 }

 private _handleRowClick(product: ProductListItemDto): void {

  if (!this.clickable) return;

  this.dispatchEvent(new CustomEvent("product-click", {

   detail: { productId: product.id, product } as ProductClickEventDetail,

   bubbles: true,

   composed: true,

  }));

 }

 private _renderHeaderCell(column: ProductColumnKey): unknown {

  if (column === "select") {

   return html`

​    <uui-table-head-cell class="checkbox-col">

​     <uui-checkbox aria-label="Select all" @change=${this._handleSelectAll}

​      ?checked=${this.selectedIds.length === this.products.length && this.products.length > 0}></uui-checkbox>

​    </uui-table-head-cell>

   `;

  }

  return html`<uui-table-head-cell>${PRODUCT_COLUMN_LABELS[column]}</uui-table-head-cell>`;

 }

 private _renderCell(product: ProductListItemDto, column: ProductColumnKey): unknown {

  switch (column) {

   case "select":

​    return html`

​     <uui-table-cell class="checkbox-col">

​      <uui-checkbox aria-label="Select ${product.rootName}" ?checked=${this.selectedIds.includes(product.id)}

​       @change=${(e: Event) => this._handleSelectProduct(product.id, e)}

​       @click=${(e: Event) => e.stopPropagation()}></uui-checkbox>

​     </uui-table-cell>

​    `;

   case "rootName":

​    return html`<uui-table-cell class="product-name"><a href=${getProductDetailHref(product.id)}>${product.rootName}</a></uui-table-cell>`;

   case "sku":

​    return html`<uui-table-cell>${product.sku ?? "-"}</uui-table-cell>`;

   case "price":

​    return html`<uui-table-cell>${formatCurrency(product.price)}</uui-table-cell>`;

   case "purchaseable":

​    return html`<uui-table-cell><span class="badge ${product.purchaseable ? "badge-positive" : "badge-danger"}">${product.purchaseable ? "Available" : "Unavailable"}</span></uui-table-cell>`;

   case "stock":

​    return html`<uui-table-cell><span class="badge ${this._getStockBadgeClass(product.totalStock)}">${product.totalStock}</span></uui-table-cell>`;

   case "variants":

​    return html`<uui-table-cell><span class="badge badge-default">${product.variantCount}</span></uui-table-cell>`;

   default:

​    return nothing;

  }

 }

 private _getStockBadgeClass(stock: number): string {

  if (stock <= 0) return "badge-danger";

  if (stock <= 10) return "badge-warning";

  return "badge-positive";

 }

 private _renderRow(product: ProductListItemDto): unknown {

  const cols = this._getEffectiveColumns();

  return html`

   <uui-table-row class=${this.clickable ? "clickable" : ""} @click=${() => this._handleRowClick(product)}>

​    ${cols.map((col) => this._renderCell(product, col))}

   </uui-table-row>

  `;

 }

 render() {

  const cols = this._getEffectiveColumns();

  return html`

      <div class="table-container">

​    <uui-table class="product-table">

​     <uui-table-head>${cols.map((col) => this._renderHeaderCell(col))}</uui-table-head>

​     ${this.products.map((product) => this._renderRow(product))}

​    </uui-table>

   </div>

  `;

 }

 static styles = [

  badgeStyles,

  css`

   :host { display: block; }

   .table-container { overflow-x: auto; background: var(--uui-color-surface); border: 1px solid var(--uui-color-border); border-radius: var(--uui-border-radius); }

   .product-table { width: 100%; }

   uui-table-head-cell, uui-table-cell { white-space: nowrap; }

   uui-table-row.clickable { cursor: pointer; }

   uui-table-row.clickable:hover { background: var(--uui-color-surface-emphasis); }

   .checkbox-col { width: 40px; }

   .product-name a { font-weight: 500; color: var(--uui-color-interactive); text-decoration: none; }

   .product-name a:hover { text-decoration: underline; }

  `,

 ];

}

export default MerchelloProductTableElement;

declare global {

 interface HTMLElementTagNameMap {

  "merchello-product-table": MerchelloProductTableElement;

 }

}

------

## Stage 4: Manifest Updates and Navigation

### 4.1 Update Products Manifest

File: src/Merchello/Client/src/products/manifest.ts

export const manifests: Array<UmbExtensionManifest> = [

 {

  type: "workspace",

  kind: "default",

  alias: "Merchello.Products.Workspace",

  name: "Merchello Products Workspace",

  meta: {

   entityType: "merchello-products",

   headline: "Products",

  },

 },

 {

  type: "workspaceView",

  alias: "Merchello.Products.Workspace.View",

  name: "Merchello Products View",

  js: () => import("./components/products-list.element.js"),

  weight: 100,

  meta: {

   label: "Products",

   pathname: "products",

   icon: "icon-box",

  },

  conditions: [

   {

​    alias: "Umb.Condition.WorkspaceAlias",

​    match: "Merchello.Products.Workspace",

   },

  ],

 },

];

### 4.2 Add Navigation Utilities

Add to src/Merchello/Client/src/shared/utils/navigation.ts:

export const PRODUCT_ENTITY_TYPE = "merchello-product";

export function getProductDetailHref(productId: string): string {

 return getMerchelloWorkspaceHref(PRODUCT_ENTITY_TYPE, `edit/${productId}`);

}

export function navigateToProductDetail(productId: string): void {

 navigateToMerchelloWorkspace(PRODUCT_ENTITY_TYPE, `edit/${productId}`);

}

------

## Testing Checklist

### Stage 1 (Backend)

- [ ] DTOs compile without errors

- [ ] API responds to GET /umbraco/api/v1/products

- [ ] Filter parameters work correctly

- [ ] Pagination returns correct counts

### Stage 2 (Frontend Types)

- [ ] Types compile without errors

- [ ] API methods added to merchello-api.ts

- [ ] Build completes successfully

### Stage 3 (Components)

- [ ] Products list renders in workspace

- [ ] Search filters products correctly

- [ ] Dropdown filters work

- [ ] Pagination navigates between pages

- [ ] Multi-select checkboxes function

- [ ] Loading/error/empty states display correctly

### Stage 4 (Integration)

- [ ] Clicking "Products" in tree opens products list

- [ ] Product rows are clickable

- [ ] Build and hot-reload work correctly

------

## Column Reference

| Column    | Field        | Badge Style                           |
| :-------- | :----------- | :------------------------------------ |
| Product   | rootName     | Link to detail                        |
| SKU       | sku          | Plain text                            |
| Price     | price        | Formatted currency                    |
| Available | purchaseable | Green/Red                             |
| Stock     | totalStock   | Green (>10) / Yellow (1-10) / Red (0) |
| Variants  | variantCount | Default badge                         |

------

## Filter Reference

| Filter       | API Parameter | Options                                |
| :----------- | :------------ | :------------------------------------- |
| Product Type | productTypeId | Dynamic from /products/types           |
| Category     | categoryId    | Dynamic from /products/categories      |
| Availability | availability  | All, Available, Unavailable            |
| Stock Status | stockStatus   | All, In Stock, Low Stock, Out of Stock |

