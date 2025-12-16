# Product Render - View Selection for ProductRoot

This document outlines how ProductRoot stores and resolves which Razor view renders the product on the front-end.

---

## Overview

ProductRoot has a `ViewAlias` property that stores the name of a Razor view. Views are discovered from configured locations (default: `~/Views/Products/`) using ASP.NET Core's `ApplicationPartManager`, which works for both file-based views and views compiled into Razor Class Libraries (RCLs).

---

## How It Works

### Storage

`ProductRoot.ViewAlias` stores a simple string (e.g., `"Gallery"`).

### Resolution

The view path is resolved as: `{ConfiguredLocation}/{ViewAlias}.cshtml`

Example: `ViewAlias = "Gallery"` → `~/Views/Products/Gallery.cshtml`

### Discovery

Views are discovered at runtime using `ApplicationPartManager` + `ViewsFeature`. This approach:
- Works in production with compiled views
- Supports views distributed as NuGet packages (RCLs)
- Discovers views from multiple configured locations

---

## Configuration

### MerchelloSettings

```json
{
  "Merchello": {
    "ProductViewLocations": ["~/Views/Products/"]
  }
}
```

Default: `["~/Views/Products/"]`

Add to existing `MerchelloSettings.cs`:

```csharp
/// <summary>
/// Virtual path prefixes to search for product views.
/// Views are discovered from files and compiled RCLs.
/// </summary>
public string[] ProductViewLocations { get; set; } = ["~/Views/Products/"];
```

---

## Backend Implementation

### ProductRoot Model

```csharp
// src/Merchello.Core/Products/Models/ProductRoot.cs

/// <summary>
/// The view alias used to render this product on the front-end.
/// Example: "Gallery" -> ~/Views/Products/Gallery.cshtml
/// </summary>
[MaxLength(200)]
public string? ViewAlias { get; set; }
```

### Add to ProductService

Add method to existing `IProductService`:

```csharp
public record ProductViewInfo(string Alias, string VirtualPath);

// In IProductService
IReadOnlyList<ProductViewInfo> GetAvailableViews();
```

Implementation in `ProductService`:

```csharp
public IReadOnlyList<ProductViewInfo> GetAvailableViews()
{
    var feature = new ViewsFeature();
    _partManager.PopulateFeature(feature);

    var locations = _settings.Value.ProductViewLocations;

    return feature.ViewDescriptors
        .Where(v => locations.Any(loc =>
            v.RelativePath.StartsWith(loc.TrimStart('~'), StringComparison.OrdinalIgnoreCase)))
        .Select(v => new ProductViewInfo(
            Path.GetFileNameWithoutExtension(v.RelativePath),
            v.RelativePath))
        .DistinctBy(v => v.Alias)
        .OrderBy(v => v.Alias)
        .ToList();
}
```

### API Endpoint

```csharp
// GET /umbraco/merchello/api/products/views
[HttpGet("views")]
public IActionResult GetAvailableViews()
{
    var views = _productService.GetAvailableViews();
    return Ok(views);
}
```

---

## Frontend Implementation

### TypeScript Types

```typescript
interface ProductViewDto {
  alias: string;
  virtualPath: string;
}
```

Add `viewAlias?: string` to `ProductRootDetailDto` and `UpdateProductRootDto`.

### Product Detail Integration

Add dropdown to the Details tab in `product-detail.element.ts`:
- Label: "Product View"
- Fetch available views from API on load
- Show dropdown with options (empty option = use default)

---

## Creating View Packages (RCLs)

Theme packages can distribute product views as NuGet packages using Razor Class Libraries.

### RCL Structure

```
MyMerchelloTheme/
  MyMerchelloTheme.csproj
  Views/
    Products/
      Minimal.cshtml
      Gallery.cshtml
      Technical.cshtml
```

### Project File

```xml
<Project Sdk="Microsoft.NET.Sdk.Razor">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <AddRazorSupportForMvc>true</AddRazorSupportForMvc>
  </PropertyGroup>
</Project>
```

When the RCL is referenced, its views are automatically discovered via `ApplicationPartManager`.

---

## Front-End URL Routing

Merchello intercepts product URLs using Umbraco's `IContentFinder` system, allowing products to be rendered at root-level URLs without requiring Umbraco content nodes.

### URL Patterns

| Pattern | Resolves To |
|---------|-------------|
| `/{root-url}` | ProductRoot with default variant selected |
| `/{root-url}/{variant-url}` | ProductRoot with specific variant selected |

**Examples:**
- `/leather-jacket` → ProductRoot "Leather Jacket", default variant selected
- `/leather-jacket/red-large` → ProductRoot "Leather Jacket", variant "red-large" selected

**Note:** Variant URLs (e.g., `red-large`) are auto-generated from option values and are only unique within their ProductRoot context.

### How It Works

1. `ProductContentFinder` is registered after Umbraco's default `ContentFinderByUrlNew`
2. Umbraco's default finder tries first; if content found, product finder is skipped
3. If no Umbraco content matches, `ProductContentFinder` parses URL segments
4. Looks up `ProductRoot` by `RootUrl` matching first segment
5. If no match → returns `false` (404 if no other finders match)
6. If second segment exists → finds `Product` where `Url` matches within that ProductRoot
7. If no second segment → uses variant where `Product.Default == true`
8. Creates `MerchelloPublishedProduct` (virtual `IPublishedContent`)
9. Sets content on request and returns `true`

### ProductContentFinder Implementation

```csharp
// src/Merchello.Umbraco/Routing/ProductContentFinder.cs

public class ProductContentFinder(
    IProductService productService,
    IMerchelloViewModelFactory viewModelFactory,
    ILogger<ProductContentFinder> logger) : IContentFinder
{
    public async Task<bool> TryFindContent(IPublishedRequestBuilder request)
    {
        var path = request.AbsolutePathDecoded.Trim('/');
        if (string.IsNullOrEmpty(path)) return false;

        var segments = path.Split('/', 2);
        var rootUrl = segments[0];

        // Look up ProductRoot by RootUrl
        var productRoot = await productService.GetByRootUrlAsync(rootUrl);
        if (productRoot is null)
        {
            logger.LogDebug("No ProductRoot found for URL: {RootUrl}", rootUrl);
            return false;
        }

        // Resolve variant
        Product? selectedVariant = null;
        if (segments.Length > 1)
        {
            var variantUrl = segments[1];
            selectedVariant = productRoot.Products
                .FirstOrDefault(p => p.Url == variantUrl);

            if (selectedVariant is null)
            {
                logger.LogDebug("Variant not found: {VariantUrl}", variantUrl);
                return false;
            }
        }
        else
        {
            selectedVariant = productRoot.Products
                .FirstOrDefault(p => p.Default);
        }

        // Create virtual published content
        var viewModel = viewModelFactory.CreateProductViewModel(productRoot, selectedVariant);
        var publishedProduct = new MerchelloPublishedProduct(productRoot, viewModel);

        request.SetPublishedContent(publishedProduct);
        logger.LogDebug("Resolved product: {ProductName}, Variant: {VariantName}",
            productRoot.RootName, selectedVariant?.Name ?? "default");

        return true;
    }
}
```

### Registration

```csharp
// src/Merchello.Umbraco/Routing/ProductContentFinderComposer.cs

public class ProductContentFinderComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        // Register after default URL finder so Umbraco content is checked first
        builder.ContentFinders()
            .InsertAfter<ContentFinderByUrlNew, ProductContentFinder>();
    }
}
```

### Fallback Behavior

1. If `ProductRoot.RootUrl` matches and variant resolves → render product view
2. If `ProductRoot.RootUrl` matches but variant not found → return `false` (404)
3. If no ProductRoot matches → let Umbraco's default finder handle it

---

## Route Hijacking (View Rendering)

Umbraco uses **route hijacking** to automatically route requests to a controller matching `IPublishedContent.ContentType.Alias`. This is how `ViewAlias` connects to actual view rendering.

### How It Works

When `ProductContentFinder` sets `MerchelloPublishedProduct` as the published content, Umbraco's `UmbracoRouteValuesFactory` checks the `ContentType.Alias`:

```csharp
// Umbraco's UmbracoRouteValuesFactory.cs (lines 96-110)
var customControllerName = request.PublishedContent?.ContentType?.Alias;
if (customControllerName != null)
{
    ControllerActionDescriptor? descriptor =
        _controllerActionSearcher.Find<IRenderController>(httpContext, customControllerName, ...);
    if (descriptor != null)
    {
        hasHijackedRoute = true;
        // Routes to the hijacked controller
    }
}
```

Since `MerchelloPublishedProduct.ContentType.Alias = "MerchelloProduct"`, Umbraco automatically routes to `MerchelloProductController`.

### Request Flow

