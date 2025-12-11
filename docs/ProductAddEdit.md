# Product Add/Edit View - Implementation Guide

## Overview

This document outlines the staged implementation plan for the Merchello Product Add/Edit view. The view will be a complex, tabbed interface similar to the Warehouse Detail view, supporting full product lifecycle management including variants, options, media, and inventory.



## Architecture Summary

### Data Model Hierarchy

```
ProductRoot (Container)
├── RootName, RootImages, RootUrl
├── TaxGroup, ProductType, Categories
├── ProductOptions[] (generates variants when IsVariant=true)
├── IsDigitalProduct (skips shipping requirements)
├── DefaultPackageConfigurations[] (default shipping packages)
└── Products[] (Variants)
    ├── Default (bool - one variant is the default)
    ├── Name, SKU, GTIN, Price, CostOfGoods
    ├── Images[], Description
    ├── HsCode (customs/tariff classification)
    ├── PackageConfigurations[] (shipping packages, inherits from root if empty)
    ├── SEO (MetaDescription, PageTitle, NoIndex)
    ├── ShoppingFeed fields
    └── ProductWarehouses[] (stock per warehouse)
```

### Tab Structure

| Tab          | Visible When       | Purpose                                                |
| ------------ | ------------------ | ------------------------------------------------------ |
| **Details**  | Always             | Core product info, images, pricing, availability       |
| **Variants** | `variantCount > 1` | List of product variants with inline default selection |
| **Options**  | Always             | Option builder that generates variants                 |

------

## Stage 1: Backend - MerchelloSettings & Configuration

### 1.1 Update MerchelloSettings.cs

**File:** `src/Merchello.Core/Shared/Models/MerchelloSettings.cs`

 

Add the following properties:



```csharp
/// <summary>
/// Available option type aliases for product options.
/// These define what kind of attribute the option represents.
/// Examples: "colour", "size", "material", "pattern"
/// </summary>
public string[] OptionTypeAliases { get; set; } = ["colour", "size", "material", "pattern"];

/// <summary>
/// Available option UI aliases that control how options are displayed to customers.
/// - "dropdown": Standard select dropdown
/// - "colour": Color swatches with hex values
/// - "image": Image/media selection for each value
/// </summary>
public string[] OptionUiAliases { get; set; } = ["dropdown", "colour", "image"];
```

### 1.2 Create Settings Endpoint

**File:** `src/Merchello/Controllers/SettingsApiController.cs`

 

Add endpoint to expose settings to frontend:



```csharp
[HttpGet("settings/product-options")]
[ProducesResponseType<ProductOptionSettingsDto>(StatusCodes.Status200OK)]
public ProductOptionSettingsDto GetProductOptionSettings()
{
    return new ProductOptionSettingsDto
    {
        OptionTypeAliases = _settings.OptionTypeAliases,
        OptionUiAliases = _settings.OptionUiAliases
    };
}
```

**DTO:**



```csharp
public class ProductOptionSettingsDto
{
    public string[] OptionTypeAliases { get; set; } = [];
    public string[] OptionUiAliases { get; set; } = [];
}
```

------

## Stage 2: Backend - Product API Endpoints

### 2.1 DTOs for Product Detail

**File:** `src/Merchello.Core/Products/Dtos/ProductDetailDtos.cs`



```csharp
// Full product root with all variants and options
public class ProductRootDetailDto
{
    public Guid Id { get; set; }
    public string RootName { get; set; } = string.Empty;
    public List<Guid> RootImages { get; set; } = [];
    public string? RootUrl { get; set; }
    public List<string> SellingPoints { get; set; } = [];
    public List<string> Videos { get; set; } = [];
    public string? GoogleShoppingFeedCategory { get; set; }
    public bool IsDigitalProduct { get; set; }
    public List<ProductPackageDto> DefaultPackageConfigurations { get; set; } = [];
    
    // Related entities
    public Guid TaxGroupId { get; set; }
    public string? TaxGroupName { get; set; }
    public Guid ProductTypeId { get; set; }
    public string? ProductTypeName { get; set; }
    public List<Guid> CategoryIds { get; set; } = [];
    public List<Guid> WarehouseIds { get; set; } = [];
    
    // Options and variants
    public List<ProductOptionDto> ProductOptions { get; set; } = [];
    public List<ProductVariantDto> Variants { get; set; } = [];
}

public class ProductOptionDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Alias { get; set; }
    public int SortOrder { get; set; }
    public string? OptionTypeAlias { get; set; }
    public string? OptionUiAlias { get; set; }
    public bool IsVariant { get; set; }
    public List<ProductOptionValueDto> Values { get; set; } = [];
}

public class ProductOptionValueDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public int SortOrder { get; set; }
    public string? HexValue { get; set; }
    public Guid? MediaKey { get; set; }
    public decimal PriceAdjustment { get; set; }
    public decimal CostAdjustment { get; set; }
    public string? SkuSuffix { get; set; }
}

public class ProductVariantDto
{
    public Guid Id { get; set; }
    public Guid ProductRootId { get; set; }
    public bool Default { get; set; }
    public string? Name { get; set; }
    public string? Sku { get; set; }
    public string? Gtin { get; set; }
    public string? SupplierSku { get; set; }
    public decimal Price { get; set; }
    public decimal CostOfGoods { get; set; }
    public bool OnSale { get; set; }
    public decimal? PreviousPrice { get; set; }
    public bool AvailableForPurchase { get; set; }
    public bool CanPurchase { get; set; }
    public List<Guid> Images { get; set; } = [];
    public string? Description { get; set; }
    public bool ExcludeRootProductImages { get; set; }
    public string? Url { get; set; }
    public string? VariantOptionsKey { get; set; }

    // Shipping
    public string? HsCode { get; set; }  // Customs/tariff classification
    public List<ProductPackageDto> PackageConfigurations { get; set; } = [];  // Empty = inherit from root

    // SEO
    public string? MetaDescription { get; set; }
    public string? PageTitle { get; set; }
    public bool NoIndex { get; set; }
    public string? OpenGraphImage { get; set; }
    
    // Shopping Feed
    public string? ShoppingFeedTitle { get; set; }
    public string? ShoppingFeedDescription { get; set; }
    public string? ShoppingFeedColour { get; set; }
    public string? ShoppingFeedMaterial { get; set; }
    public string? ShoppingFeedSize { get; set; }
    public bool ExcludeFromCustomLabels { get; set; }
    public bool RemoveFromFeed { get; set; }
    
    // Stock (aggregated from ProductWarehouses)
    public int TotalStock { get; set; }
    public List<VariantWarehouseStockDto> WarehouseStock { get; set; } = [];
}

public class VariantWarehouseStockDto
{
    public Guid WarehouseId { get; set; }
    public string? WarehouseName { get; set; }
    public int Stock { get; set; }
    public int? ReorderPoint { get; set; }
    public int? ReorderQuantity { get; set; }
    public bool TrackStock { get; set; }
}

public class ProductPackageDto
{
    public decimal Weight { get; set; }      // Weight in kg
    public decimal? LengthCm { get; set; }   // Length in cm
    public decimal? WidthCm { get; set; }    // Width in cm
    public decimal? HeightCm { get; set; }   // Height in cm
}
```

### 2.2 Create/Update Request DTOs

