# Variants, Options, and Add-ons

Merchello's product option system serves two purposes: generating purchasable variants (like "Blue / Large") and defining add-on modifiers (like "Gift Wrapping" or "Extended Warranty"). The key distinction is controlled by a single flag: `IsVariant`.

## Understanding the Two Types

### Variant Options (IsVariant = true)

When `IsVariant` is `true` (the default), the option **generates variants**. Each combination of variant option values creates a separate `Product` entity with its own SKU, price, stock, and images.

Example: A t-shirt with Color (Red, Blue) and Size (S, M, L) generates 6 variants:
- Red / S
- Red / M
- Red / L
- Blue / S
- Blue / M
- Blue / L

Each of these is a distinct `Product` record that customers choose between.

### Add-on Options (IsVariant = false)

When `IsVariant` is `false`, the option is treated as an **add-on or modifier**. It does not generate variants. Instead, it represents optional extras that customers can add to any variant:

- Gift wrapping (+$5.00)
- Extended warranty (+$29.99)
- Monogramming (+$15.00)

Add-on values can adjust price, cost, SKU, and weight.

## The ProductOption Model

```csharp
public class ProductOption
{
    public Guid Id { get; set; }
    public string? Name { get; set; }             // "Colour", "Size", "Gift Wrap"
    public string? Alias { get; set; }            // "colour", "size", "gift-wrap"
    public int SortOrder { get; set; }            // Display order
    public string? OptionTypeAlias { get; set; }  // "colour", "size", "material", "pattern"
    public string? OptionUiAlias { get; set; }    // "dropdown", "colour", "image", "checkbox"
    public bool IsVariant { get; set; } = true;   // true = generates variants
    public bool IsMultiSelect { get; set; } = true;  // Add-on: allow multiple values
    public bool IsRequired { get; set; }          // Add-on: require at least one
    public List<ProductOptionValue> ProductOptionValues { get; set; } = [];
}
```

### Option Type vs Option UI

These are two separate concepts:

- **OptionTypeAlias** -- what the option *represents*: `"colour"`, `"size"`, `"material"`, `"pattern"`, `"misc"`. This is semantic metadata.
- **OptionUiAlias** -- how the option is *displayed* to customers:

| UI Alias | Display |
|----------|---------|
| `dropdown` | Standard select dropdown |
| `colour` | Color swatches using hex values |
| `image` | Thumbnails using media keys |
| `checkbox` | Multi-select checkboxes |
| `radiobutton` | Single-select radio buttons |

The available aliases are configured in `appsettings.json`:

```json
{
  "Merchello": {
    "OptionTypeAliases": ["colour", "size", "material", "pattern", "misc"],
    "OptionUiAliases": ["dropdown", "colour", "image", "checkbox", "radiobutton"]
  }
}
```

## The ProductOptionValue Model

```csharp
public class ProductOptionValue
{
    public Guid Id { get; set; }
    public string? Name { get; set; }             // "Red", "Large", "Gift Wrap"
    public string? FullName { get; set; }         // "Colour: Red" (for variant names)
    public int SortOrder { get; set; }
    public string? HexValue { get; set; }         // "#FF0000" (for colour swatches)
    public Guid? MediaKey { get; set; }           // Umbraco media key (for image UI)

    // Add-on specific (only used when parent IsVariant == false)
    public decimal PriceAdjustment { get; set; }  // +/- price change
    public decimal CostAdjustment { get; set; }   // +/- internal cost change
    public string? SkuSuffix { get; set; }        // Appended to SKU
    public decimal? WeightKg { get; set; }        // Additional weight for shipping
}
```

> **Note:** `PriceAdjustment`, `CostAdjustment`, `SkuSuffix`, and `WeightKg` are only meaningful when the parent option has `IsVariant = false`. For variant options, each variant has its own independent price and SKU.

## Variant Generation

When you add variant options to a product root, Merchello automatically generates the full variant matrix. For example:

**Options added:**
- Colour: Red, Blue, Green
- Size: S, M, L, XL