```
1. HTTP GET /leather-jacket
2. ProductContentFinder.TryFindContent() matches RootUrl
3. Creates MerchelloPublishedProduct (ContentType.Alias = "MerchelloProduct")
4. request.SetPublishedContent(publishedProduct)
5. UmbracoRouteValuesFactory sees ContentType.Alias, finds MerchelloProductController
6. MerchelloProductController.Index() renders ~/Views/Products/{ViewAlias}.cshtml
7. View receives MerchelloProductViewModel
```

### MerchelloProductContentType

Stub `IPublishedContentType` that triggers route hijacking. The `Alias` property must match the controller name.

```csharp
// src/Merchello.Umbraco/Models/MerchelloProductContentType.cs

/// <summary>
/// Stub IPublishedContentType for Merchello products.
/// The Alias property triggers Umbraco's route hijacking to MerchelloProductController.
/// </summary>
public class MerchelloProductContentType : IPublishedContentType
{
    public static readonly MerchelloProductContentType Instance = new();

    public Guid Key => new Guid("00000000-0000-0000-0000-MERCHPRODUCT");
    public int Id => -1000; // Negative to avoid conflicts with Umbraco content types
    public string Alias => "MerchelloProduct"; // Must match controller name
    public PublishedItemType ItemType => PublishedItemType.Content;
    public HashSet<string> CompositionAliases => [];
    public ContentVariation Variations => ContentVariation.Nothing;
    public bool IsElement => false;
    public IEnumerable<IPublishedPropertyType> PropertyTypes => [];
    public int GetPropertyIndex(string alias) => -1;
    public IPublishedPropertyType? GetPropertyType(string alias) => null;
    public IPublishedPropertyType? GetPropertyType(int index) => null;
}
```

### MerchelloProductController

Renders product pages using the `ViewAlias` stored on ProductRoot. Automatically invoked via route hijacking.

```csharp
// src/Merchello.Umbraco/Controllers/MerchelloProductController.cs

/// <summary>
/// Renders product pages using the ViewAlias stored on ProductRoot.
/// Automatically invoked via Umbraco's route hijacking when ContentType.Alias = "MerchelloProduct".
/// </summary>
public class MerchelloProductController(
    ILogger<MerchelloProductController> logger,
    ICompositeViewEngine compositeViewEngine,
    IUmbracoContextAccessor umbracoContextAccessor)
    : RenderController(logger, compositeViewEngine, umbracoContextAccessor)
{
    public override IActionResult Index()
    {
        if (CurrentPage is not MerchelloPublishedProduct product)
        {
            return NotFound();
        }

        var viewModel = CreateViewModel(product);
        var viewPath = ResolveViewPath(product);

        return View(viewPath, viewModel);
    }

    /// <summary>
    /// Creates the view model for the product. Override to customize or extend the model.
    /// </summary>
    protected virtual MerchelloProductViewModel CreateViewModel(MerchelloPublishedProduct product)
    {
        return product.ViewModel;
    }

    /// <summary>
    /// Resolves the view path for the product. Override to customize view resolution logic.
    /// </summary>
    protected virtual string ResolveViewPath(MerchelloPublishedProduct product)
    {
        var viewAlias = product.ViewAlias ?? "Default";
        return $"~/Views/Products/{viewAlias}.cshtml";
    }
}
```

### Extending the Controller

To customize product rendering, inherit from `MerchelloProductController` and override the virtual methods:

```csharp
// Your project: Controllers/CustomProductController.cs

public class CustomProductController(
    ILogger<CustomProductController> logger,
    ICompositeViewEngine compositeViewEngine,
    IUmbracoContextAccessor umbracoContextAccessor,
    IMyCustomService myService)
    : MerchelloProductController(logger, compositeViewEngine, umbracoContextAccessor)
{
    protected override MerchelloProductViewModel CreateViewModel(MerchelloPublishedProduct product)
    {
        var viewModel = base.CreateViewModel(product);

        // Add custom data, e.g., related products, reviews, etc.
        // viewModel.RelatedProducts = myService.GetRelatedProducts(product.Key);

        return viewModel;
    }

    protected override string ResolveViewPath(MerchelloPublishedProduct product)
    {
        // Custom view resolution logic, e.g., A/B testing, user preferences
        return base.ResolveViewPath(product);
    }
}
```

**Note:** Since both controllers match the `MerchelloProduct` alias, ensure your custom controller is registered. You may need to remove Merchello's default controller registration or use Umbraco's controller factory customization.

### MerchelloPublishedProduct

Virtual `IPublishedContent` wrapper for ProductRoot. Required for Umbraco's routing pipeline and Layout compatibility (layouts expect `@Model.Content`).

```csharp
// src/Merchello.Umbraco/Models/MerchelloPublishedProduct.cs

/// <summary>
/// Virtual IPublishedContent wrapper for ProductRoot.
/// Required for Umbraco's routing pipeline and Layout compatibility.
/// </summary>
public class MerchelloPublishedProduct : IPublishedContent
{
    private readonly ProductRoot _productRoot;

    public MerchelloPublishedProduct(ProductRoot productRoot, MerchelloProductViewModel viewModel)
    {
        _productRoot = productRoot;
        ViewModel = viewModel;
    }

    // Route hijacking trigger - Umbraco finds MerchelloProductController
    public IPublishedContentType ContentType => MerchelloProductContentType.Instance;

    // Custom properties for the controller
    public MerchelloProductViewModel ViewModel { get; }
    public string? ViewAlias => _productRoot.ViewAlias;

    // IPublishedElement
    public Guid Key => _productRoot.Id;
    public IEnumerable<IPublishedProperty> Properties => [];
    public IPublishedProperty? GetProperty(string alias) => null;

    // IPublishedContent - Required for Layout compatibility
    public int Id => _productRoot.Id.GetHashCode();
    public string Name => _productRoot.RootName;
    public string? UrlSegment => _productRoot.RootUrl;
    public int SortOrder => 0;
    public int Level => 1;
    public string Path => $"-1,{Id}";
    public int? TemplateId => null; // Not used - route hijacking handles view selection
    public int CreatorId => -1;
    public DateTime CreateDate => _productRoot.CreateDate;
    public int WriterId => -1;
    public DateTime UpdateDate => _productRoot.UpdateDate;
    public IReadOnlyDictionary<string, PublishedCultureInfo> Cultures =>
        new Dictionary<string, PublishedCultureInfo>();
    public PublishedItemType ItemType => PublishedItemType.Content;

    [Obsolete] public IPublishedContent? Parent => null;
    [Obsolete] public IEnumerable<IPublishedContent> Children => [];

    public bool IsDraft(string? culture = null) => false;
    public bool IsPublished(string? culture = null) => true;
}
```

---

## MerchelloProductViewModel

The view model passed to product Razor views. Implements `IContentModel` for Umbraco view compatibility.

### Key Behaviors

- **Same model for both URLs** - `/{root-url}` and `/{root-url}/{variant}` use identical view model
- **All variants included** - For building variant picker UI
- **Selected variant tracked** - `SelectedVariant` indicates current selection
- **Default fallback** - When no variant in URL, `Product.Default == true` is selected

### Class Structure

```csharp
// src/Merchello.Umbraco/Models/MerchelloProductViewModel.cs

public class MerchelloProductViewModel : IContentModel
{
    // IContentModel implementation (for Umbraco view compatibility)
    public IPublishedContent Content { get; }

    // Product Data
    public ProductRoot ProductRoot { get; }
    public Product SelectedVariant { get; }
    public IReadOnlyList<Product> AllVariants { get; }

    // Options (separated by type)
    public IReadOnlyList<ProductOption> VariantOptions { get; }  // IsVariant = true
    public IReadOnlyList<ProductOption> AddOnOptions { get; }    // IsVariant = false

    // Pricing (from SelectedVariant)
    public decimal Price { get; }
    public decimal? PreviousPrice { get; }
    public bool OnSale { get; }

    // Stock (from SelectedVariant)
    public int TotalStock { get; }
    public bool AvailableForPurchase { get; }
    public bool TrackStock { get; }

    // Media (combined root + variant, respecting ExcludeRootProductImages)
    public IReadOnlyList<string> Images { get; }
    public IReadOnlyList<string> Videos { get; }

    // SEO (from ProductRoot)
    public string MetaTitle { get; }
    public string MetaDescription { get; }
    public string CanonicalUrl { get; }

    // URLs
    public string ProductUrl { get; }
    public string SelectedVariantUrl { get; }

    // Helpers
    public string GetVariantUrl(Product variant);
    public bool IsVariantSelected(Product variant);
}
```

### Properties Reference