```csharp
public class CreateProductRootRequest
{
    public string RootName { get; set; } = string.Empty;
    public Guid TaxGroupId { get; set; }
    public Guid ProductTypeId { get; set; }
    public List<Guid>? CategoryIds { get; set; }
    public List<Guid>? WarehouseIds { get; set; }
    public List<Guid>? RootImages { get; set; }
    public bool IsDigitalProduct { get; set; }
    
    // Initial default variant
    public CreateVariantRequest DefaultVariant { get; set; } = new();
}

public class UpdateProductRootRequest
{
    public string? RootName { get; set; }
    public List<Guid>? RootImages { get; set; }
    public string? RootUrl { get; set; }
    public List<string>? SellingPoints { get; set; }
    public List<string>? Videos { get; set; }
    public string? GoogleShoppingFeedCategory { get; set; }
    public bool? IsDigitalProduct { get; set; }
    public List<ProductPackageDto>? DefaultPackageConfigurations { get; set; }
    public Guid? TaxGroupId { get; set; }
    public Guid? ProductTypeId { get; set; }
    public List<Guid>? CategoryIds { get; set; }
    public List<Guid>? WarehouseIds { get; set; }
}

public class CreateVariantRequest
{
    public string? Name { get; set; }
    public string? Sku { get; set; }
    public decimal Price { get; set; }
    public decimal CostOfGoods { get; set; }
    // ... other variant fields
}

public class UpdateVariantRequest
{
    // All variant fields as nullable for partial updates
    public bool? Default { get; set; }
    public string? Name { get; set; }
    public string? Sku { get; set; }
    public decimal? Price { get; set; }
    public string? HsCode { get; set; }  // Customs/tariff classification
    public List<ProductPackageDto>? PackageConfigurations { get; set; }  // Shipping packages
    // ... etc
}

public class SaveProductOptionRequest
{
    public Guid? Id { get; set; } // null for new
    public string Name { get; set; } = string.Empty;
    public string? Alias { get; set; }
    public int SortOrder { get; set; }
    public string? OptionTypeAlias { get; set; }
    public string? OptionUiAlias { get; set; }
    public bool IsVariant { get; set; }
    public List<SaveOptionValueRequest> Values { get; set; } = [];
}

public class SaveOptionValueRequest
{
    public Guid? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string? HexValue { get; set; }
    public Guid? MediaKey { get; set; }
    public decimal PriceAdjustment { get; set; }
    public decimal CostAdjustment { get; set; }
    public string? SkuSuffix { get; set; }
}
```

### 2.3 API Controller Endpoints

**File:** `src/Merchello/Controllers/ProductsApiController.cs`

 

Add these endpoints:



```csharp
// GET /products/{id} - Get full product root with variants
[HttpGet("products/{id:guid}")]
[ProducesResponseType<ProductRootDetailDto>(StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
public async Task<IActionResult> GetProductDetail(Guid id)

// POST /products - Create new product root with default variant
[HttpPost("products")]
[ProducesResponseType<ProductRootDetailDto>(StatusCodes.Status201Created)]
public async Task<IActionResult> CreateProduct([FromBody] CreateProductRootRequest request)

// PUT /products/{id} - Update product root
[HttpPut("products/{id:guid}")]
[ProducesResponseType<ProductRootDetailDto>(StatusCodes.Status200OK)]
public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] UpdateProductRootRequest request)

// DELETE /products/{id} - Delete product root and all variants
[HttpDelete("products/{id:guid}")]
[ProducesResponseType(StatusCodes.Status204NoContent)]
public async Task<IActionResult> DeleteProduct(Guid id)

// --- Variant Endpoints ---

// GET /products/{productRootId}/variants/{variantId}
[HttpGet("products/{productRootId:guid}/variants/{variantId:guid}")]
[ProducesResponseType<ProductVariantDto>(StatusCodes.Status200OK)]
public async Task<IActionResult> GetVariant(Guid productRootId, Guid variantId)

// PUT /products/{productRootId}/variants/{variantId}
[HttpPut("products/{productRootId:guid}/variants/{variantId:guid}")]
[ProducesResponseType<ProductVariantDto>(StatusCodes.Status200OK)]
public async Task<IActionResult> UpdateVariant(Guid productRootId, Guid variantId, [FromBody] UpdateVariantRequest request)

// PUT /products/{productRootId}/variants/{variantId}/set-default
[HttpPut("products/{productRootId:guid}/variants/{variantId:guid}/set-default")]
[ProducesResponseType(StatusCodes.Status204NoContent)]
public async Task<IActionResult> SetDefaultVariant(Guid productRootId, Guid variantId)

// --- Options Endpoints ---

// PUT /products/{productRootId}/options - Save all options (replaces existing)
[HttpPut("products/{productRootId:guid}/options")]
[ProducesResponseType<List<ProductOptionDto>>(StatusCodes.Status200OK)]
public async Task<IActionResult> SaveOptions(Guid productRootId, [FromBody] List<SaveProductOptionRequest> options)

// POST /products/{productRootId}/options/regenerate-variants
[HttpPost("products/{productRootId:guid}/options/regenerate-variants")]
[ProducesResponseType<List<ProductVariantDto>>(StatusCodes.Status200OK)]
public async Task<IActionResult> RegenerateVariants(Guid productRootId)
```

### 2.4 Service Layer Updates

**File:** `src/Merchello.Core/Products/Services/ProductService.cs`

 

Add methods:



```csharp
Task<ProductRoot?> GetProductRootWithDetails(Guid id);
Task<ProductRoot> CreateProductRoot(CreateProductRootRequest request);
Task<ProductRoot> UpdateProductRoot(Guid id, UpdateProductRootRequest request);
Task DeleteProductRoot(Guid id);

Task<Product?> GetVariant(Guid productRootId, Guid variantId);
Task<Product> UpdateVariant(Guid productRootId, Guid variantId, UpdateVariantRequest request);
Task SetDefaultVariant(Guid productRootId, Guid variantId);

Task<List<ProductOption>> SaveProductOptions(Guid productRootId, List<SaveProductOptionRequest> options);
Task<List<Product>> RegenerateVariants(Guid productRootId);
```

------

## Stage 3: Frontend - TypeScript Types

### 3.1 Update Product Types

**File:** `src/Merchello/Client/src/products/types/product.types.ts`

 

Add/update the following types:



```typescript
// Full product root for editing
export interface ProductRootDetailDto {
  id: string;
  rootName: string;
  rootImages: string[];
  rootUrl: string | null;
  sellingPoints: string[];
  videos: string[];
  googleShoppingFeedCategory: string | null;
  isDigitalProduct: boolean;
  defaultPackageConfigurations: ProductPackageDto[];
  
  taxGroupId: string;
  taxGroupName: string | null;
  productTypeId: string;
  productTypeName: string | null;
  categoryIds: string[];
  warehouseIds: string[];
  
  productOptions: ProductOptionDto[];
  variants: ProductVariantDto[];
}

export interface ProductOptionDto {
  id: string;
  name: string;
  alias: string | null;
  sortOrder: number;
  optionTypeAlias: string | null;
  optionUiAlias: string | null;
  isVariant: boolean;
  values: ProductOptionValueDto[];
}

export interface ProductOptionValueDto {
  id: string;
  name: string;
  fullName: string | null;
  sortOrder: number;
  hexValue: string | null;
  mediaKey: string | null;
  priceAdjustment: number;
  costAdjustment: number;
  skuSuffix: string | null;
}

export interface ProductVariantDto {
  id: string;
  productRootId: string;
  default: boolean;
  name: string | null;
  sku: string | null;
  gtin: string | null;
  supplierSku: string | null;
  price: number;
  costOfGoods: number;
  onSale: boolean;
  previousPrice: number | null;
  availableForPurchase: boolean;
  canPurchase: boolean;
  images: string[];
  description: string | null;
  excludeRootProductImages: boolean;
  url: string | null;
  variantOptionsKey: string | null;

  // Shipping
  hsCode: string | null;
  packageConfigurations: ProductPackageDto[];

  // SEO
  metaDescription: string | null;
  pageTitle: string | null;
  noIndex: boolean;
  openGraphImage: string | null;
  
  // Shopping Feed
  shoppingFeedTitle: string | null;
  shoppingFeedDescription: string | null;
  shoppingFeedColour: string | null;
  shoppingFeedMaterial: string | null;
  shoppingFeedSize: string | null;
  excludeFromCustomLabels: boolean;
  removeFromFeed: boolean;
  
  // Stock
  totalStock: number;
  warehouseStock: VariantWarehouseStockDto[];
}

export interface VariantWarehouseStockDto {
  warehouseId: string;
  warehouseName: string | null;
  stock: number;
  reorderPoint: number | null;
  reorderQuantity: number | null;
  trackStock: boolean;
}

export interface ProductPackageDto {
  weight: number;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
}

export interface ProductOptionSettingsDto {
  optionTypeAliases: string[];
  optionUiAliases: string[];
}

// Request types
export interface CreateProductRootRequest {
  rootName: string;
  taxGroupId: string;
  productTypeId: string;
  categoryIds?: string[];
  warehouseIds?: string[];
  rootImages?: string[];
  isDigitalProduct: boolean;
  defaultVariant: CreateVariantRequest;
}

export interface CreateVariantRequest {
  name?: string;
  sku?: string;
  price: number;
  costOfGoods: number;
}

export interface UpdateProductRootRequest {
  rootName?: string;
  rootImages?: string[];
  rootUrl?: string;
  sellingPoints?: string[];
  videos?: string[];
  googleShoppingFeedCategory?: string;
  isDigitalProduct?: boolean;
  defaultPackageConfigurations?: ProductPackageDto[];
  taxGroupId?: string;
  productTypeId?: string;
  categoryIds?: string[];
  warehouseIds?: string[];
}

export interface UpdateVariantRequest {
  default?: boolean;
  name?: string;
  sku?: string;
  gtin?: string;
  supplierSku?: string;
  price?: number;
  costOfGoods?: number;
  onSale?: boolean;
  previousPrice?: number;
  availableForPurchase?: boolean;
  canPurchase?: boolean;
  images?: string[];
  description?: string;
  excludeRootProductImages?: boolean;
  url?: string;
  hsCode?: string;
  packageConfigurations?: ProductPackageDto[];
  metaDescription?: string;
  pageTitle?: string;
  noIndex?: boolean;
  openGraphImage?: string;
  shoppingFeedTitle?: string;
  shoppingFeedDescription?: string;
  shoppingFeedColour?: string;
  shoppingFeedMaterial?: string;
  shoppingFeedSize?: string;
  excludeFromCustomLabels?: boolean;
  removeFromFeed?: boolean;
}

export interface SaveProductOptionRequest {
  id?: string;
  name: string;
  alias?: string;
  sortOrder: number;
  optionTypeAlias?: string;
  optionUiAlias?: string;
  isVariant: boolean;
  values: SaveOptionValueRequest[];
}

export interface SaveOptionValueRequest {
  id?: string;
  name: string;
  sortOrder: number;
  hexValue?: string;
  mediaKey?: string;
  priceAdjustment: number;
  costAdjustment: number;
  skuSuffix?: string;
}
```

------

## Stage 4: Frontend - API Methods

### 4.1 Update API Service

**File:** `src/Merchello/Client/src/api/merchello-api.ts`

 

Add these methods to the MerchelloApi object:



```typescript
// Product Settings
async getProductOptionSettings(): Promise<{ data?: ProductOptionSettingsDto; error?: Error }> {
  return apiGet<ProductOptionSettingsDto>('settings/product-options');
}

// Product CRUD
async getProductDetail(id: string): Promise<{ data?: ProductRootDetailDto; error?: Error }> {
  return apiGet<ProductRootDetailDto>(`products/${id}`);
}

async createProduct(request: CreateProductRootRequest): Promise<{ data?: ProductRootDetailDto; error?: Error }> {
  return apiPost<ProductRootDetailDto>('products', request);
}

async updateProduct(id: string, request: UpdateProductRootRequest): Promise<{ data?: ProductRootDetailDto; error?: Error }> {
  return apiPut<ProductRootDetailDto>(`products/${id}`, request);
}

async deleteProduct(id: string): Promise<{ error?: Error }> {
  return apiDelete(`products/${id}`);
}

// Variant operations
async getVariant(productRootId: string, variantId: string): Promise<{ data?: ProductVariantDto; error?: Error }> {
  return apiGet<ProductVariantDto>(`products/${productRootId}/variants/${variantId}`);
}

async updateVariant(productRootId: string, variantId: string, request: UpdateVariantRequest): Promise<{ data?: ProductVariantDto; error?: Error }> {
  return apiPut<ProductVariantDto>(`products/${productRootId}/variants/${variantId}`, request);
}

async setDefaultVariant(productRootId: string, variantId: string): Promise<{ error?: Error }> {
  return apiPut(`products/${productRootId}/variants/${variantId}/set-default`);
}

// Options operations
async saveProductOptions(productRootId: string, options: SaveProductOptionRequest[]): Promise<{ data?: ProductOptionDto[]; error?: Error }> {
  return apiPut<ProductOptionDto[]>(`products/${productRootId}/options`, options);
}

async regenerateVariants(productRootId: string): Promise<{ data?: ProductVariantDto[]; error?: Error }> {
  return apiPost<ProductVariantDto[]>(`products/${productRootId}/options/regenerate-variants`);
}
```

------

## Stage 5: Frontend - File Structure

### 5.1 Create Directory Structure

```
src/Merchello/Client/src/products/
├── components/
│   ├── product-detail.element.ts      # Main tabbed view (REWRITE)
│   ├── product-table.element.ts       # Existing
│   ├── products-list.element.ts       # Existing
│   └── option-value-editor.element.ts # NEW: Inline value editor
├── modals/
│   ├── create-product-modal.element.ts    # Existing
│   ├── create-product-modal.token.ts      # Existing
│   ├── variant-detail-modal.element.ts    # NEW: Full variant editor
│   ├── variant-detail-modal.token.ts      # NEW
│   ├── option-editor-modal.element.ts     # NEW: Single option editor
│   └── option-editor-modal.token.ts       # NEW
├── contexts/
│   └── product-detail-workspace.context.ts  # UPDATE
├── types/
│   └── product.types.ts                     # UPDATE (done in Stage 3)
└── manifest.ts                              # UPDATE
```

------

## Stage 6: Frontend - Workspace Context

### 6.1 Update Workspace Context

**File:** `src/Merchello/Client/src/products/contexts/product-detail-workspace.context.ts`