**Result:** 3 x 4 = 12 variants are created, each with:
- A unique `VariantOptionsKey` (comma-separated value IDs identifying the combination)
- An auto-generated name like "Red / S"
- An auto-generated URL slug like "red-s"

### Limits

To prevent exponential explosion, there are configurable limits:

```json
{
  "Merchello": {
    "MaxProductOptions": 5,
    "MaxOptionValuesPerOption": 20
  }
}
```

With 5 options of 20 values each, the theoretical maximum is 3.2 million variants -- so be thoughtful about your option design.

## Rendering Options in Views

The `MerchelloProductViewModel` separates variant and add-on options for you:

```csharp
// In MerchelloProductViewModel:
public IReadOnlyList<ProductOption> VariantOptions { get; }  // IsVariant == true
public IReadOnlyList<ProductOption> AddOnOptions { get; }    // IsVariant == false
```

### Variant Selectors

The starter site renders variant options as interactive selectors. When a customer selects different option values, the page updates to show the matching variant's price, stock, and images.

The product view passes a JSON configuration object to the frontend JavaScript:

```csharp
variantOptions = viewModel.VariantOptions
    .OrderBy(o => o.SortOrder)
    .Select(o => new
    {
        id = o.Id.ToString(),
        name = o.Name,
        alias = o.Alias,
        uiType = o.OptionUiAlias ?? "dropdown",
        values = o.ProductOptionValues.Select(v => new
        {
            id = v.Id.ToString(),
            name = v.Name,
            hexValue = v.HexValue,
            mediaUrl = v.MediaKey.HasValue
                ? MediaCache.GetById(v.MediaKey.Value)?.GetCropUrl(width: 800)
                : null
        }).ToList()
    }).ToList()
```

This enables the UI to render:
- **Dropdowns** for size selection
- **Color swatches** showing hex values
- **Image thumbnails** for visual options

### Add-on Rendering

Add-on options are rendered separately with their price adjustments:

```csharp
addonOptions = viewModel.AddOnOptions
    .OrderBy(o => o.SortOrder)
    .Select(o => new
    {
        id = o.Id.ToString(),
        name = o.Name,
        uiType = o.OptionUiAlias ?? "checkbox",
        isMultiSelect = o.IsMultiSelect,
        isRequired = o.IsRequired,
        values = o.ProductOptionValues.Select(v => new
        {
            id = v.Id.ToString(),
            name = v.Name,
            priceAdjustment = v.PriceAdjustment,
            formattedDisplayPriceAdjustment = "+$5.00" // formatted with currency
        }).ToList()
    }).ToList()
```

## Determining the Selected Variant

When a product page loads, the selected variant is determined from the URL:

- `/mesh-office-chair` -- selects the default variant
- `/mesh-office-chair/blue-large` -- selects the "blue-large" variant by matching `Product.Url`

The `VariantOptionsKey` on each variant identifies which option values created it. The view uses this to pre-select the correct options in the UI:

```csharp
var selectedValueIds = viewModel.SelectedVariant.VariantOptionsKey
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .ToHashSet();

foreach (var option in viewModel.VariantOptions)
{
    var matchingValue = option.ProductOptionValues
        .FirstOrDefault(v => selectedValueIds.Contains(v.Id.ToString()));
    if (matchingValue != null)
    {
        selectedOptions[option.Alias] = matchingValue.Id.ToString();
    }
}
```

## Best Practices

1. **Use variant options for attributes that affect price, stock, or SKU** -- things like color, size, and material that need independent inventory tracking.

2. **Use add-on options for optional extras** -- things like gift wrapping, engraving, or warranties that modify the base product.

3. **Keep variant option counts reasonable** -- 2-3 variant options with 5-10 values each is typical. More than that and the variant matrix grows quickly.

4. **Choose appropriate UI types** -- color swatches (`colour`) are much better UX than a dropdown for color selection. Image thumbnails (`image`) work well for pattern or style options.

## Next Steps

- [Products Overview](./products-overview.md) -- the full product data model
- [Building Product Views](./product-views.md) -- rendering options in Razor
- [Product Routing](./product-routing.md) -- how variant URLs work
