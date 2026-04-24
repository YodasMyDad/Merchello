# Product Page Routing

One of Merchello's most distinctive features is that products render at root-level URLs without needing Umbraco content nodes. A product at `/mesh-office-chair` is not a content page in Umbraco -- it is a virtual page created by Merchello's routing system. This guide explains how it works and how to customize it.

## How It Works

The routing pipeline has three components:

1. **ProductContentFinder** -- intercepts requests and looks up products. Source: [ProductContentFinder.cs](../../../src/Merchello/Routing/ProductContentFinder.cs).
2. **MerchelloPublishedProduct** -- a virtual `IPublishedContent` that Umbraco's rendering pipeline can work with. Source: [MerchelloPublishedProduct.cs](../../../src/Merchello/Models/MerchelloPublishedProduct.cs).
3. **MerchelloProductController** -- renders the product view. Source: [MerchelloProductController.cs](../../../src/Merchello/Controllers/MerchelloProductController.cs).

### Step 1: ProductContentFinder

When a request comes in, Umbraco's content finders run in order. `ProductContentFinder` is registered **after** Umbraco's default `ContentFinderByUrl`, so actual Umbraco content always takes priority.

```
Request: /mesh-office-chair/blue-large
         ↓
Umbraco ContentFinderByUrl → no content node found
         ↓
ProductContentFinder:
  1. Split path into segments: ["mesh-office-chair", "blue-large"]
  2. Look up ProductRoot by RootUrl = "mesh-office-chair"
  3. If segments.Length > 1, find variant with Url = "blue-large"
  4. If segments.Length == 1, use the default variant
  5. Create MerchelloPublishedProduct
  6. Set as published content for the request
```

If no `ProductRoot` matches the first path segment, the content finder returns `false` and Umbraco continues with its normal 404 handling.

### Step 2: MerchelloPublishedProduct

`MerchelloPublishedProduct` implements `IPublishedContent`, which is what Umbraco's rendering pipeline expects. It wraps the `ProductRoot` data and presents it as virtual content.

Key properties:
- `ContentType.Alias` returns `"MerchelloProduct"` -- this triggers route hijacking to `MerchelloProductController`
- `Name` returns the product's `RootName`
- `Key` returns the `ProductRoot.Id`
- `ViewModel` contains the `MerchelloProductViewModel` with all product data
- `ViewAlias` determines which Razor view to use
- `Properties` exposes element type properties (if configured)

### Step 3: MerchelloProductController

Because the content type alias is `"MerchelloProduct"`, Umbraco's route hijacking invokes `MerchelloProductController`:

```csharp
public class MerchelloProductController : RenderController
{
    public override IActionResult Index()
    {
        if (CurrentPage is not MerchelloPublishedProduct product)
            return NotFound();

        var viewPath = ResolveViewPath(product);
        var viewResult = compositeViewEngine.GetView(null, viewPath, true);

        if (!viewResult.Success)
            return NotFound();

        return View(viewPath, CreateViewModel(product));
    }

    protected virtual string ResolveViewPath(MerchelloPublishedProduct product)
    {
        var viewAlias = product.ViewAlias ?? "Default";
        return $"~/Views/Products/{viewAlias}.cshtml";
    }

    protected virtual MerchelloProductViewModel CreateViewModel(
        MerchelloPublishedProduct product)
    {
        return product.ViewModel;
    }
}
```

## View Resolution

The view is selected based on the `ViewAlias` property of the `ProductRoot`:

| ViewAlias | Resolved Path |
|-----------|--------------|
| `null` or empty | `~/Views/Products/Default.cshtml` |
| `"Default"` | `~/Views/Products/Default.cshtml` |
| `"Gallery"` | `~/Views/Products/Gallery.cshtml` |
| `"Digital"` | `~/Views/Products/Digital.cshtml` |

The `ViewAlias` is set per product in the backoffice. This means different products can use different view templates.

> **Tip:** You can configure where Merchello looks for views using the `ProductViewLocations` setting in `appsettings.json`. The default is `["~/Views/Products/"]`.

If the resolved view does not exist, `MerchelloProductController` returns a 404 rather than throwing an error.

## URL Structure

### Root Product URL

Every product root has a `RootUrl` that is auto-generated from the product name using slug helpers. For example:

- "Mesh Office Chair" becomes `mesh-office-chair`
- "Classic T-Shirt" becomes `classic-t-shirt`

The product is accessible at `/{RootUrl}` (e.g., `/mesh-office-chair`).

### Variant URLs

Variants can have their own URL segment. The full URL for a variant is `/{RootUrl}/{VariantUrl}`:

- `/mesh-office-chair` -- the default variant
- `/mesh-office-chair/blue-large` -- a specific variant

When the URL has only one segment, `ProductContentFinder` returns the default variant (the one with `Product.Default = true`, or the first variant if none is marked as default).

## Enabling and Disabling

Product routing can be disabled entirely:

```json
{
  "Merchello": {
    "EnableProductRendering": false
  }
}
```

When disabled, `ProductContentFinder` is not registered, and product URLs will return 404 unless you handle them yourself. This is useful for headless installations where the frontend is separate.

## Customizing the Controller

You can override `MerchelloProductController` to customize behavior. Create your own controller that inherits from it:

```csharp
public class CustomProductController : MerchelloProductController
{
    public CustomProductController(
        ILogger<CustomProductController> logger,
        ICompositeViewEngine compositeViewEngine,
        IUmbracoContextAccessor umbracoContextAccessor)
        : base(logger, compositeViewEngine, umbracoContextAccessor)
    {
    }

    protected override MerchelloProductViewModel CreateViewModel(
        MerchelloPublishedProduct product)
    {
        var baseModel = base.CreateViewModel(product);
        // Add extra data to the model, or return a custom model type
        return baseModel;
    }

    protected override string ResolveViewPath(MerchelloPublishedProduct product)
    {
        // Custom view resolution logic
        // e.g., use product type to determine the view
        return base.ResolveViewPath(product);
    }
}
```

> **Note:** Because this uses Umbraco's route hijacking (matching controller name to content type alias), the controller must be named `MerchelloProductController`. If you need a differently-named controller, you would need to use a custom content finder approach.

## How It Interacts with Umbraco Content

Since `ProductContentFinder` runs after `ContentFinderByUrl`:

1. If an Umbraco content node exists at `/mesh-office-chair`, the content node wins
2. Only if no content is found does Merchello check for a product

This means you can always "override" a product URL by creating an Umbraco content node at the same path. In practice, this rarely happens because products and content serve different purposes.

## Element Type Properties

When a product has an `ElementTypeAlias` configured, `ProductContentFinder` also creates an `IPublishedElement` from the stored property data. This element is attached to `MerchelloPublishedProduct`, making the properties accessible via the standard `Content.Value<T>()` syntax in views.

See the [Element Type Properties](./element-type-properties.md) guide for details.

## Next Steps

- [Building Product Views](./product-views.md) -- creating the Razor views that render products
- [Element Type Properties](./element-type-properties.md) -- adding custom properties to products
- [Products Overview](./products-overview.md) -- the full product data model
