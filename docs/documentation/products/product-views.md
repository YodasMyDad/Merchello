# Building Product Views

Product views are Razor `.cshtml` files that render your product pages. They receive a `MerchelloProductViewModel` with all the data you need -- product details, pricing, variants, stock, images, and SEO metadata.

The reference implementation is the starter site's [Default.cshtml](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Site/Views/Products/Default.cshtml) -- it demonstrates every pattern shown in this guide.

## The Basics

Product views live in `~/Views/Products/` and are selected based on the product's `ViewAlias`. The simplest starting point is `Default.cshtml`:

```html
@model MerchelloProductViewModel
@inherits UmbracoViewPage<MerchelloProductViewModel>
@{
    Layout = "~/Views/Website.cshtml";
}

<h1>@Model.ProductRoot.RootName</h1>
<p>@Model.SelectedVariant.Sku - @Model.Price.ToString("C")</p>
```

> **Note:** Your view must use `@model MerchelloProductViewModel` and `@inherits UmbracoViewPage<MerchelloProductViewModel>` for Umbraco compatibility.

## MerchelloProductViewModel Properties

The view model gives you everything you need:

### Product Identity

```csharp
Model.ProductRoot.RootName     // "Mesh Office Chair"
Model.ProductRoot.RootUrl      // "mesh-office-chair"
Model.ProductRoot.Description  // Rich text HTML content
Model.ProductUrl               // "/mesh-office-chair"
Model.SelectedVariantUrl       // "/mesh-office-chair/blue-large"
```

### Pricing

```csharp
Model.Price                    // Current selling price (decimal)
Model.PreviousPrice            // Strike-through price if on sale (decimal?)
Model.OnSale                   // Whether this variant is on sale (bool)
```

These are the raw net prices from the selected variant. For display with tax and currency conversion, you need the display context (see below).

### Stock

```csharp
Model.TotalStock               // Total stock across all warehouses
Model.AvailableForPurchase     // Whether the variant is purchasable
Model.TrackStock               // Whether stock tracking is enabled
```

### Media

```csharp
Model.Images                   // Combined root + variant images (unless excluded)
                               // Returns IReadOnlyList<string> of media keys
```

### SEO

```csharp
Model.MetaTitle                // Page title (falls back to RootName)
Model.MetaDescription          // Meta description
Model.CanonicalUrl             // Canonical URL for duplicate content
```

### Variants and Options

```csharp
Model.SelectedVariant          // The currently selected Product
Model.AllVariants              // All variants for this product root
Model.VariantOptions           // Options with IsVariant == true
Model.AddOnOptions             // Options with IsVariant == false

Model.GetVariantUrl(variant)   // URL for a specific variant
Model.IsVariantSelected(variant) // Whether a variant is the current one
```

### Element Properties

```csharp
Model.Content                  // IPublishedContent (for element type properties)
Model.Properties               // Element properties directly
Model.Content.Value<T>("alias") // Type-safe property access
```

## Displaying Prices with Tax and Currency