| Property | Type | Source | Description |
|----------|------|--------|-------------|
| `Content` | `IPublishedContent` | Virtual | Umbraco compatibility wrapper |
| `ProductRoot` | `ProductRoot` | Direct | Full product root with all data |
| `SelectedVariant` | `Product` | Resolved | Currently selected variant |
| `AllVariants` | `IReadOnlyList<Product>` | `ProductRoot.Products` | All variants for picker |
| `VariantOptions` | `IReadOnlyList<ProductOption>` | Filtered | Options where `IsVariant == true` |
| `AddOnOptions` | `IReadOnlyList<ProductOption>` | Filtered | Options where `IsVariant == false` |
| `Price` | `decimal` | `SelectedVariant.Price` | Current price |
| `OnSale` | `bool` | `SelectedVariant.OnSale` | Sale indicator |
| `TotalStock` | `int` | Calculated | Sum across warehouses |
| `Images` | `IReadOnlyList<string>` | Combined | Variant images + root images |

### Factory

```csharp
// src/Merchello.Umbraco/Factories/MerchelloViewModelFactory.cs

public interface IMerchelloViewModelFactory
{
    MerchelloProductViewModel CreateProductViewModel(
        ProductRoot productRoot,
        Product? selectedVariant = null);
}

public class MerchelloViewModelFactory : IMerchelloViewModelFactory
{
    public MerchelloProductViewModel CreateProductViewModel(
        ProductRoot productRoot,
        Product? selectedVariant = null)
    {
        selectedVariant ??= productRoot.Products.FirstOrDefault(p => p.Default)
                          ?? productRoot.Products.FirstOrDefault();

        return new MerchelloProductViewModel(productRoot, selectedVariant);
    }
}
```

### Usage in Razor Views

```csharp
@model MerchelloProductViewModel
@inherits Umbraco.Cms.Web.Common.Views.UmbracoViewPage

<h1>@Model.ProductRoot.RootName</h1>
<p class="price">@Model.Price.ToString("C")</p>

@if (Model.OnSale && Model.PreviousPrice.HasValue)
{
    <p class="was-price">Was @Model.PreviousPrice.Value.ToString("C")</p>
}

<div class="images">
    @foreach (var image in Model.Images)
    {
        <img src="@image" alt="@Model.ProductRoot.RootName" />
    }
</div>

@if (Model.AvailableForPurchase)
{
    <button>Add to Basket</button>
}
else
{
    <p>Out of Stock</p>
}
```

### Example: Variant Picker

```csharp
@* Build variant picker from options *@
@foreach (var option in Model.VariantOptions)
{
    <div class="option-group">
        <label>@option.Name</label>
        <select name="option-@option.Alias">
            @foreach (var value in option.ProductOptionValues)
            {
                <option value="@value.Id">
                    @value.Name
                    @if (value.HexValue is not null)
                    {
                        <span style="background: @value.HexValue"></span>
                    }
                </option>
            }
        </select>
    </div>
}

@* Or link directly to variant URLs *@
<div class="variant-links">
    @foreach (var variant in Model.AllVariants)
    {
        var isSelected = Model.IsVariantSelected(variant);
        <a href="@Model.GetVariantUrl(variant)"
           class="@(isSelected ? "selected" : "")">
            @variant.Name - @variant.Price.ToString("C")
        </a>
    }
</div>
```

### Example: Add-On Options

```csharp
@* Display add-on options (non-variant) with price adjustments *@
@if (Model.AddOnOptions.Any())
{
    <div class="add-ons">
        <h3>Customization Options</h3>
        @foreach (var option in Model.AddOnOptions)
        {
            <div class="add-on-group">
                <label>@option.Name</label>
                @foreach (var value in option.ProductOptionValues)
                {
                    <label class="add-on-choice">
                        <input type="checkbox"
                               name="addon-@option.Alias"
                               value="@value.Id"
                               data-price-adjustment="@value.PriceAdjustment" />
                        @value.Name
                        @if (value.PriceAdjustment > 0)
                        {
                            <span class="price-adjustment">
                                +@value.PriceAdjustment.ToString("C")
                            </span>
                        }
                    </label>
                }
            </div>
        }
    </div>
}
```

---

## Rich Text Description Rendering (TipTap)

ProductRoot stores its `Description` property using Umbraco's TipTap rich text editor format. This requires special handling to render properly, including resolving internal links, media references, and embedded blocks.

### Storage Format

The Description is stored as JSON in `RichTextEditorValue` format:

```json
{
  "markup": "<p>Product description with <a href=\"{localLink:umb://document/...}\">links</a>...</p>",
  "blocks": {
    "layout": { ... },
    "contentData": [ ... ],
    "settingsData": [ ... ]
  }
}
```

For simple text without blocks, `blocks` may be `null`:

```json
{
  "markup": "<p>Simple product description</p>",
  "blocks": null
}
```

### Rendering in Razor Views

Use the `ToTipTapHtml()` extension method to render rich text content:

```csharp
@using Merchello.Extensions
@using Merchello.Services
@inject IRichTextRenderer RichTextRenderer

@model MerchelloProductViewModel

@if (!string.IsNullOrEmpty(Model.ProductRoot.Description))
{
    <div class="product-description">
        @Model.ProductRoot.Description.ToTipTapHtml(RichTextRenderer)
    </div>
}
```

### What ToTipTapHtml() Does

The `IRichTextRenderer` service handles:

1. **Link Resolution** - Converts `{localLink:umb://...}` placeholders to actual URLs
2. **Media Resolution** - Converts `data-udi` attributes to actual image URLs
3. **URL Resolution** - Converts `~` relative paths to absolute application paths
4. **Block Rendering** - Replaces `<umb-rte-block>` tags with rendered partial view content
5. **HTML Cleanup** - Removes editor-specific attributes (`data-udi`, numeric `rel`)

### Block Partial Views

Blocks embedded in rich text content are rendered via partial views at the standard Umbraco path:

```
~/Views/Partials/richtext/Components/{ContentTypeAlias}.cshtml
```

For example, a block with content type alias `productFeatureBlock` requires:

```
Views/
  Partials/
    richtext/
      Components/
        productFeatureBlock.cshtml
```

The partial view receives a `RichTextBlockItem` model:

```csharp
@inherits Umbraco.Cms.Web.Common.Views.UmbracoViewPage<Umbraco.Cms.Core.Models.Blocks.RichTextBlockItem>

<div class="feature-block">
    <h3>@Model.Content.Value<string>("title")</h3>
    <p>@Model.Content.Value<string>("description")</p>

    @if (Model.Settings != null)
    {
        var bgColor = Model.Settings.Value<string>("backgroundColor");
        @* Use settings for styling *@
    }
</div>
```

### Backwards Compatibility

The renderer handles legacy content gracefully:

- **Plain HTML string** - If the Description is not valid JSON, it's treated as plain HTML markup
- **Missing blocks property** - If JSON has `markup` but no `blocks`, only the markup is rendered
- **Block tags without data** - If markup contains `<umb-rte-block>` tags but no block data, a warning is logged and tags are stripped

### Service Registration

The `IRichTextRenderer` service is automatically registered by Merchello. No additional configuration required.

### Example: Complete Product View

```csharp
@using Merchello.Extensions
@using Merchello.Services
@inject IRichTextRenderer RichTextRenderer

@model MerchelloProductViewModel

<article class="product">
    <h1>@Model.ProductRoot.RootName</h1>

    <div class="price">@Model.Price.ToString("C")</div>

    @* Rich text description with full block support *@
    @if (!string.IsNullOrEmpty(Model.ProductRoot.Description))
    {
        <div class="description">
            @Model.ProductRoot.Description.ToTipTapHtml(RichTextRenderer)
        </div>
    }

    @* Product images *@
    <div class="gallery">
        @foreach (var image in Model.Images)
        {
            <img src="@image" alt="@Model.ProductRoot.RootName" />
        }
    </div>
</article>
```

---

## Performance Requirements

The `ProductContentFinder` queries the database on every HTTP request. Indexes are **critical** for performance.

### Required Indexes

```csharp
// src/Merchello.Core/Products/Mapping/ProductRootDbMapping.cs
builder.HasIndex(x => x.RootUrl);

// src/Merchello.Core/Products/Mapping/ProductDbMapping.cs
builder.HasIndex(x => x.Url);
```

### Performance Impact

| Products | Without Index | With Index |
|----------|---------------|------------|
| 1,000 | ~2-5ms | ~0.2ms |
| 100,000 | ~50-200ms | ~0.2ms |
| 1,000,000 | ~500ms-2s | ~0.2ms |

### Required Service Method

Add to `IProductService`:

```csharp
/// <summary>
/// Gets a ProductRoot by its RootUrl for front-end routing.
/// </summary>
Task<ProductRoot?> GetByRootUrlAsync(string rootUrl, CancellationToken ct = default);
```

Implementation in `ProductService`:

```csharp
public async Task<ProductRoot?> GetByRootUrlAsync(string rootUrl, CancellationToken ct = default)
{
    var normalizedUrl = rootUrl.ToLowerInvariant();
    using var scope = efCoreScopeProvider.CreateScope();
    var result = await scope.ExecuteWithContextAsync(async db =>
        await db.RootProducts
            .Include(pr => pr.Products)
            .Include(pr => pr.ProductOptions)
                .ThenInclude(po => po.ProductOptionValues)
            .AsNoTracking()
            .FirstOrDefaultAsync(pr => pr.RootUrl == normalizedUrl, ct));
    scope.Complete();
    return result;
}
```

