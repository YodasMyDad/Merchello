# Warehouses

Warehouses represent physical locations where products are stored and shipped from. They are configured in the Merchello backoffice and define shipping origins, service regions (which countries/states they can ship to), and per-variant stock levels.

Warehouses drive two storefront behaviours: they determine which shipping options are available for the customer's location, and they control product availability based on reachable stock.

## The Warehouse Model

Source: [Warehouse.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Warehouses/Models/Warehouse.cs)

A warehouse has an origin address (used as the shipping "ship-from"), a collection of service regions, and a `SupplierId` in multi-vendor setups.

Key fields:

- `Name` -- internal label.
- `Address` -- owned `Address` type used as the shipping origin (see [Countries and Regions](./countries-and-regions.md)).
- `ServiceRegions` -- the list of countries/regions this warehouse will ship to.
- `SupplierId` -- optional link to a [supplier](./suppliers.md) for vendor-based order grouping.

## Service Regions

A warehouse can ship to any number of countries and regions. Each entry is a `WarehouseServiceRegion`:

```csharp
public class WarehouseServiceRegion
{
    public string CountryCode { get; set; }   // "US", "GB", or "*" for all countries
    public string? RegionCode { get; set; }   // "CA", "ENG", or null for the whole country
    public bool IsExcluded { get; set; }      // true = explicitly cannot ship here
}
```

Source: [WarehouseServiceRegion.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Warehouses/Models/WarehouseServiceRegion.cs)

Country codes use ISO 3166-1 alpha-2 (e.g. `"GB"`) and region codes use the ISO 3166-2 suffix (e.g. `"CA"`, not `"US-CA"`). Use `"*"` as a wildcard country to service everywhere with optional exclusions.

> **Tip:** Regions are optional. Leave `RegionCode` null to service an entire country. Combine an include-all entry (`CountryCode = "*"`) with per-region exclusions (`IsExcluded = true`) to express "ship everywhere except X".

## Warehouse Selection (Invariant)

When multiple warehouses can fulfil an order, Merchello picks one using a strict priority order. This is the rule enforced in `WarehouseService.SelectWarehouseForProduct()` and must be preserved by any custom grouping strategy:

1. **`ProductRootWarehouse.Priority`** -- warehouses linked to the product root, ordered by priority.
2. **Service region eligibility** -- the warehouse must be able to ship to the customer's country/region.
3. **Stock availability** -- `Stock - ReservedStock >= requested quantity` at the selected warehouse.

Source: [WarehouseService.cs:35](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Warehouses/Services/WarehouseService.cs#L35), selection parameters in [SelectWarehouseForProductParameters.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Warehouses/Services/Parameters/SelectWarehouseForProductParameters.cs).

See [Inventory and Stock](../products/inventory-and-stock.md) for the full stock lifecycle and [Products Overview](../products/products-overview.md) for how `ProductRootWarehouse` priority is set.

## How Warehouses Drive the Storefront

- **Product availability** -- `IStorefrontContextService.GetProductAvailabilityAsync()` only counts stock from warehouses whose service regions include the customer's location.
- **Shipping options** -- the order grouping strategy picks a warehouse per line item, and shipping providers quote from that warehouse's origin address.
- **Multi-vendor** -- when [vendor grouping](../shipping/order-grouping.md) is enabled, orders are split by the warehouse's `SupplierId`.

## Next Steps

- [Product Availability](../storefront/product-availability.md) -- how stock and service regions affect what customers can buy.
- [Inventory and Stock](../products/inventory-and-stock.md) -- the Reserve/Allocate/Release/Reverse lifecycle.
- [Shipping Overview](../shipping/shipping-overview.md) -- how warehouse configuration drives shipping quotes.
- [Suppliers](./suppliers.md) -- how warehouses relate to vendors in multi-supplier setups.
