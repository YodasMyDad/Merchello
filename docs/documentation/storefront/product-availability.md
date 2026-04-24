# Product Availability and Stock Display

Merchello provides location-aware product availability checking. Instead of a simple "in stock / out of stock" flag, the system considers which warehouses can ship to the customer's location, stock levels at those warehouses, and your store's display preferences.

## How Availability Works

When you check a product's availability, Merchello:

1. Determines the customer's shipping location (from cookie, settings, or API parameter).
2. Finds all warehouses that can service that location (based on warehouse service regions).
3. Checks stock at those warehouses only (ignoring warehouses that cannot ship there).
4. Returns a comprehensive availability result.

A product might be "in stock" at your New York warehouse but "unavailable" for a customer in Germany if that warehouse does not service Europe.

## The ProductLocationAvailability Record

Every availability check returns a [`ProductLocationAvailability`](../../../src/Merchello.Core/Storefront/Models/ProductLocationAvailability.cs) record:

```csharp
public record ProductLocationAvailability(
    bool CanShipToLocation,    // Any warehouse can ship here?
    bool HasStock,             // Stock exists at reachable warehouses?
    int AvailableStock,        // Total available units from reachable warehouses
    string StatusMessage,      // User-friendly message
    bool ShowStockLevels);     // From MerchelloSettings.ShowStockLevels
```

### Status Messages

The `StatusMessage` is a user-friendly string you can display directly:

- `"In Stock"` -- available with stock.
- `"Out of Stock"` -- warehouses can ship here but have no stock.
- `"Not available in United Kingdom"` -- no warehouses service this country.
- `"Only 3 left"` -- low stock (when `ShowStockLevels` is enabled).

## Checking Availability

### Current Customer Location

The simplest approach -- uses the customer's cookie-based location:

```csharp
var availability = await storefrontContext.GetProductAvailabilityAsync(
    product,
    quantity: 1,
    ct);

if (!availability.CanShipToLocation)
{
    // "Sorry, this product is not available in your region"
}
else if (!availability.HasStock)
{
    // "Out of stock"
}
else
{
    // "In Stock" or show count
}
```

### Specific Location

Check availability for a specific country/region (useful for AJAX location pickers):

```csharp
var availability = await storefrontContext.GetProductAvailabilityForLocationAsync(
    new ProductAvailabilityParameters
    {
        Product = product,
        CountryCode = "DE",
        RegionCode = null,
        Quantity = 2
    }, ct);
```

### Simple Can-Ship Check

If you just need a boolean:

```csharp
bool canShip = await storefrontContext.CanShipToCustomerAsync(product, ct);
```

### Stock Count Only

If you just need the raw stock number for a specific warehouse:

```csharp
int available = await storefrontContext.GetAvailableStockAsync(product, ct);
```

## REST API

Check availability via the storefront API:

**`GET /api/merchello/storefront/products/{productId}/availability`**

Query parameters:
- `countryCode` -- optional, uses customer's current location if not specified.
- `regionCode` -- optional state/province code.
- `quantity` -- defaults to 1.

```javascript
// Check availability in Germany
const response = await fetch(
    '/api/merchello/storefront/products/abc-123/availability?countryCode=DE&quantity=2'
);
const availability = await response.json();
// { canShipToLocation: true, hasStock: true, availableStock: 15, statusMessage: "In Stock" }
```

## Displaying Stock on Product Pages

The starter site demonstrates the pattern for showing stock status on a product page ([Default.cshtml:37-49](../../../src/Merchello.Site/Views/Products/Default.cshtml#L37)):

```csharp
// Get availability for each variant
var variantAvailability = new Dictionary<Guid, ProductLocationAvailability>();
foreach (var variant in viewModel.AllVariants)
{
    var availability = await StorefrontContext.GetProductAvailabilityAsync(variant, 1);
    variantAvailability[variant.Id] = availability;
}

// Determine display for the selected variant
var selectedAvailability = variantAvailability[viewModel.SelectedVariant.Id];
var trackStock = viewModel.SelectedVariant.ProductWarehouses.Any(pw => pw.TrackStock);
var totalStock = selectedAvailability?.AvailableStock ?? 0;
var canShip = selectedAvailability?.CanShipToLocation ?? false;
var isLowStock = trackStock && totalStock > 0 && totalStock <= settings.LowStockThreshold;
var inStock = canShip && (selectedAvailability?.HasStock ?? false);
```

### ShowStockLevels Setting

The `MerchelloSettings.ShowStockLevels` setting controls whether actual stock counts are exposed to customers:

- **`true`** -- show "12 in stock" or "Only 3 left".
- **`false`** -- show "In Stock" or "Out of Stock" without counts.

This setting is propagated through `ProductLocationAvailability.ShowStockLevels` so your templates can check it:

```razor
@if (availability.HasStock)
{
    @if (availability.ShowStockLevels && isLowStock)
    {
        <span class="text-orange-600">Only @availability.AvailableStock left</span>
    }
    else
    {
        <span class="text-green-600">In Stock</span>
    }
}
else if (!availability.CanShipToLocation)
{
    <span class="text-gray-500">Not available in your region</span>
}
else
{
    <span class="text-red-600">Out of Stock</span>
}
```

## Basket Availability

Before checkout, check that all basket items are still available:

```csharp
var availability = await storefrontContext.GetBasketAvailabilityAsync(
    countryCode: "GB",
    regionCode: null,
    ct);
```

Or with the storefront API:

**`GET /api/merchello/storefront/basket/availability?countryCode=GB`**

This checks each line item in the basket against the specified location and returns per-item availability information. It is used by the basket page to show warnings when items cannot ship to the customer's location or are out of stock.

> **Tip:** The `GET /basket` endpoint also supports an `includeAvailability=true` query parameter that bundles availability data with the basket response, saving an extra API call.

## Key Points

- Availability is **location-aware** -- a product might be in stock at one warehouse but unavailable for a specific country.
- Use `GetProductAvailabilityAsync` for the common case (current customer location).
- Use `GetProductAvailabilityForLocationAsync` when you need to check a specific location (e.g. for a country selector).
- The `ShowStockLevels` setting controls whether customers see actual stock counts or just "In Stock"/"Out of Stock".
- The `LowStockThreshold` setting determines what counts as "low stock" for display purposes.
- Basket availability checks help prevent customers from reaching checkout with unavailable items.