---

## Files to Modify

### Backend - View Selection (.NET)

| File | Change |
|------|--------|
| `src/Merchello.Core/Products/Models/ProductRoot.cs` | Add `ViewAlias` property |
| `src/Merchello.Core/Shared/Models/MerchelloSettings.cs` | Add `ProductViewLocations` |
| `src/Merchello.Core/Products/Services/Interfaces/IProductService.cs` | Add `GetAvailableViews()` |
| `src/Merchello.Core/Products/Services/ProductService.cs` | Implement `GetAvailableViews()` |
| `src/Merchello.Core/Products/Dtos/ProductRootDetailDto.cs` | Add `ViewAlias` |
| `src/Merchello.Core/Products/Dtos/UpdateProductRootDto.cs` | Add `ViewAlias` |
| `src/Merchello.Core/Products/Mapping/ProductRootDbMapping.cs` | Map property |
| `src/Merchello/Controllers/ProductsApiController.cs` | Add views endpoint |

### Backend - Front-End Routing (.NET)

| File | Change |
|------|--------|
| `src/Merchello.Umbraco/Routing/ProductContentFinder.cs` | URL routing - intercepts product URLs |
| `src/Merchello.Umbraco/Routing/ProductContentFinderComposer.cs` | Registers finder in pipeline |
| `src/Merchello.Umbraco/Models/MerchelloProductContentType.cs` | **NEW** - Stub content type for route hijacking |
| `src/Merchello.Umbraco/Controllers/MerchelloProductController.cs` | **NEW** - Renders product views by ViewAlias |
| `src/Merchello.Umbraco/Models/MerchelloPublishedProduct.cs` | Virtual `IPublishedContent` wrapper |
| `src/Merchello.Umbraco/Models/MerchelloProductViewModel.cs` | View model for Razor views |
| `src/Merchello.Umbraco/Factories/MerchelloViewModelFactory.cs` | Factory for creating view models |
| `src/Merchello.Core/Products/Services/Interfaces/IProductService.cs` | Add `GetByRootUrlAsync()` |
| `src/Merchello.Core/Products/Services/ProductService.cs` | Implement `GetByRootUrlAsync()` |
| `src/Merchello.Core/Products/Mapping/ProductRootDbMapping.cs` | Add index on `RootUrl` |
| `src/Merchello.Core/Products/Mapping/ProductDbMapping.cs` | Add index on `Url` |

### Frontend (TypeScript/Lit)

| File | Change |
|------|--------|
| `src/Merchello/Client/src/products/types/product.types.ts` | Add types |
| `src/Merchello/Client/src/api/merchello-api.ts` | Add `getProductViews()` |
| `src/Merchello/Client/src/products/components/product-detail.element.ts` | Add view dropdown |

### Database

**Run migration via:** `scripts/add-migration.ps1` (handles SQLite + SQL Server)

Migration adds:
- `merchelloProductRoots.ViewAlias` (nvarchar 200, nullable)
- `merchelloProductRoots.ElementPropertyData` (nvarchar(max), nullable)
- Index on `merchelloProductRoots.RootUrl`
- Index on `merchelloProducts.Url`

---

## Element Type Properties for Products

This feature allows store owners to extend ProductRoot with custom Umbraco properties by linking an Element Type to products. This enables rich content properties (Rich Text, Media Pickers, Block Lists, etc.) on product pages while keeping commerce data in Merchello.

### Overview

1. Configure an Element Type alias in `MerchelloSettings.ProductElementTypeAlias`
2. Merchello loads the Element Type and renders its tabs/properties in the product workspace
3. Property values are stored as JSON on `ProductRoot.ElementPropertyData`
4. When rendering, Merchello creates an `IPublishedElement` from the stored data
5. The `MerchelloPublishedProduct.Properties` collection exposes these as real `IPublishedProperty` instances

### Key Concepts

#### What is an Element Type?

An Element Type is a Document Type with `IsElement = true`. It defines a schema (tabs, properties, property editors) but cannot be created as standalone content. Element Types are used by:
- Block List / Block Grid editors
- Nested Content
- **Merchello Products** (this feature)

#### Why Element Types?

- Familiar to Umbraco developers - use the same property editors
- Type-safe rendering via `IPublishedElement` and `IPublishedProperty`
- Works with Models Builder for strongly-typed access
- Value converters handle deserialization automatically

---

# Phased Development Plan

## Phase 1: Backend Foundation

**Goal:** Store and retrieve element property data on ProductRoot

### 1.1 Configuration

Add to `MerchelloSettings.cs`:

```csharp
/// <summary>
/// Alias of an Element Type to use for custom product properties.
/// When set, the Element Type's tabs and properties are rendered in the product workspace.
/// The Element Type must have IsElement = true.
/// </summary>
public string? ProductElementTypeAlias { get; set; }
```

Example `appsettings.json`:

```json
{
  "Merchello": {
    "ProductElementTypeAlias": "productContent"
  }
}
```

### 1.2 Model Changes

Update `ProductRoot.cs`:

```csharp
/// <summary>
/// JSON-serialized property data from the configured Element Type.
/// Stores values as { "propertyAlias": rawValue, ... }
/// </summary>
public string? ElementPropertyData { get; set; }
```

Update `ProductRootDbMapping.cs` to map the property.

### 1.3 DTO Changes

```csharp
// ProductRootDetailDto.cs
public Dictionary<string, object?>? ElementProperties { get; set; }

// UpdateProductRootDto.cs
public Dictionary<string, object?>? ElementProperties { get; set; }
```

### 1.4 Service Layer

Add to `IProductService`:

```csharp
/// <summary>
/// Gets the configured Element Type for products, if any.
/// </summary>
Task<IContentType?> GetProductElementTypeAsync(CancellationToken ct = default);
```

Implementation in `ProductService`:

```csharp
public async Task<IContentType?> GetProductElementTypeAsync(CancellationToken ct = default)
{
    var alias = _settings.Value.ProductElementTypeAlias;
    if (string.IsNullOrEmpty(alias)) return null;

    var contentType = await _contentTypeService.GetAsync(alias);

    // Must be an Element Type
    if (contentType is null || !contentType.IsElement)
    {
        _logger.LogWarning(
            "ProductElementTypeAlias '{Alias}' is not a valid Element Type", alias);
        return null;
    }

    return contentType;
}
```

### 1.5 Serialization Helpers

```csharp
// In ProductService or a dedicated helper

private static readonly JsonSerializerOptions JsonOptions = new()
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    WriteIndented = false
};

public string SerializeElementProperties(Dictionary<string, object?> properties)
    => JsonSerializer.Serialize(properties, JsonOptions);

public Dictionary<string, object?> DeserializeElementProperties(string? json)
    => string.IsNullOrEmpty(json)
        ? new Dictionary<string, object?>()
        : JsonSerializer.Deserialize<Dictionary<string, object?>>(json, JsonOptions)
          ?? new Dictionary<string, object?>();
```

### Phase 1 Files to Modify

| File | Change |
|------|--------|
| `src/Merchello.Core/Shared/Models/MerchelloSettings.cs` | Add `ProductElementTypeAlias` |
| `src/Merchello.Core/Products/Models/ProductRoot.cs` | Add `ElementPropertyData` |
| `src/Merchello.Core/Products/Mapping/ProductRootDbMapping.cs` | Map property |
| `src/Merchello.Core/Products/Dtos/ProductRootDetailDto.cs` | Add `ElementProperties` |
| `src/Merchello.Core/Products/Dtos/UpdateProductRootDto.cs` | Add `ElementProperties` |
| `src/Merchello.Core/Products/Services/Interfaces/IProductService.cs` | Add method |
| `src/Merchello.Core/Products/Services/ProductService.cs` | Implement method + serialization |

---

## Phase 2: API Endpoint for Element Type Structure

**Goal:** Frontend can fetch the Element Type's tabs, properties, and data type configuration

### 2.1 Response Models

Create in `src/Merchello.Core/Products/Dtos/`:

```csharp
public class ElementTypeResponseModel
{
    public Guid Id { get; set; }
    public string Alias { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public IEnumerable<ElementTypeContainer> Containers { get; set; } = [];
    public IEnumerable<ElementTypeProperty> Properties { get; set; } = [];
}

public class ElementTypeContainer
{
    public Guid Id { get; set; }
    public Guid? ParentId { get; set; }
    public string? Name { get; set; }
    public string Type { get; set; } = string.Empty; // "Tab" or "Group"
    public int SortOrder { get; set; }
}

public class ElementTypeProperty
{
    public Guid Id { get; set; }
    public Guid? ContainerId { get; set; }
    public string Alias { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }

    // Data Type info needed for rendering
    public Guid DataTypeId { get; set; }
    public string PropertyEditorUiAlias { get; set; } = string.Empty;
    public object? DataTypeConfiguration { get; set; }

    // Validation
    public bool Mandatory { get; set; }
    public string? MandatoryMessage { get; set; }
    public string? ValidationRegex { get; set; }
    public string? ValidationRegexMessage { get; set; }

    // Appearance
    public bool LabelOnTop { get; set; }
}
```