```typescript
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import { UMB_WORKSPACE_CONTEXT, UmbWorkspaceRouteManager } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState } from "@umbraco-cms/backoffice/observable-api";
import type { ProductRootDetailDto } from "@products/types/product.types.js";
import { MerchelloApi } from "@api/merchello-api.js";

export class MerchelloProductDetailWorkspaceContext extends UmbControllerBase implements UmbRoutableWorkspaceContext {
  readonly workspaceAlias = "Merchello.Product.Detail.Workspace";
  readonly routes: UmbWorkspaceRouteManager;

  #productRootId?: string;
  #isNew = false;
  #product = new UmbObjectState<ProductRootDetailDto | undefined>(undefined);
  readonly product = this.#product.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());
    this.routes = new UmbWorkspaceRouteManager(host);
    this.provideContext(UMB_WORKSPACE_CONTEXT, this);

    this.routes.setRoutes([
      {
        path: "create",
        component: () => import("@products/components/product-detail.element.js"),
        setup: () => {
          this.#isNew = true;
          this.#product.setValue(this._createEmptyProduct());
        },
      },
      {
        path: "edit/:id",
        component: () => import("@products/components/product-detail.element.js"),
        setup: (_component, info) => {
          this.#isNew = false;
          const id = info.match.params.id;
          this.load(id);
        },
      },
    ]);
  }

  get isNew(): boolean {
    return this.#isNew;
  }

  getEntityType(): string {
    return "merchello-product";
  }

  getUnique(): string | undefined {
    return this.#productRootId;
  }

  private _createEmptyProduct(): ProductRootDetailDto {
    return {
      id: "",
      rootName: "",
      rootImages: [],
      rootUrl: null,
      sellingPoints: [],
      videos: [],
      googleShoppingFeedCategory: null,
      isDigitalProduct: false,
      defaultPackageConfigurations: [],
      taxGroupId: "",
      taxGroupName: null,
      productTypeId: "",
      productTypeName: null,
      categoryIds: [],
      warehouseIds: [],
      productOptions: [],
      variants: [],
    };
  }

  async load(unique: string): Promise<void> {
    this.#productRootId = unique;
    const { data, error } = await MerchelloApi.getProductDetail(unique);
    if (data) {
      this.#product.setValue(data);
    }
  }

  updateProduct(product: ProductRootDetailDto): void {
    this.#product.setValue(product);
    if (product.id && this.#isNew) {
      this.#productRootId = product.id;
      this.#isNew = false;
    }
  }

  async reload(): Promise<void> {
    if (this.#productRootId) {
      await this.load(this.#productRootId);
    }
  }
}

export { MerchelloProductDetailWorkspaceContext as api };
```

------

## Stage 7: Frontend - Main Product Detail View

### 7.1 Product Detail Element

**File:** `src/Merchello/Client/src/products/components/product-detail.element.ts`

 

This is a large component following the warehouse-detail pattern. Key sections:



```typescript
import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type { MerchelloProductDetailWorkspaceContext } from "@products/contexts/product-detail-workspace.context.js";
import type { 
  ProductRootDetailDto, 
  ProductOptionDto, 
  ProductVariantDto,
  ProductOptionSettingsDto 
} from "@products/types/product.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { MERCHELLO_VARIANT_DETAIL_MODAL } from "@products/modals/variant-detail-modal.token.js";
import { badgeStyles } from "@shared/styles/badge.styles.js";

type TabId = "details" | "variants" | "options";

@customElement("merchello-product-detail")
export class MerchelloProductDetailElement extends UmbElementMixin(LitElement) {
  @state() private _product: ProductRootDetailDto | null = null;
  @state() private _isLoading = true;
  @state() private _isSaving = false;
  @state() private _errorMessage: string | null = null;
  @state() private _activeTab: TabId = "details";
  @state() private _optionSettings: ProductOptionSettingsDto | null = null;

  // Form state
  @state() private _formData: Partial<ProductRootDetailDto> = {};

  // Reference data
  @state() private _taxGroups: Array<{ id: string; name: string }> = [];
  @state() private _productTypes: Array<{ id: string; name: string }> = [];
  @state() private _categories: Array<{ id: string; name: string }> = [];
  @state() private _warehouses: Array<{ id: string; name: string }> = [];

  #workspaceContext?: MerchelloProductDetailWorkspaceContext;
  #modalManager?: UmbModalManagerContext;

  constructor() {
    super();
    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloProductDetailWorkspaceContext;
      if (this.#workspaceContext) {
        this.observe(this.#workspaceContext.product, (product) => {
          this._product = product ?? null;
          if (product) {
            this._formData = { ...product };
          }
          this._isLoading = !product;
        });
      }
    });
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._loadReferenceData();
  }

  private async _loadReferenceData(): Promise<void> {
    // Load tax groups, product types, categories, warehouses, and option settings
    const [taxGroups, productTypes, categories, warehouses, optionSettings] = await Promise.all([
      MerchelloApi.getTaxGroups(),
      MerchelloApi.getProductTypes(),
      MerchelloApi.getProductCategories(),
      MerchelloApi.getWarehouses(),
      MerchelloApi.getProductOptionSettings(),
    ]);
    
    if (taxGroups.data) this._taxGroups = taxGroups.data;
    if (productTypes.data) this._productTypes = productTypes.data;
    if (categories.data) this._categories = categories.data;
    if (warehouses.data) this._warehouses = warehouses.data;
    if (optionSettings.data) this._optionSettings = optionSettings.data;
  }

  // Tab rendering with warnings
  private _renderTabs(): unknown {
    const variantCount = this._product?.variants.length ?? 0;
    const optionCount = this._product?.productOptions.length ?? 0;
    const hasVariantWarnings = this._getVariantWarnings().length > 0;
    const hasOptionWarnings = optionCount === 0 && variantCount <= 1;

    return html`
      <uui-tab-group>
        <uui-tab
          label="Details"
          ?active=${this._activeTab === "details"}
          @click=${() => this._activeTab = "details"}>
          Details
        </uui-tab>
        
        ${variantCount > 1 ? html`
          <uui-tab
            label="Variants"
            ?active=${this._activeTab === "variants"}
            @click=${() => this._activeTab = "variants"}>
            <span class="tab-label">
              Variants
              ${hasVariantWarnings ? html`<uui-icon name="icon-alert" class="tab-warning"></uui-icon>` : nothing}
              <span class="tab-count">(${variantCount})</span>
            </span>
          </uui-tab>
        ` : nothing}
        
        <uui-tab
          label="Options"
          ?active=${this._activeTab === "options"}
          @click=${() => this._activeTab = "options"}>
          <span class="tab-label">
            Options
            ${hasOptionWarnings ? html`<uui-icon name="icon-alert" class="tab-warning"></uui-icon>` : nothing}
            <span class="tab-count">(${optionCount})</span>
          </span>
        </uui-tab>
      </uui-tab-group>
    `;
  }

  // Details tab - Core product info
  private _renderDetailsTab(): unknown {
    return html`
      <div class="tab-content">
        <!-- Basic Info -->
        <uui-box headline="Basic Information">
          <div class="form-grid">
            <div class="form-field ${this._getValidationClass(this._formData.rootName, true)}">
              <label>Product Name <span class="required">*</span></label>
              <uui-input
                type="text"
                .value=${this._formData.rootName || ""}
                @input=${(e: Event) => this._handleInputChange("rootName", (e.target as HTMLInputElement).value)}
                placeholder="Enter product name">
              </uui-input>
            </div>
            
            <div class="form-field">
              <label>Product Type <span class="required">*</span></label>
              <uui-select
                label="Product Type"
                .options=${this._getProductTypeOptions()}
                @change=${this._handleProductTypeChange}>
              </uui-select>
            </div>
            
            <div class="form-field">
              <label>Tax Group <span class="required">*</span></label>
              <uui-select
                label="Tax Group"
                .options=${this._getTaxGroupOptions()}
                @change=${this._handleTaxGroupChange}>
              </uui-select>
            </div>
            
            <div class="form-field">
              <label>
                <uui-toggle
                  .checked=${this._formData.isDigitalProduct ?? false}
                  @change=${(e: Event) => this._handleToggleChange("isDigitalProduct", (e.target as any).checked)}>
                </uui-toggle>
                Digital Product
              </label>
              <small class="hint">Digital products don't require shipping or warehouse assignment</small>
            </div>
          </div>
        </uui-box>
        
        <!-- Images -->
        <uui-box headline="Product Images">
          <umb-input-rich-media
            .value=${this._getMediaPickerValue()}
            ?multiple=${true}
            @change=${this._handleImagesChange}>
          </umb-input-rich-media>
        </uui-box>
        
        <!-- Categories & Warehouses -->
        <uui-box headline="Organization">
          <div class="form-grid">
            <div class="form-field">
              <label>Categories</label>
              <!-- Multi-select for categories -->
            </div>
            
            ${!this._formData.isDigitalProduct ? html`
              <div class="form-field">
                <label>Warehouses <span class="required">*</span></label>
                <!-- Multi-select for warehouses -->
              </div>
            ` : nothing}
          </div>
        </uui-box>
        
        <!-- Default Variant Pricing (when single variant) -->
        ${(this._product?.variants.length ?? 0) <= 1 ? html`
          <uui-box headline="Pricing & Inventory">
            ${this._renderVariantPricingFields(this._product?.variants[0])}
          </uui-box>
        ` : nothing}
      </div>
    `;
  }

  // Variants tab - List with inline default selection
  private _renderVariantsTab(): unknown {
    const variants = this._product?.variants ?? [];
    
    return html`
      <div class="tab-content">
        <div class="section-header">
          <h3>Product Variants</h3>
          <p class="section-description">
            Click a row to edit variant details. Select a variant as the default using the radio button.
          </p>
        </div>
        
        <div class="table-container">
          <uui-table class="data-table">
            <uui-table-head>
              <uui-table-head-cell style="width: 60px;">Default</uui-table-head-cell>
              <uui-table-head-cell>Variant</uui-table-head-cell>
              <uui-table-head-cell>SKU</uui-table-head-cell>
              <uui-table-head-cell>Price</uui-table-head-cell>
              <uui-table-head-cell>Stock</uui-table-head-cell>
              <uui-table-head-cell>Status</uui-table-head-cell>
            </uui-table-head>
            ${variants.map((variant) => this._renderVariantRow(variant))}
          </uui-table>
        </div>
      </div>
    `;
  }

  private _renderVariantRow(variant: ProductVariantDto): unknown {
    return html`
      <uui-table-row class="clickable" @click=${() => this._openVariantModal(variant)}>
        <uui-table-cell @click=${(e: Event) => e.stopPropagation()}>
          <uui-radio
            .checked=${variant.default}
            @change=${() => this._handleSetDefaultVariant(variant.id)}>
          </uui-radio>
        </uui-table-cell>
        <uui-table-cell>
          <span class="variant-name">${variant.name || "Unnamed"}</span>
        </uui-table-cell>
        <uui-table-cell>${variant.sku || "—"}</uui-table-cell>
        <uui-table-cell>$${variant.price.toFixed(2)}</uui-table-cell>
        <uui-table-cell>
          <span class="badge ${this._getStockBadgeClass(variant.totalStock)}">
            ${variant.totalStock}
          </span>
        </uui-table-cell>
        <uui-table-cell>
          <span class="badge ${variant.availableForPurchase ? "badge-positive" : "badge-danger"}">
            ${variant.availableForPurchase ? "Available" : "Unavailable"}
          </span>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  // Options tab - Option builder
  private _renderOptionsTab(): unknown {
    const options = this._formData.productOptions ?? [];
    const isNew = this.#workspaceContext?.isNew ?? true;
    
    return html`
      <div class="tab-content">
        ${isNew ? html`
          <div class="info-banner warning">
            <uui-icon name="icon-alert"></uui-icon>
            <span>Save the product first before adding options.</span>
          </div>
        ` : nothing}
        
        <div class="section-header">
          <h3>Product Options</h3>
          <uui-button
            look="primary"
            color="positive"
            label="Add Option"
            ?disabled=${isNew}
            @click=${this._addNewOption}>
            Add Option
          </uui-button>
        </div>
        
        <p class="section-description">
          Options with "Generates Variants" enabled will create product variants from the combination of all values.
          Options without this enabled are add-ons that can modify price.
        </p>
        
        ${options.length > 0 ? html`
          <div class="options-list">
            ${options.map((option, index) => this._renderOptionCard(option, index))}
          </div>
        ` : !isNew ? html`
          <div class="empty-state">
            <uui-icon name="icon-layers"></uui-icon>
            <p>No options configured</p>
            <p class="hint">Add options like Size, Color, or Material to create product variants</p>
          </div>
        ` : nothing}
        
        ${options.some(o => o.isVariant) && !isNew ? html`
          <div class="regenerate-section">
            <uui-button
              look="secondary"
              label="Regenerate Variants"
              @click=${this._regenerateVariants}>
              <uui-icon name="icon-sync"></uui-icon>
              Regenerate Variants
            </uui-button>
            <small class="hint">
              This will create new variants based on the current option combinations.
              Existing variant data (pricing, stock) may need to be updated.
            </small>
          </div>
        ` : nothing}
      </div>
    `;
  }

  private _renderOptionCard(option: ProductOptionDto, index: number): unknown {
    return html`
      <uui-box class="option-card">
        <div class="option-header">
          <div class="option-info">
            <strong>${option.name}</strong>
            <span class="badge ${option.isVariant ? "badge-positive" : "badge-default"}">
              ${option.isVariant ? "Generates Variants" : "Add-on"}
            </span>
            ${option.optionUiAlias ? html`
              <span class="badge badge-default">${option.optionUiAlias}</span>
            ` : nothing}
          </div>
          <div class="option-actions">
            <uui-button compact look="secondary" @click=${() => this._editOption(option)}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button compact look="primary" color="danger" @click=${() => this._deleteOption(option.id)}>
              <uui-icon name="icon-trash"></uui-icon>
            </uui-button>
          </div>
        </div>
        
        <div class="option-values">
          ${option.values.map(value => this._renderOptionValue(value, option.optionUiAlias))}
          <uui-button compact look="placeholder" @click=${() => this._addValueToOption(option.id)}>
            <uui-icon name="icon-add"></uui-icon> Add Value
          </uui-button>
        </div>
      </uui-box>
    `;
  }

  private _renderOptionValue(value: ProductOptionValueDto, uiAlias: string | null): unknown {
    return html`
      <div class="option-value-chip">
        ${uiAlias === "colour" && value.hexValue ? html`
          <span class="color-swatch" style="background-color: ${value.hexValue}"></span>
        ` : nothing}
        ${uiAlias === "image" && value.mediaKey ? html`
          <umb-imaging-thumbnail unique=${value.mediaKey} class="value-thumbnail"></umb-imaging-thumbnail>
        ` : nothing}
        <span>${value.name}</span>
        ${value.priceAdjustment !== 0 ? html`
          <span class="price-adjustment">
            ${value.priceAdjustment > 0 ? "+" : ""}$${value.priceAdjustment.toFixed(2)}
          </span>
        ` : nothing}
      </div>
    `;
  }

  // Modal handlers
  private async _openVariantModal(variant: ProductVariantDto): Promise<void> {
    if (!this.#modalManager || !this._product) return;

    const modal = this.#modalManager.open(this, MERCHELLO_VARIANT_DETAIL_MODAL, {
      data: {
        productRootId: this._product.id,
        variant: variant,
        warehouses: this._warehouses,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.saved) {
      this.#workspaceContext?.reload();
    }
  }

  private async _handleSetDefaultVariant(variantId: string): Promise<void> {
    if (!this._product) return;
    
    const { error } = await MerchelloApi.setDefaultVariant(this._product.id, variantId);
    if (!error) {
      this.#workspaceContext?.reload();
    }
  }

  // ... rest of implementation
}
```

------

## Stage 8: Frontend - Variant Detail Modal

### 8.1 Modal Token

**File:** `src/Merchello/Client/src/products/modals/variant-detail-modal.token.ts`



```typescript
import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ProductVariantDto } from "@products/types/product.types.js";

export interface VariantDetailModalData {
  productRootId: string;
  variant: ProductVariantDto;
  warehouses: Array<{ id: string; name: string }>;
}

export interface VariantDetailModalValue {
  saved: boolean;
  variant?: ProductVariantDto;
}