The raw `Model.Price` is a net price in your store currency. To display prices correctly (with tax, in the customer's currency), you need the display context.

> **Invariant:** Stored prices never change when the customer's display currency changes. Display uses multiply (`amount * ExchangeRate`); checkout and payment use divide via the invoice conversion path. Never charge a customer using display amounts. See [Storefront Context](../storefront/storefront-context.md) and [Price Display](../storefront/price-display.md) for the rules.

This pattern is lifted from [Default.cshtml:23-79](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Site/Views/Products/Default.cshtml#L23):

```html
@inject Merchello.Core.Storefront.Services.Interfaces.IStorefrontContextService StorefrontContext
@inject Merchello.Core.Accounting.Services.Interfaces.ITaxService TaxService
@inject Merchello.Core.Shared.Services.Interfaces.ICurrencyService CurrencyService
@inject Microsoft.Extensions.Options.IOptions<Merchello.Core.Shared.Models.MerchelloSettings> Settings

@{
    var settings = Settings.Value;
    var displayContext = await StorefrontContext.GetDisplayContextAsync();

    // Calculate tax multiplier if displaying inc. tax
    decimal taxRate = 0m;
    if (displayContext.DisplayPricesIncTax && Model.ProductRoot.TaxGroupId is Guid taxGroupId)
    {
        taxRate = await TaxService.GetApplicableRateAsync(
            taxGroupId,
            displayContext.TaxCountryCode,
            displayContext.TaxRegionCode);
    }

    var taxMultiplier = displayContext.DisplayPricesIncTax ? 1 + (taxRate / 100m) : 1m;

    // Helper to calculate display price (with tax + exchange rate + rounding)
    decimal CalculateDisplayPrice(decimal netPrice)
    {
        var priceWithTax = netPrice * taxMultiplier;
        return CurrencyService.Round(
            priceWithTax * displayContext.ExchangeRate,
            displayContext.CurrencyCode);
    }

    var displayPrice = CalculateDisplayPrice(Model.Price);
    var priceFormat = $"N{displayContext.DecimalPlaces}";
}

<span class="price">
    @displayContext.CurrencySymbol@displayPrice.ToString(priceFormat)
</span>
@if (Model.OnSale && Model.PreviousPrice.HasValue)
{
    var displayPreviousPrice = CalculateDisplayPrice(Model.PreviousPrice.Value);
    <span class="previous-price">
        @displayContext.CurrencySymbol@displayPreviousPrice.ToString(priceFormat)
    </span>
}
```

The display context provides:
- `CurrencySymbol` -- the symbol for the display currency (e.g., "$", "£")
- `CurrencyCode` -- the display currency ISO code
- `ExchangeRate` -- rate to convert from store currency to display currency
- `DecimalPlaces` -- number of decimal places for the display currency
- `DisplayPricesIncTax` -- whether to include tax
- `TaxCountryCode` / `TaxRegionCode` -- customer's tax-relevant location

## Rendering Images

Images are stored as Umbraco media keys. Use the `ToMedia()` extension to resolve them:

```html
@inject Umbraco.Cms.Core.PublishedCache.IPublishedMediaCache MediaCache
@using Merchello.Extensions

@{
    var images = Model.Images.ToMedia(MediaCache).ToList();
}

<div class="product-gallery">
    @foreach (var image in images)
    {
        <img src="@image.GetCropUrl(width: 800)" alt="@Model.ProductRoot.RootName" />
    }
</div>
```

## Rendering Rich Text Description

Product descriptions use a rich text format. Use the `IRichTextRenderer` to convert to HTML:

```html
@inject Merchello.Services.IRichTextRenderer RichTextRenderer
@using Umbraco.Cms.Core.Strings

@{
    // Element type property description (if configured)
    var elementDescription = Model.Content.Value<IHtmlEncodedString>("productDescription");

    // Root description (stored as rich text JSON)
    var hasRootDescription = !string.IsNullOrEmpty(Model.ProductRoot.Description);
}

@if (elementDescription != null)
{
    @elementDescription
}
@if (hasRootDescription)
{
    @Model.ProductRoot.Description.ToTipTapHtml(RichTextRenderer)
}
```

## Rendering Variant Selectors

For interactive variant selection, the starter site passes product data as JSON and uses Alpine.js. Here is the approach:

```html
@{
    // Build variant config for the frontend
    var config = new
    {
        productId = Model.ProductRoot.Id.ToString(),
        selectedVariantId = Model.SelectedVariant.Id.ToString(),
        variants = Model.AllVariants.Select(v => new
        {
            id = v.Id.ToString(),
            name = v.Name,
            price = v.Price,
            sku = v.Sku,
            variantOptionsKey = v.VariantOptionsKey,
            url = Model.GetVariantUrl(v)
        }).ToList(),
        variantOptions = Model.VariantOptions
            .OrderBy(o => o.SortOrder)
            .Select(o => new
            {
                name = o.Name,
                alias = o.Alias,
                uiType = o.OptionUiAlias ?? "dropdown",
                values = o.ProductOptionValues.Select(v => new
                {
                    id = v.Id.ToString(),
                    name = v.Name,
                    hexValue = v.HexValue
                }).ToList()
            }).ToList()
    };

    var configJson = System.Text.Json.JsonSerializer.Serialize(config);
}

<div x-data='productPage(@Html.Raw(configJson))'>
    <!-- Your variant selectors here -->
    <template x-for="option in config.variantOptions">
        <!-- Render based on option.uiType -->
    </template>
</div>
```

> **Tip:** You are not required to use Alpine.js. The starter site uses it for convenience, but you can use React, Vue, vanilla JS, or any framework you prefer. The key is getting the variant data into your frontend code.

## Stock Availability

For accurate stock display, use `IStorefrontContextService.GetProductAvailabilityAsync()`:

```html
@{
    var availability = await StorefrontContext.GetProductAvailabilityAsync(
        Model.SelectedVariant, quantity: 1);

    var inStock = availability.CanShipToLocation && availability.HasStock;
    var isLowStock = Model.TrackStock
        && availability.AvailableStock > 0
        && availability.AvailableStock <= settings.LowStockThreshold;
}

@if (inStock)
{
    <span class="badge bg-success">In Stock</span>
    @if (isLowStock)
    {
        <span class="text-warning">Low Stock</span>
    }
    @if (availability.ShowStockLevels)
    {
        <span>@availability.AvailableStock available</span>
    }
}
else if (!availability.CanShipToLocation)
{
    <span class="badge bg-secondary">Not available in your region</span>
}
else
{
    <span class="badge bg-danger">Out of Stock</span>
}
```

## SEO Meta Tags

The view model provides SEO properties. The starter site renders them in a `@section Head`:

```html
@section Head {
    @if (!string.IsNullOrEmpty(Model.MetaDescription))
    {
        <meta name="description" content="@Model.MetaDescription" />
    }
    @if (!string.IsNullOrEmpty(Model.CanonicalUrl))
    {
        <link rel="canonical" href="@Model.CanonicalUrl" />
    }

    <meta property="og:title" content="@Model.MetaTitle" />
    <meta property="og:type" content="product" />
    <meta property="product:price:amount" content="@Model.Price" />
    <meta property="product:price:currency" content="@settings.StoreCurrencyCode" />

    <title>@Model.MetaTitle</title>
}
```

## Using Partials

The starter site splits the product page into partials for maintainability ([Default.cshtml:261-282](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Site/Views/Products/Default.cshtml#L261)):

```html
<div class="row">
    @await Html.PartialAsync("~/Views/Products/Partials/_ProductGallery.cshtml", Model)
    @await Html.PartialAsync(
        "~/Views/Products/Partials/_ProductPurchasePanel.cshtml",
        Model,
        new ViewDataDictionary(ViewData)
        {
            ["Settings"] = settings,
            ["DisplayContext"] = displayContext,
            ["IncludesTax"] = includesTax,
            ["SsrDisplayPrice"] = displayPrice
        })
</div>
```

You can create your own partials for any section of the product page.

## Creating Multiple Views

Different products can use different views. Set the `ViewAlias` on a product root in the backoffice:

- `"Default"` -> `~/Views/Products/Default.cshtml` (standard product page)
- `"Gallery"` -> `~/Views/Products/Gallery.cshtml` (image-heavy layout)
- `"Digital"` -> `~/Views/Products/Digital.cshtml` (digital product layout)

Create additional `.cshtml` files in `~/Views/Products/` and they become available as view options.

## Next Steps

- [Product Routing](./product-routing.md) -- how the URL-to-view pipeline works
- [Element Type Properties](./element-type-properties.md) -- adding custom properties
- [Variants and Options](./variants-and-options.md) -- the option system