### 2.2 API Controller

Add to `ProductsApiController.cs`:

```csharp
/// <summary>
/// Gets the configured Element Type structure for the product workspace.
/// Returns null if no Element Type is configured.
/// </summary>
[HttpGet("element-type")]
public async Task<IActionResult> GetProductElementType()
{
    var contentType = await _productService.GetProductElementTypeAsync();
    if (contentType is null)
        return Ok(null);

    var model = MapToElementTypeResponse(contentType);
    return Ok(model);
}

private ElementTypeResponseModel MapToElementTypeResponse(IContentType contentType)
{
    var containers = contentType.PropertyGroups
        .Select(g => new ElementTypeContainer
        {
            Id = g.Key,
            ParentId = null,
            Name = g.Name,
            Type = g.Type.ToString(),
            SortOrder = g.SortOrder
        })
        .ToList();

    var properties = contentType.PropertyTypes
        .Select(p => MapPropertyType(p, contentType))
        .ToList();

    return new ElementTypeResponseModel
    {
        Id = contentType.Key,
        Alias = contentType.Alias,
        Name = contentType.Name ?? contentType.Alias,
        Containers = containers,
        Properties = properties
    };
}

private ElementTypeProperty MapPropertyType(IPropertyType prop, IContentType contentType)
{
    var dataType = _dataTypeService.GetAsync(prop.DataTypeKey).Result;

    return new ElementTypeProperty
    {
        Id = prop.Key,
        ContainerId = prop.PropertyGroupId.HasValue
            ? contentType.PropertyGroups.FirstOrDefault(g => g.Id == prop.PropertyGroupId.Value)?.Key
            : null,
        Alias = prop.Alias,
        Name = prop.Name ?? prop.Alias,
        Description = prop.Description,
        SortOrder = prop.SortOrder,
        DataTypeId = prop.DataTypeKey,
        PropertyEditorUiAlias = dataType?.EditorUiAlias ?? string.Empty,
        DataTypeConfiguration = dataType?.ConfigurationObject,
        Mandatory = prop.Mandatory,
        MandatoryMessage = prop.MandatoryMessage,
        ValidationRegex = prop.ValidationRegExp,
        ValidationRegexMessage = prop.ValidationRegExpMessage,
        LabelOnTop = prop.LabelOnTop
    };
}
```

### Phase 2 Files to Modify

| File | Change |
|------|--------|
| `src/Merchello.Core/Products/Dtos/ElementTypeResponseModel.cs` | **NEW** |
| `src/Merchello/Controllers/ProductsApiController.cs` | Add endpoint + mapping |

---

## Phase 3: Frontend - Element Type Tab Integration

**Goal:** Render Element Type tabs and properties in the product workspace with visual separation

### 3.1 UI/UX: Tab Layout and Visual Divider

**Requirement:** Visually separate Merchello's commerce tabs from Element Type content tabs.

**Design Specification:**
- Add a **vertical divider line** between the last Merchello tab and the first Element Type tab
- Include a subtle **"Content" label** above the divider to indicate the section change
- Element Type tabs appear **after all Merchello tabs** regardless of single-variant vs multi-variant mode

**Visual Mockup:**
```
┌─────────┬────────────┬───────┬─────┬─────────┬─────────┐ │ ║ ┌─────────┬────────┐
│ Details │ Basic Info │ Media │ SEO │ Options │ Filters │ │ ║ │ Content │ Images │
└─────────┴────────────┴───────┴─────┴─────────┴─────────┘ │ ║ └─────────┴────────┘
                                                           │ ║
           ─────── Merchello Commerce Tabs ───────         │ ║ ── Element Type ──
                                                           ▼ ║        Tabs
                                                        Divider
```

### 3.2 Single-Variant vs Multi-Variant Product Tabs

The existing tabs differ between product types. Element Type tabs appear **after** all Merchello tabs in both cases:

**Single-Variant Product (Simple Product):**
```
Details | Basic Info | Media | Shipping* | SEO | Shopping Feed | Stock | Options | Filters | ║ [Content Tabs...]
```

**Multi-Variant Product:**
```
Details | Media | Shipping* | SEO | Variants | Options | ║ [Content Tabs...]
```

*Shipping tab hidden if `isDigitalProduct = true`

### 3.3 TypeScript Types

Create `src/Merchello/Client/src/products/types/element-type.types.ts`:

```typescript
export interface ElementTypeResponseModel {
  id: string;
  alias: string;
  name: string;
  containers: ElementTypeContainer[];
  properties: ElementTypeProperty[];
}

export interface ElementTypeContainer {
  id: string;
  parentId: string | null;
  name: string | null;
  type: "Tab" | "Group";
  sortOrder: number;
}

export interface ElementTypeProperty {
  id: string;
  containerId: string | null;
  alias: string;
  name: string;
  description: string | null;
  sortOrder: number;
  dataTypeId: string;
  propertyEditorUiAlias: string;
  dataTypeConfiguration: unknown;
  mandatory: boolean;
  mandatoryMessage: string | null;
  validationRegex: string | null;
  validationRegexMessage: string | null;
  labelOnTop: boolean;
}
```

### 3.4 API Client

Add to `merchello-api.ts`:

```typescript
export async function getProductElementType(): Promise<{
  data?: ElementTypeResponseModel | null;
  error?: string;
}> {
  const response = await tryFetchManagementApi("/products/element-type");
  if (!response.ok) {
    return { error: response.statusText };
  }
  const data = await response.json();
  return { data };
}
```

### 3.5 Workspace Context Updates

Add to `product-detail-workspace.context.ts`:

```typescript
#elementType = new UmbObjectState<ElementTypeResponseModel | null>(null);
readonly elementType = this.#elementType.asObservable();

#elementPropertyValues = new UmbObjectState<Record<string, unknown>>({});
readonly elementPropertyValues = this.#elementPropertyValues.asObservable();

async loadElementType(): Promise<void> {
  const { data, error } = await MerchelloApi.getProductElementType();
  if (error) {
    console.error("Failed to load element type:", error);
    return;
  }
  this.#elementType.setValue(data ?? null);
}

setElementPropertyValue(alias: string, value: unknown): void {
  const current = this.#elementPropertyValues.getValue();
  this.#elementPropertyValues.setValue({ ...current, [alias]: value });
}

setElementPropertyValues(values: Record<string, unknown>): void {
  this.#elementPropertyValues.setValue(values);
}

getElementPropertyValues(): Record<string, unknown> {
  return this.#elementPropertyValues.getValue();
}
```

### 3.6 Tab Divider Implementation

Update `_renderTabs()` in `product-detail.element.ts`:

```typescript
private _renderTabs(): unknown {
  const isSingleVariant = this._isSingleVariant();
  const activeTab = this._getActiveTab();
  const elementTypeTabs = this._getElementTypeTabs();
  const hasElementType = this._elementType !== null;

  return html`
    <uui-tab-group slot="header">
      <!-- ========== MERCHELLO COMMERCE TABS ========== -->

      <uui-tab label="Details" href="${this._routerPath}/tab/details" ?active=${activeTab === "details"}>
        Details
        ${this._getTabHint("details") ? html`<uui-badge slot="extra" color="danger" attention>!</uui-badge>` : nothing}
      </uui-tab>

      ${isSingleVariant ? html`
        <uui-tab label="Basic Info" href="${this._routerPath}/tab/basic-info" ?active=${activeTab === "basic-info"}>
          Basic Info
          ${this._validationAttempted && this._hasBasicInfoErrors() ? html`<uui-badge slot="extra" color="danger" attention>!</uui-badge>` : nothing}
        </uui-tab>
      ` : nothing}

      <uui-tab label="Media" href="${this._routerPath}/tab/media" ?active=${activeTab === "media"}>
        Media
      </uui-tab>

      ${!this._formData.isDigitalProduct ? html`
        <uui-tab label="Shipping" href="${this._routerPath}/tab/shipping" ?active=${activeTab === "shipping"}>
          Shipping
        </uui-tab>
      ` : nothing}

      <uui-tab label="SEO" href="${this._routerPath}/tab/seo" ?active=${activeTab === "seo"}>
        SEO
      </uui-tab>

      ${isSingleVariant ? html`
        <uui-tab label="Shopping Feed" href="${this._routerPath}/tab/feed" ?active=${activeTab === "feed"}>
          Shopping Feed
        </uui-tab>
        <uui-tab label="Stock" href="${this._routerPath}/tab/stock" ?active=${activeTab === "stock"}>
          Stock
        </uui-tab>
      ` : nothing}

      ${!isSingleVariant ? html`
        <uui-tab label="Variants" href="${this._routerPath}/tab/variants" ?active=${activeTab === "variants"}>
          Variants (${this._product?.variants.length ?? 0})
          ${this._getTabHint("variants") ? html`<uui-badge slot="extra" color="warning">!</uui-badge>` : nothing}
        </uui-tab>
      ` : nothing}

      <uui-tab label="Options" href="${this._routerPath}/tab/options" ?active=${activeTab === "options"}>
        Options (${this._product?.productOptions.length ?? 0})
        ${this._getTabHint("options") ? html`<uui-badge slot="extra" color="warning">!</uui-badge>` : nothing}
      </uui-tab>

      ${isSingleVariant ? html`
        <uui-tab label="Filters" href="${this._routerPath}/tab/filters" ?active=${activeTab === "filters"}>
          Filters
        </uui-tab>
      ` : nothing}

      <!-- ========== VISUAL DIVIDER ========== -->
      ${hasElementType ? html`
        <div class="tab-section-divider" title="Content Properties">
          <span class="divider-line"></span>
          <span class="divider-label">Content</span>
        </div>
      ` : nothing}

      <!-- ========== ELEMENT TYPE TABS ========== -->
      ${elementTypeTabs.length > 0
        ? elementTypeTabs.map(tab => html`
            <uui-tab
              label=${tab.name ?? "Content"}
              href="${this._routerPath}/tab/content-${tab.id}"
              ?active=${activeTab === `content-${tab.id}`}>
              ${tab.name ?? "Content"}
            </uui-tab>
          `)
        : hasElementType ? html`
            <!-- Single "Content" tab if element type has no tabs defined -->
            <uui-tab
              label="Content"
              href="${this._routerPath}/tab/content"
              ?active=${activeTab === "content"}>
              Content
            </uui-tab>
          ` : nothing
      }
    </uui-tab-group>
  `;
}

private _getElementTypeTabs(): ElementTypeContainer[] {
  if (!this._elementType) return [];
  return this._elementType.containers
    .filter(c => c.type === "Tab" && !c.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
```

### 3.7 CSS for Tab Divider

Add to `product-detail.element.ts` styles:

```css
/* Tab Section Divider */
.tab-section-divider {
  display: flex;
  align-items: center;
  padding: 0 var(--uui-size-space-4);
  height: 100%;
  gap: var(--uui-size-space-2);
}

.tab-section-divider .divider-line {
  width: 1px;
  height: 24px;
  background-color: var(--uui-color-border-standalone);
}

.tab-section-divider .divider-label {
  font-size: var(--uui-type-small-size);
  color: var(--uui-color-text-alt);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  white-space: nowrap;
}
```

### 3.8 Element Properties Component

Create `product-element-properties.element.ts`:

```typescript
import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import type {
  ElementTypeResponseModel,
  ElementTypeProperty,
  ElementTypeContainer
} from "../types/element-type.types.js";
import "@umbraco-cms/backoffice/property";

@customElement("merchello-product-element-properties")
export class MerchelloProductElementPropertiesElement extends LitElement {
  @property({ attribute: false })
  elementType?: ElementTypeResponseModel | null;

  @property({ attribute: false })
  values: Record<string, unknown> = {};

  @property({ type: String })
  activeTabId?: string;

  private _getPropertiesForContainer(containerId: string | null): ElementTypeProperty[] {
    return this.elementType?.properties
      .filter(p => p.containerId === containerId)
      .sort((a, b) => a.sortOrder - b.sortOrder) ?? [];
  }

  private _getGroupsInContainer(containerId: string): ElementTypeContainer[] {
    return this.elementType?.containers
      .filter(c => c.type === "Group" && c.parentId === containerId)
      .sort((a, b) => a.sortOrder - b.sortOrder) ?? [];
  }

  private _onPropertyChange(alias: string, e: CustomEvent): void {
    const value = (e.target as any).value;
    this.dispatchEvent(new CustomEvent("property-change", {
      detail: { alias, value },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    if (!this.elementType) return nothing;

    const containerId = this.activeTabId ?? null;
    const groups = this.activeTabId ? this._getGroupsInContainer(this.activeTabId) : [];
    const directProperties = this._getPropertiesForContainer(containerId);

    return html`
      <div class="element-properties">
        ${directProperties.length > 0 ? this._renderProperties(directProperties) : nothing}

        ${groups.map(group => html`
          <uui-box headline=${group.name ?? ""}>
            ${this._renderProperties(this._getPropertiesForContainer(group.id))}
          </uui-box>
        `)}

        ${directProperties.length === 0 && groups.length === 0 ? html`
          <div class="empty-state">
            <p>No properties configured for this tab.</p>
          </div>
        ` : nothing}
      </div>
    `;
  }

  private _renderProperties(properties: ElementTypeProperty[]) {
    if (properties.length === 0) return nothing;

    return html`
      <umb-property-dataset .value=${this._getDatasetValue(properties)}>
        ${properties.map(prop => html`
          <umb-property
            alias=${prop.alias}
            label=${prop.name}
            description=${prop.description ?? ""}
            property-editor-ui-alias=${prop.propertyEditorUiAlias}
            .config=${prop.dataTypeConfiguration}
            .validation=${{
              mandatory: prop.mandatory,
              mandatoryMessage: prop.mandatoryMessage,
              regEx: prop.validationRegex,
              regExMessage: prop.validationRegexMessage,
            }}
            .appearance=${{ labelOnTop: prop.labelOnTop }}
            @change=${(e: CustomEvent) => this._onPropertyChange(prop.alias, e)}>
          </umb-property>
        `)}
      </umb-property-dataset>
    `;
  }

  private _getDatasetValue(properties: ElementTypeProperty[]) {
    return properties.map(p => ({
      alias: p.alias,
      value: this.values[p.alias],
    }));
  }

  static styles = css`
    :host { display: block; }
    .element-properties { padding: var(--uui-size-layout-1); }
    uui-box { margin-bottom: var(--uui-size-layout-1); }
    uui-box:last-child { margin-bottom: 0; }
    .empty-state {
      padding: var(--uui-size-layout-2);
      text-align: center;
      color: var(--uui-color-text-alt);
    }
  `;
}
```

### 3.9 Product Detail Integration

Update `product-detail.element.ts`:

```typescript
// Add import
import "./product-element-properties.element.js";
import type { ElementTypeResponseModel, ElementTypeContainer } from "../types/element-type.types.js";

// Add to state
@state() private _elementType: ElementTypeResponseModel | null = null;
@state() private _elementPropertyValues: Record<string, unknown> = {};

// Add observers in constructor or connectedCallback
this.observe(this.#workspaceContext.elementType, (elementType) => {
  this._elementType = elementType;
});

this.observe(this.#workspaceContext.elementPropertyValues, (values) => {
  this._elementPropertyValues = values;
});

// Load element type when workspace loads
async connectedCallback() {
  super.connectedCallback();
  // ... existing code ...
  await this.#workspaceContext.loadElementType();
}

// Handle content tab routes
private _getActiveTab(): string {
  const path = this._currentPath;
  // ... existing tab detection ...

  // Handle element type content tabs
  if (path.startsWith("content-")) return path;
  if (path === "content") return "content";

  return "details";
}

// Render element tab content in the appropriate place
private _renderElementTabContent(tabId: string): unknown {
  return html`
    <div class="tab-content">
      <merchello-product-element-properties
        .elementType=${this._elementType}
        .values=${this._elementPropertyValues}
        .activeTabId=${tabId}
        @property-change=${this._onElementPropertyChange}>
      </merchello-product-element-properties>
    </div>
  `;
}

private _onElementPropertyChange(e: CustomEvent<{ alias: string; value: unknown }>) {
  this.#workspaceContext.setElementPropertyValue(e.detail.alias, e.detail.value);
}

// Include in save method
private async _save() {
  const updateDto: UpdateProductRootDto = {
    // ... existing fields ...
    elementProperties: this.#workspaceContext.getElementPropertyValues(),
  };
  // ... save logic ...
}
```

### Phase 3 Files to Modify

| File | Change |
|------|--------|
| `src/Merchello/Client/src/products/types/element-type.types.ts` | **NEW** |
| `src/Merchello/Client/src/api/merchello-api.ts` | Add `getProductElementType()` |
| `src/Merchello/Client/src/products/contexts/product-detail-workspace.context.ts` | State + methods |
| `src/Merchello/Client/src/products/components/product-element-properties.element.ts` | **NEW** |
| `src/Merchello/Client/src/products/components/product-detail.element.ts` | Tabs + divider + integration |

---

## Phase 4: Front-End Rendering (IPublishedElement)