export const MERCHELLO_VARIANT_DETAIL_MODAL = new UmbModalToken<
  VariantDetailModalData,
  VariantDetailModalValue
>("Merchello.VariantDetail.Modal", {
  modal: {
    type: "sidebar",
    size: "large",
  },
});
```

### 8.2 Modal Element

**File:** `src/Merchello/Client/src/products/modals/variant-detail-modal.element.ts`



```typescript
import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { VariantDetailModalData, VariantDetailModalValue } from "./variant-detail-modal.token.js";
import type { ProductVariantDto, UpdateVariantRequest } from "@products/types/product.types.js";
import { MerchelloApi } from "@api/merchello-api.js";

@customElement("merchello-variant-detail-modal")
export class MerchelloVariantDetailModalElement extends UmbModalBaseElement<
  VariantDetailModalData,
  VariantDetailModalValue
> {
  @state() private _formData: Partial<ProductVariantDto> = {};
  @state() private _isSaving = false;
  @state() private _errorMessage: string | null = null;
  @state() private _activeSection: "basic" | "shipping" | "seo" | "feed" | "stock" = "basic";

  connectedCallback(): void {
    super.connectedCallback();
    if (this.data?.variant) {
      this._formData = { ...this.data.variant };
    }
  }

  private async _handleSave(): Promise<void> {
    if (!this.data) return;
    
    this._isSaving = true;
    this._errorMessage = null;

    const request: UpdateVariantRequest = {
      name: this._formData.name,
      sku: this._formData.sku,
      gtin: this._formData.gtin,
      supplierSku: this._formData.supplierSku,
      price: this._formData.price,
      costOfGoods: this._formData.costOfGoods,
      onSale: this._formData.onSale,
      previousPrice: this._formData.previousPrice,
      availableForPurchase: this._formData.availableForPurchase,
      canPurchase: this._formData.canPurchase,
      images: this._formData.images,
      description: this._formData.description,
      excludeRootProductImages: this._formData.excludeRootProductImages,
      url: this._formData.url,
      hsCode: this._formData.hsCode,
      packageConfigurations: this._formData.packageConfigurations,
      metaDescription: this._formData.metaDescription,
      pageTitle: this._formData.pageTitle,
      noIndex: this._formData.noIndex,
      openGraphImage: this._formData.openGraphImage,
      // ... shopping feed fields
    };

    const { data, error } = await MerchelloApi.updateVariant(
      this.data.productRootId,
      this.data.variant.id,
      request
    );

    this._isSaving = false;

    if (error) {
      this._errorMessage = error.message;
      return;
    }

    this.value = { saved: true, variant: data };
    this.modalContext?.submit(this.value);
  }

  render() {
    return html`
      <umb-body-layout headline="Edit Variant: ${this._formData.name || 'Unnamed'}">
        <div class="modal-content">
          <!-- Section Navigation -->
          <div class="section-nav">
            <uui-button
              look=${this._activeSection === "basic" ? "primary" : "secondary"}
              @click=${() => this._activeSection = "basic"}>
              Basic Info
            </uui-button>
            <uui-button
              look=${this._activeSection === "shipping" ? "primary" : "secondary"}
              @click=${() => this._activeSection = "shipping"}>
              Shipping
            </uui-button>
            <uui-button
              look=${this._activeSection === "seo" ? "primary" : "secondary"}
              @click=${() => this._activeSection = "seo"}>
              SEO
            </uui-button>
            <uui-button
              look=${this._activeSection === "feed" ? "primary" : "secondary"}
              @click=${() => this._activeSection = "feed"}>
              Shopping Feed
            </uui-button>
            <uui-button
              look=${this._activeSection === "stock" ? "primary" : "secondary"}
              @click=${() => this._activeSection = "stock"}>
              Stock
            </uui-button>
          </div>

          ${this._errorMessage ? html`
            <div class="error-banner">
              <uui-icon name="icon-alert"></uui-icon>
              ${this._errorMessage}
            </div>
          ` : nothing}

          ${this._renderActiveSection()}
        </div>

        <div slot="actions">
          <uui-button look="secondary" @click=${() => this.modalContext?.reject()}>
            Cancel
          </uui-button>
          <uui-button 
            look="primary" 
            color="positive"
            ?disabled=${this._isSaving}
            @click=${this._handleSave}>
            ${this._isSaving ? "Saving..." : "Save"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  private _renderActiveSection(): unknown {
    switch (this._activeSection) {
      case "basic":
        return this._renderBasicSection();
      case "shipping":
        return this._renderShippingSection();
      case "seo":
        return this._renderSeoSection();
      case "feed":
        return this._renderFeedSection();
      case "stock":
        return this._renderStockSection();
    }
  }

  private _renderBasicSection(): unknown {
    return html`
      <div class="section-content">
        <div class="form-grid">
          <div class="form-field">
            <label>Variant Name</label>
            <uui-input
              .value=${this._formData.name || ""}
              @input=${(e: Event) => this._formData = { ...this._formData, name: (e.target as HTMLInputElement).value }}>
            </uui-input>
          </div>
          
          <div class="form-field">
            <label>SKU</label>
            <uui-input
              .value=${this._formData.sku || ""}
              @input=${(e: Event) => this._formData = { ...this._formData, sku: (e.target as HTMLInputElement).value }}>
            </uui-input>
          </div>
          
          <div class="form-field">
            <label>GTIN/Barcode</label>
            <uui-input
              .value=${this._formData.gtin || ""}
              @input=${(e: Event) => this._formData = { ...this._formData, gtin: (e.target as HTMLInputElement).value }}>
            </uui-input>
          </div>
          
          <div class="form-field">
            <label>Supplier SKU</label>
            <uui-input
              .value=${this._formData.supplierSku || ""}
              @input=${(e: Event) => this._formData = { ...this._formData, supplierSku: (e.target as HTMLInputElement).value }}>
            </uui-input>
          </div>
          
          <div class="form-field">
            <label>Price</label>
            <uui-input
              type="number"
              step="0.01"
              .value=${String(this._formData.price ?? 0)}
              @input=${(e: Event) => this._formData = { ...this._formData, price: parseFloat((e.target as HTMLInputElement).value) || 0 }}>
            </uui-input>
          </div>
          
          <div class="form-field">
            <label>Cost of Goods</label>
            <uui-input
              type="number"
              step="0.01"
              .value=${String(this._formData.costOfGoods ?? 0)}
              @input=${(e: Event) => this._formData = { ...this._formData, costOfGoods: parseFloat((e.target as HTMLInputElement).value) || 0 }}>
            </uui-input>
          </div>
          
          <div class="form-field toggle-field">
            <uui-toggle
              .checked=${this._formData.onSale ?? false}
              @change=${(e: Event) => this._formData = { ...this._formData, onSale: (e.target as any).checked }}>
            </uui-toggle>
            <label>On Sale</label>
          </div>
          
          ${this._formData.onSale ? html`
            <div class="form-field">
              <label>Previous Price (Was)</label>
              <uui-input
                type="number"
                step="0.01"
                .value=${String(this._formData.previousPrice ?? 0)}
                @input=${(e: Event) => this._formData = { ...this._formData, previousPrice: parseFloat((e.target as HTMLInputElement).value) || 0 }}>
              </uui-input>
            </div>
          ` : nothing}
          
          <div class="form-field toggle-field">
            <uui-toggle
              .checked=${this._formData.availableForPurchase ?? true}
              @change=${(e: Event) => this._formData = { ...this._formData, availableForPurchase: (e.target as any).checked }}>
            </uui-toggle>
            <label>Available for Purchase</label>
          </div>
          
          <div class="form-field toggle-field">
            <uui-toggle
              .checked=${this._formData.canPurchase ?? true}
              @change=${(e: Event) => this._formData = { ...this._formData, canPurchase: (e.target as any).checked }}>
            </uui-toggle>
            <label>Can Purchase</label>
          </div>
        </div>
        
        <div class="form-field full-width">
          <label>Description</label>
          <uui-textarea
            .value=${this._formData.description || ""}
            @input=${(e: Event) => this._formData = { ...this._formData, description: (e.target as HTMLTextAreaElement).value }}>
          </uui-textarea>
        </div>
        
        <div class="form-field full-width">
          <label>Variant Images</label>
          <umb-input-rich-media
            .value=${this._getVariantMediaValue()}
            ?multiple=${true}
            @change=${this._handleVariantImagesChange}>
          </umb-input-rich-media>
          
          <div class="toggle-field" style="margin-top: var(--uui-size-space-2);">
            <uui-toggle
              .checked=${this._formData.excludeRootProductImages ?? false}
              @change=${(e: Event) => this._formData = { ...this._formData, excludeRootProductImages: (e.target as any).checked }}>
            </uui-toggle>
            <label>Exclude root product images</label>
          </div>
        </div>
      </div>
    `;
  }

  private _renderShippingSection(): unknown {
    // Note: Shipping packages are now managed via PackageConfigurations
    // which inherit from ProductRoot.DefaultPackageConfigurations unless overridden
    return html`
      <div class="section-content">
        <p class="section-hint">Configure shipping packages and customs classification for this variant.</p>

        <div class="form-field">
          <label>HS Code</label>
          <uui-input
            .value=${this._formData.hsCode ?? ""}
            placeholder="Harmonized System code for customs"
            @input=${(e: Event) => this._formData = { ...this._formData, hsCode: (e.target as HTMLInputElement).value }}>
          </uui-input>
          <small class="hint">Customs/tariff classification code for international shipping</small>
        </div>

        <div class="packages-section">
          <h4>Shipping Packages</h4>
          <p class="hint">
            ${this._formData.packageConfigurations?.length
              ? "This variant uses custom package configurations."
              : "Using default packages from product root. Add packages here to override."}
          </p>
          <!-- Package configuration UI would go here -->
        </div>
      </div>
    `;
  }

  private _renderSeoSection(): unknown {
    return html`
      <div class="section-content">
        <div class="form-grid">
          <div class="form-field full-width">
            <label>Page Title</label>
            <uui-input
              .value=${this._formData.pageTitle || ""}
              @input=${(e: Event) => this._formData = { ...this._formData, pageTitle: (e.target as HTMLInputElement).value }}>
            </uui-input>
          </div>
          
          <div class="form-field full-width">
            <label>Meta Description</label>
            <uui-textarea
              .value=${this._formData.metaDescription || ""}
              @input=${(e: Event) => this._formData = { ...this._formData, metaDescription: (e.target as HTMLTextAreaElement).value }}>
            </uui-textarea>
          </div>
          
          <div class="form-field full-width">
            <label>URL Slug</label>
            <uui-input
              .value=${this._formData.url || ""}
              @input=${(e: Event) => this._formData = { ...this._formData, url: (e.target as HTMLInputElement).value }}>
            </uui-input>
          </div>
          
          <div class="form-field toggle-field">
            <uui-toggle
              .checked=${this._formData.noIndex ?? false}
              @change=${(e: Event) => this._formData = { ...this._formData, noIndex: (e.target as any).checked }}>
            </uui-toggle>
            <label>No Index (hide from search engines)</label>
          </div>
        </div>
      </div>
    `;
  }

  private _renderFeedSection(): unknown {
    return html`
      <div class="section-content">
        <p class="section-hint">Override shopping feed values for this variant.</p>
        
        <div class="form-field toggle-field">
          <uui-toggle
            .checked=${this._formData.removeFromFeed ?? false}
            @change=${(e: Event) => this._formData = { ...this._formData, removeFromFeed: (e.target as any).checked }}>
          </uui-toggle>
          <label>Remove from shopping feed</label>
        </div>
        
        ${!this._formData.removeFromFeed ? html`
          <div class="form-grid">
            <div class="form-field full-width">
              <label>Feed Title</label>
              <uui-input
                .value=${this._formData.shoppingFeedTitle || ""}
                @input=${(e: Event) => this._formData = { ...this._formData, shoppingFeedTitle: (e.target as HTMLInputElement).value }}>
              </uui-input>
            </div>
            
            <div class="form-field full-width">
              <label>Feed Description</label>
              <uui-textarea
                .value=${this._formData.shoppingFeedDescription || ""}
                @input=${(e: Event) => this._formData = { ...this._formData, shoppingFeedDescription: (e.target as HTMLTextAreaElement).value }}>
              </uui-textarea>
            </div>
            
            <div class="form-field">
              <label>Colour</label>
              <uui-input
                .value=${this._formData.shoppingFeedColour || ""}
                @input=${(e: Event) => this._formData = { ...this._formData, shoppingFeedColour: (e.target as HTMLInputElement).value }}>
              </uui-input>
            </div>
            
            <div class="form-field">
              <label>Material</label>
              <uui-input
                .value=${this._formData.shoppingFeedMaterial || ""}
                @input=${(e: Event) => this._formData = { ...this._formData, shoppingFeedMaterial: (e.target as HTMLInputElement).value }}>
              </uui-input>
            </div>
            
            <div class="form-field">
              <label>Size</label>
              <uui-input
                .value=${this._formData.shoppingFeedSize || ""}
                @input=${(e: Event) => this._formData = { ...this._formData, shoppingFeedSize: (e.target as HTMLInputElement).value }}>
              </uui-input>
            </div>
            
            <div class="form-field toggle-field">
              <uui-toggle
                .checked=${this._formData.excludeFromCustomLabels ?? false}
                @change=${(e: Event) => this._formData = { ...this._formData, excludeFromCustomLabels: (e.target as any).checked }}>
              </uui-toggle>
              <label>Exclude from custom labels</label>
            </div>
          </div>
        ` : nothing}
      </div>
    `;
  }

  private _renderStockSection(): unknown {
    const warehouseStock = this._formData.warehouseStock ?? [];
    
    return html`
      <div class="section-content">
        <p class="section-hint">Manage stock levels per warehouse for this variant.</p>
        
        ${warehouseStock.length > 0 ? html`
          <div class="table-container">
            <uui-table>
              <uui-table-head>
                <uui-table-head-cell>Warehouse</uui-table-head-cell>
                <uui-table-head-cell>Stock</uui-table-head-cell>
                <uui-table-head-cell>Reorder Point</uui-table-head-cell>
                <uui-table-head-cell>Track Stock</uui-table-head-cell>
              </uui-table-head>
              ${warehouseStock.map((ws) => html`
                <uui-table-row>
                  <uui-table-cell>${ws.warehouseName}</uui-table-cell>
                  <uui-table-cell>
                    <uui-input
                      type="number"
                      .value=${String(ws.stock)}
                      style="width: 80px;">
                    </uui-input>
                  </uui-table-cell>
                  <uui-table-cell>
                    <uui-input
                      type="number"
                      .value=${String(ws.reorderPoint ?? "")}
                      style="width: 80px;">
                    </uui-input>
                  </uui-table-cell>
                  <uui-table-cell>
                    <uui-toggle .checked=${ws.trackStock}></uui-toggle>
                  </uui-table-cell>
                </uui-table-row>
              `)}
            </uui-table>
          </div>
        ` : html`
          <div class="empty-state">
            <uui-icon name="icon-box"></uui-icon>
            <p>No warehouses assigned to this product</p>
          </div>
        `}
      </div>
    `;
  }

  // ... styles
}
```

------

## Stage 9: Frontend - Option Editor Modal

### 9.1 Modal Token

**File:** `src/Merchello/Client/src/products/modals/option-editor-modal.token.ts`



```typescript
import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ProductOptionDto, ProductOptionSettingsDto } from "@products/types/product.types.js";

export interface OptionEditorModalData {
  option?: ProductOptionDto; // undefined for new
  settings: ProductOptionSettingsDto;
}

export interface OptionEditorModalValue {
  saved: boolean;
  option?: ProductOptionDto;
  deleted?: boolean;
}

export const MERCHELLO_OPTION_EDITOR_MODAL = new UmbModalToken<
  OptionEditorModalData,
  OptionEditorModalValue
>("Merchello.OptionEditor.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
```

### 9.2 Modal Element (Key Features)

**File:** `src/Merchello/Client/src/products/modals/option-editor-modal.element.ts`

 

Key sections for option editing:



```typescript
// Option UI alias determines how values are displayed
private _renderValueEditor(value: ProductOptionValueDto, index: number): unknown {
  const uiAlias = this._formData.optionUiAlias;
  
  return html`
    <div class="value-row">
      <uui-input
        .value=${value.name}
        placeholder="Value name"
        @input=${(e: Event) => this._updateValueName(index, (e.target as HTMLInputElement).value)}>
      </uui-input>
      
      ${uiAlias === "colour" ? html`
        <uui-color-picker
          .value=${value.hexValue || "#000000"}
          @change=${(e: Event) => this._updateValueHex(index, (e.target as any).value)}>
        </uui-color-picker>
      ` : nothing}
      
      ${uiAlias === "image" ? html`
        <umb-input-rich-media
          .value=${value.mediaKey ? [{ key: value.id, mediaKey: value.mediaKey }] : []}
          ?multiple=${false}
          @change=${(e: Event) => this._updateValueMedia(index, e)}>
        </umb-input-rich-media>
      ` : nothing}
      
      ${!this._formData.isVariant ? html`
        <!-- Add-on pricing fields -->
        <uui-input
          type="number"
          step="0.01"
          .value=${String(value.priceAdjustment)}
          placeholder="Price +/-"
          @input=${(e: Event) => this._updateValuePriceAdjustment(index, parseFloat((e.target as HTMLInputElement).value) || 0)}>
        </uui-input>
        
        <uui-input
          .value=${value.skuSuffix || ""}
          placeholder="SKU suffix"
          @input=${(e: Event) => this._updateValueSkuSuffix(index, (e.target as HTMLInputElement).value)}>
        </uui-input>
      ` : nothing}
      
      <uui-button compact look="secondary" @click=${() => this._removeValue(index)}>
        <uui-icon name="icon-trash"></uui-icon>
      </uui-button>
    </div>
  `;
}
```

------

## Stage 10: Manifest Updates

### 10.1 Update Products Manifest

**File:** `src/Merchello/Client/src/products/manifest.ts`



```typescript
export const manifests: Array<UmbExtensionManifest> = [
  // Create product modal
  {
    type: "modal",
    alias: "Merchello.CreateProduct.Modal",
    name: "Merchello Create Product Modal",
    js: () => import("./modals/create-product-modal.element.js"),
  },

  // Variant detail modal
  {
    type: "modal",
    alias: "Merchello.VariantDetail.Modal",
    name: "Merchello Variant Detail Modal",
    js: () => import("./modals/variant-detail-modal.element.js"),
  },

  // Option editor modal
  {
    type: "modal",
    alias: "Merchello.OptionEditor.Modal",
    name: "Merchello Option Editor Modal",
    js: () => import("./modals/option-editor-modal.element.js"),
  },

  // Workspace for products list
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

  // Workspace view for products list
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
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Products.Workspace",
      },
    ],
  },

  // Workspace for product detail (routable)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Product.Detail.Workspace",
    name: "Product Detail Workspace",
    api: () => import("./contexts/product-detail-workspace.context.js"),
    meta: {
      entityType: "merchello-product",
    },
  },

  // Workspace view for product detail
  {
    type: "workspaceView",
    alias: "Merchello.Product.Detail.View",
    name: "Product Detail View",
    js: () => import("./components/product-detail.element.js"),
    weight: 100,
    meta: {
      label: "Product",
      pathname: "product",
      icon: "icon-box",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Product.Detail.Workspace",
      },
    ],
  },
];
```

------

## Stage 11: Implementation Checklist

### Phase 1: Backend Foundation

- [x] Update MerchelloSettings with OptionTypeAliases and OptionUiAliases
- [x] Create ProductRootDetailDto and related DTOs
- [x] Create request DTOs for create/update operations
- [x] Add ProductService methods for full CRUD
- [x] Implement API endpoints in ProductsApiController
- [x] Add settings endpoint for product option configuration

### Phase 2: Frontend Types & API

- [x] Update product.types.ts with all new interfaces
- [x] Add API methods to merchello-api.ts
- [ ] Test API calls work correctly

### Phase 3: Workspace & Context

- [x] Update product-detail-workspace.context.ts with create/edit routes
- [x] Add isNew flag and updateProduct method
- [ ] Test routing works for both create and edit

### Phase 4: Product Detail View

- [x] Rewrite product-detail.element.ts with tabbed interface
- [x] Implement Details tab with media picker
- [x] Implement Variants tab with radio selection
- [x] Implement Options tab with option cards
- [x] Add validation and warning states

### Phase 5: Variant Modal

- [x] Create variant-detail-modal.token.ts
- [x] Implement variant-detail-modal.element.ts with all sections
- [ ] Test variant editing and saving

### Phase 6: Option Editor Modal

- [x] Create option-editor-modal.token.ts
- [x] Implement option-editor-modal.element.ts
- [x] Handle different UI aliases (dropdown, colour, image)
- [ ] Test option creation and editing

### Phase 7: Integration & Polish

- [x] Update manifest.ts with all new modals
- [ ] Test create flow end-to-end
- [ ] Test edit flow end-to-end
- [ ] Test variant generation from options
- [ ] Verify media picker stores GUIDs correctly
- [ ] Cross-browser testing

------

## Key UX Patterns

### Toggle Pattern

```html
<div class="toggle-field">
  <uui-toggle .checked=${value} @change=${handler}></uui-toggle>
  <label>Label text</label>
</div>
```

### Tab Warning Pattern

```html
<uui-tab>
  <span class="tab-label">
    Tab Name
    ${hasWarning ? html`<uui-icon name="icon-alert" class="tab-warning"></uui-icon>` : nothing}
    <span class="tab-count">(${count})</span>
  </span>
</uui-tab>
```

### Media Picker Pattern

```html
<umb-input-rich-media
  .value=${mediaPickerValue}  <!-- Array of { key, mediaKey } -->
  ?multiple=${true}
  @change=${handler}>
</umb-input-rich-media>
```

### Inline Default Selection (Radio in Table)

```html
<uui-table-row>
  <uui-table-cell @click=${(e) => e.stopPropagation()}>
    <uui-radio
      .checked=${item.default}
      @change=${() => this._setDefault(item.id)}>
    </uui-radio>
  </uui-table-cell>
  <!-- Other cells -->
</uui-table-row>
```

------

## Notes for Developers

1. **Media IDs**: Always store as GUIDs (strings), use `umb-input-rich-media` for the picker
2. **Form State**: Keep `_formData` as a separate copy from `_product` to allow editing before save
3. **Validation**: Highlight missing required fields with warning class before saving
4. **Auto-save**: Default variant selection auto-saves immediately (no confirmation needed)
5. **Variant regeneration**: Warn users this may require updating pricing/stock on new variants

------

That's the complete implementation guide. Copy this into a markdown file in your docs folder. Would you like me to clarify any section or provide more detail on a specific part?