**Goal:** Create `IPublishedElement` from stored JSON so Razor views can use `Model.Content.Value<T>()`

### 4.1 MerchelloPublishedElementFactory

Create `src/Merchello.Umbraco/Factories/MerchelloPublishedElementFactory.cs`:

```csharp
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PublishedCache;
using Umbraco.Cms.Core.Routing;

namespace Merchello.Umbraco.Factories;

/// <summary>
/// Factory for creating IPublishedElement instances from stored JSON property data.
/// Used to provide proper Umbraco property value conversion for product element properties.
/// </summary>
public class MerchelloPublishedElementFactory(
    IPublishedContentTypeCache contentTypeCache,
    IVariationContextAccessor variationContextAccessor)
{
    /// <summary>
    /// Creates an IPublishedElement from stored property values.
    /// </summary>
    /// <param name="elementTypeAlias">Alias of the Element Type</param>
    /// <param name="elementKey">Unique key for this element instance (use ProductRoot.Id)</param>
    /// <param name="propertyValues">Property values as { alias: rawValue } dictionary</param>
    /// <returns>IPublishedElement with properly converted property values, or null if type not found</returns>
    public IPublishedElement? CreateElement(
        string elementTypeAlias,
        Guid elementKey,
        Dictionary<string, object?> propertyValues)
    {
        var publishedContentType = contentTypeCache.Get(
            PublishedItemType.Element,
            elementTypeAlias);

        if (publishedContentType is null)
            return null;

        var variationContext = variationContextAccessor.VariationContext
            ?? new VariationContext();

        // Umbraco's PublishedElement handles:
        // 1. Creating IPublishedProperty for each property type
        // 2. Property value converters process raw values → typed objects
        // 3. GetValue<T>() returns properly typed, converted values
        return new PublishedElement(
            publishedContentType,
            elementKey,
            propertyValues,
            previewing: false,
            variationContext);
    }
}
```

### 4.2 Update MerchelloPublishedProduct

```csharp
public class MerchelloPublishedProduct : IPublishedContent
{
    private readonly ProductRoot _productRoot;
    private readonly IPublishedElement? _element;

    public MerchelloPublishedProduct(
        ProductRoot productRoot,
        MerchelloProductViewModel viewModel,
        IPublishedElement? element = null)
    {
        _productRoot = productRoot;
        ViewModel = viewModel;
        _element = element;
    }

    public MerchelloProductViewModel ViewModel { get; }
    public string? ViewAlias => _productRoot.ViewAlias;

    // Route hijacking - always "MerchelloProduct" regardless of element type
    public IPublishedContentType ContentType =>
        _element?.ContentType is not null
            ? new MerchelloProductContentType(_element.ContentType)
            : MerchelloProductContentType.Instance;

    // Element properties accessible via IPublishedContent interface
    public IEnumerable<IPublishedProperty> Properties =>
        _element?.Properties ?? Enumerable.Empty<IPublishedProperty>();

    public IPublishedProperty? GetProperty(string alias) =>
        _element?.GetProperty(alias);

    // IPublishedElement
    public Guid Key => _productRoot.Id;

    // ... rest of IPublishedContent implementation unchanged ...
}
```

### 4.3 Update MerchelloProductContentType

Hybrid content type that returns "MerchelloProduct" for route hijacking while delegating property types to the element type:

```csharp
public class MerchelloProductContentType : IPublishedContentType
{
    private readonly IPublishedContentType? _elementType;

    public static readonly MerchelloProductContentType Instance = new();

    public MerchelloProductContentType(IPublishedContentType? elementType = null)
    {
        _elementType = elementType;
    }

    // Always "MerchelloProduct" for route hijacking
    public string Alias => "MerchelloProduct";

    public Guid Key => _elementType?.Key ?? new Guid("00000000-0000-0000-0000-MERCHPRODUCT");
    public int Id => _elementType?.Id ?? -1000;
    public PublishedItemType ItemType => PublishedItemType.Content;
    public HashSet<string> CompositionAliases => _elementType?.CompositionAliases ?? [];
    public ContentVariation Variations => _elementType?.Variations ?? ContentVariation.Nothing;
    public bool IsElement => false;

    // Delegate property types to element type
    public IEnumerable<IPublishedPropertyType> PropertyTypes =>
        _elementType?.PropertyTypes ?? Enumerable.Empty<IPublishedPropertyType>();

    public int GetPropertyIndex(string alias) =>
        _elementType?.GetPropertyIndex(alias) ?? -1;

    public IPublishedPropertyType? GetPropertyType(string alias) =>
        _elementType?.GetPropertyType(alias);

    public IPublishedPropertyType? GetPropertyType(int index) =>
        _elementType?.GetPropertyType(index);
}
```

### 4.4 Update ProductContentFinder

```csharp
public class ProductContentFinder(
    IProductService productService,
    IMerchelloViewModelFactory viewModelFactory,
    MerchelloPublishedElementFactory elementFactory,
    IOptions<MerchelloSettings> settings,
    ILogger<ProductContentFinder> logger) : IContentFinder
{
    public async Task<bool> TryFindContent(IPublishedRequestBuilder request)
    {
        // ... existing URL resolution logic ...

        var productRoot = await productService.GetByRootUrlAsync(rootUrl);
        if (productRoot is null) return false;

        Product? selectedVariant = /* ... existing logic ... */;

        // Create element from stored data if configured
        IPublishedElement? element = null;
        var elementTypeAlias = settings.Value.ProductElementTypeAlias;

        if (!string.IsNullOrEmpty(elementTypeAlias))
        {
            var propertyValues = productService.DeserializeElementProperties(
                productRoot.ElementPropertyData);

            if (propertyValues.Count > 0)
            {
                element = elementFactory.CreateElement(
                    elementTypeAlias,
                    productRoot.Id,
                    propertyValues);

                if (element is null)
                {
                    logger.LogWarning(
                        "Failed to create element for product {ProductId} with type {ElementType}",
                        productRoot.Id, elementTypeAlias);
                }
            }
        }

        var viewModel = viewModelFactory.CreateProductViewModel(productRoot, selectedVariant);
        var publishedProduct = new MerchelloPublishedProduct(productRoot, viewModel, element);

        request.SetPublishedContent(publishedProduct);
        return true;
    }
}
```

### 4.5 Register Services

In `MerchelloUmbracoComposer.cs`:

```csharp
builder.Services.AddScoped<MerchelloPublishedElementFactory>();
```

### Phase 4 Files to Modify

| File | Change |
|------|--------|
| `src/Merchello.Umbraco/Factories/MerchelloPublishedElementFactory.cs` | **NEW** |
| `src/Merchello.Umbraco/Models/MerchelloPublishedProduct.cs` | Add element support |
| `src/Merchello.Umbraco/Models/MerchelloProductContentType.cs` | Delegate to element |
| `src/Merchello.Umbraco/Routing/ProductContentFinder.cs` | Create element |
| `src/Merchello.Umbraco/MerchelloUmbracoComposer.cs` | Register factory |

---

## Phase 5: Razor View Usage

**Goal:** Document and test property access in Razor views using `IPublishedContent` extension methods

### 5.1 Basic Property Access

With element properties properly exposed via `IPublishedProperty`, Razor views can access them naturally using Umbraco's standard methods:

```csharp
@model MerchelloProductViewModel
@inherits Umbraco.Cms.Web.Common.Views.UmbracoViewPage

<h1>@Model.ProductRoot.RootName</h1>

@* Access element properties via Model.Content *@
@if (Model.Content.HasValue("productDescription"))
{
    <div class="description">
        @Model.Content.Value<IHtmlEncodedString>("productDescription")
    </div>
}

@* Simple text property *@
<p>@Model.Content.Value<string>("subtitle")</p>

@* Check for null values *@
@{
    var tagline = Model.Content.Value<string>("tagline");
}
@if (!string.IsNullOrEmpty(tagline))
{
    <p class="tagline">@tagline</p>
}
```

### 5.2 Media Picker Properties

```csharp
@model MerchelloProductViewModel

@* Single Media Picker *@
@{
    var heroImage = Model.Content.Value<MediaWithCrops>("heroImage");
}
@if (heroImage != null)
{
    <img src="@heroImage.GetCropUrl(width: 1200)" alt="@Model.ProductRoot.RootName" />
}

@* Media Picker with focal point cropping *@
@{
    var bannerImage = Model.Content.Value<MediaWithCrops>("bannerImage");
}
@if (bannerImage != null)
{
    <div class="banner" style="background-image: url('@bannerImage.GetCropUrl("banner")')">
        <h2>@Model.ProductRoot.RootName</h2>
    </div>
}

@* Multiple Media Picker *@
@{
    var gallery = Model.Content.Value<IEnumerable<MediaWithCrops>>("productGallery");
}
@if (gallery?.Any() == true)
{
    <div class="product-gallery">
        @foreach (var image in gallery)
        {
            <img src="@image.GetCropUrl(width: 400, height: 400)"
                 alt="@image.Name"
                 loading="lazy" />
        }
    </div>
}
```

### 5.3 Block List Properties

```csharp
@model MerchelloProductViewModel

@* Block List - Using built-in HTML helper *@
@{
    var features = Model.Content.Value<BlockListModel>("productFeatures");
}
@if (features?.Any() == true)
{
    <section class="features">
        <h2>Features</h2>
        @await Html.GetBlockListHtmlAsync(features)
    </section>
}

@* Block List - Custom rendering *@
@{
    var specifications = Model.Content.Value<BlockListModel>("specifications");
}
@if (specifications?.Any() == true)
{
    <table class="specifications">
        @foreach (var block in specifications)
        {
            @* Render each block based on its content type alias *@
            @await Html.PartialAsync($"BlockList/Components/{block.Content.ContentType.Alias}", block)
        }
    </table>
}
```

### 5.4 Other Property Types

```csharp
@model MerchelloProductViewModel

@* Content Picker *@
@{
    var relatedPage = Model.Content.Value<IPublishedContent>("relatedPage");
}
@if (relatedPage != null)
{
    <a href="@relatedPage.Url()">@relatedPage.Name</a>
}

@* Multi-Node Tree Picker *@
@{
    var relatedProducts = Model.Content.Value<IEnumerable<IPublishedContent>>("relatedProducts");
}
@if (relatedProducts?.Any() == true)
{
    <div class="related-products">
        <h3>You May Also Like</h3>
        @foreach (var product in relatedProducts)
        {
            <a href="@product.Url()">@product.Name</a>
        }
    </div>
}

@* Tags *@
@{
    var tags = Model.Content.Value<IEnumerable<string>>("productTags");
}
@if (tags?.Any() == true)
{
    <div class="tags">
        @foreach (var tag in tags)
        {
            <span class="tag">@tag</span>
        }
    </div>
}

@* Boolean (True/False) *@
@if (Model.Content.Value<bool>("showOnHomepage"))
{
    <span class="badge">Featured</span>
}

@* Numeric *@
@{
    var rating = Model.Content.Value<decimal>("averageRating");
}
@if (rating > 0)
{
    <div class="rating">Rating: @rating / 5</div>
}
```

### 5.5 Strongly-Typed Models (Models Builder)

When using Models Builder, you can generate strongly-typed models for your element type:

```csharp
@model MerchelloProductViewModel
@{
    // Cast Content to generated model if using ModelsBuilder
    // Assumes Element Type alias is "productContent"
    var content = Model.Content as ProductContent;
}

@if (content != null)
{
    <div class="product-content">
        @* Strongly-typed property access *@
        <div class="description">
            @content.ProductDescription
        </div>

        @if (content.HeroImage != null)
        {
            <img src="@content.HeroImage.GetCropUrl(width: 1200)"
                 alt="@Model.ProductRoot.RootName" />
        }

        @if (content.ProductFeatures?.Any() == true)
        {
            <section class="features">
                @await Html.GetBlockListHtmlAsync(content.ProductFeatures)
            </section>
        }
    </div>
}
```

### 5.6 Complete Product View Example

```csharp
@model MerchelloProductViewModel
@inherits Umbraco.Cms.Web.Common.Views.UmbracoViewPage
@{
    Layout = "_Layout.cshtml";

    // Element Type properties (strongly-typed optional)
    var heroImage = Model.Content.Value<MediaWithCrops>("heroImage");
    var description = Model.Content.Value<IHtmlEncodedString>("productDescription");
    var features = Model.Content.Value<BlockListModel>("productFeatures");
}

<article class="product-page">
    @* Hero Section *@
    <header class="product-hero">
        @if (heroImage != null)
        {
            <img src="@heroImage.GetCropUrl("hero")" alt="@Model.ProductRoot.RootName" />
        }
        <h1>@Model.ProductRoot.RootName</h1>
        <p class="price">@Model.Price.ToString("C")</p>

        @if (Model.OnSale && Model.PreviousPrice.HasValue)
        {
            <p class="was-price">Was @Model.PreviousPrice.Value.ToString("C")</p>
        }
    </header>

    @* Description from Element Type *@
    @if (description != null)
    {
        <section class="description">
            @description
        </section>
    }

    @* Product Images (from Merchello) *@
    <div class="gallery">
        @foreach (var image in Model.Images)
        {
            <img src="@image" alt="@Model.ProductRoot.RootName" />
        }
    </div>

    @* Variant Picker (from Merchello) *@
    @if (Model.AllVariants.Count > 1)
    {
        <div class="variant-picker">
            @foreach (var option in Model.VariantOptions)
            {
                <div class="option-group">
                    <label>@option.Name</label>
                    <select name="option-@option.Alias">
                        @foreach (var value in option.ProductOptionValues)
                        {
                            <option value="@value.Id">@value.Name</option>
                        }
                    </select>
                </div>
            }
        </div>
    }

    @* Add to Cart *@
    @if (Model.AvailableForPurchase)
    {
        <button class="add-to-cart">Add to Basket</button>
    }
    else
    {
        <p class="out-of-stock">Out of Stock</p>
    }

    @* Features from Element Type *@
    @if (features?.Any() == true)
    {
        <section class="features">
            <h2>Features</h2>
            @await Html.GetBlockListHtmlAsync(features)
        </section>
    }
</article>
```

### Phase 5 Files

| File | Change |
|------|--------|
| `Views/Products/Default.cshtml` | Example view using element properties |
| `Views/Products/Gallery.cshtml` | Example gallery view |
| `Views/Shared/_Layout.cshtml` | Ensure layout works with `MerchelloProductViewModel` |

---

## Appendix: MerchelloProductViewModel Element Support

Add element-related properties to the view model to support `IPublishedContent` property access:

```csharp
public class MerchelloProductViewModel : IContentModel
{
    // ... existing properties ...

    /// <summary>
    /// The IPublishedContent wrapper for Umbraco compatibility.
    /// Also provides access to element type properties via Properties.
    /// </summary>
    public IPublishedContent Content { get; }

    /// <summary>
    /// Direct access to element properties.
    /// Prefer using Content.Value&lt;T&gt;() for type-safe access.
    /// </summary>
    public IEnumerable<IPublishedProperty> Properties => Content.Properties;
}
```

---

## Summary: Implementation Checklist by Phase

### Phase 1: Backend Foundation
- [ ] Add `ProductElementTypeAlias` to `MerchelloSettings.cs`
- [ ] Add `ElementPropertyData` property to `ProductRoot.cs`
- [ ] Update `ProductRootDbMapping.cs` to map property
- [ ] Add `ElementProperties` to `ProductRootDetailDto.cs`
- [ ] Add `ElementProperties` to `UpdateProductRootDto.cs`
- [ ] Add `GetProductElementTypeAsync()` to `IProductService`
- [ ] Implement method in `ProductService.cs`
- [ ] Run migration via `scripts/add-migration.ps1` (combined with View Selection migration)

### Phase 2: API Endpoint
- [ ] Create `ElementTypeResponseModel.cs` and related DTOs
- [ ] Add `GET /products/element-type` endpoint to `ProductsApiController.cs`
- [ ] Implement `MapToElementTypeResponse()` mapping method

### Phase 3: Frontend Integration
- [ ] Create `element-type.types.ts` type definitions
- [ ] Add `getProductElementType()` to `merchello-api.ts`
- [ ] Add element type state to `product-detail-workspace.context.ts`
- [ ] Create `product-element-properties.element.ts` component
- [ ] Update `product-detail.element.ts`:
  - [ ] Add tab divider CSS and markup
  - [ ] Render Element Type tabs after Merchello tabs
  - [ ] Handle both single-variant and multi-variant tab layouts
  - [ ] Integrate property change handling
  - [ ] Include `elementProperties` in save

### Phase 4: Front-End Rendering (IPublishedElement)
- [ ] Create `MerchelloPublishedElementFactory.cs`
- [ ] Update `MerchelloPublishedProduct.cs` to support element properties
- [ ] Update `MerchelloProductContentType.cs` to delegate property types
- [ ] Update `ProductContentFinder.cs` to create element from stored data
- [ ] Register `MerchelloPublishedElementFactory` in DI

### Phase 5: Testing & Documentation
- [ ] Test basic property access in Razor views
- [ ] Test Media Picker properties
- [ ] Test Block List rendering
- [ ] Test Models Builder integration (if enabled)
- [ ] Create example product views

---

## Database Migration

**Run migration via:** `scripts/add-migration.ps1`

Single migration adds all new columns:
- `merchelloProductRoots.ViewAlias` (nvarchar 200, nullable)
- `merchelloProductRoots.ElementPropertyData` (nvarchar(max), nullable)
- Index on `merchelloProductRoots.RootUrl`
- Index on `merchelloProducts.Url`
