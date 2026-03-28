# Warehouses and Service Regions

Warehouses in Merchello represent physical locations where products are stored and shipped from. Each warehouse has its own address, shipping options, and service regions that define where it can ship to. Products are linked to warehouses for inventory tracking, and the system uses warehouse configuration to determine shipping availability and costs.

## The Warehouse Model

A warehouse holds all the information needed for inventory management and shipping origin:

```csharp
public class Warehouse
{
    public Guid Id { get; set; }
    public string? Name { get; set; }          // e.g., "UK Main Warehouse"
    public string? Code { get; set; }          // Reference code, e.g., "UK-MAIN"
    public Address Address { get; set; }        // Shipping origin address
    public Guid? SupplierId { get; set; }      // Optional owning supplier
    public Guid? FulfilmentProviderConfigurationId { get; set; } // Optional fulfilment provider
    public Dictionary<string, object> ExtendedData { get; set; } = [];
}
```

Key relationships:
- **Supplier** -- a warehouse can optionally belong to a [Supplier](./suppliers.md)
- **Shipping Options** -- each warehouse has its own set of configured shipping options
- **Service Regions** -- define where this warehouse can (or cannot) ship
- **Product Stock** -- product variants have stock levels tracked per warehouse
- **Fulfilment Provider** -- optional override for 3PL fulfilment (overrides the supplier's default)

## Service Regions

Service regions control which countries and states/provinces a warehouse can ship to. They are stored as JSON on the warehouse and use a simple include/exclude model.

### How Service Regions Work

```csharp
public class WarehouseServiceRegion
{
    public string CountryCode { get; set; }   // ISO 3166-1 alpha-2, or "*" for all
    public string? RegionCode { get; set; }   // ISO 3166-2 suffix, or null for whole country
    public bool IsExcluded { get; set; }      // true = exclusion rule
}
```

The logic for determining if a warehouse can serve a given location follows these rules:

1. **No service regions defined** -- the warehouse can ship everywhere
2. **Wildcard `"*"`** -- matches all countries
3. **Most specific wins** -- a state-specific rule takes precedence over a country-level rule
4. **Exclusions override inclusions** at the same specificity level

### Examples

**Ship to all of US except Hawaii and Alaska:**
```json
[
  { "CountryCode": "US", "RegionCode": null, "IsExcluded": false },
  { "CountryCode": "US", "RegionCode": "HI", "IsExcluded": true },
  { "CountryCode": "US", "RegionCode": "AK", "IsExcluded": true }
]
```

**Ship to UK and EU countries only:**
```json
[
  { "CountryCode": "GB", "RegionCode": null, "IsExcluded": false },
  { "CountryCode": "DE", "RegionCode": null, "IsExcluded": false },
  { "CountryCode": "FR", "RegionCode": null, "IsExcluded": false }
]
```

**Ship everywhere:**
Either define no service regions, or use a wildcard:
```json
[
  { "CountryCode": "*", "RegionCode": null, "IsExcluded": false }
]
```

### Region Matching Logic

The `Warehouse.CanServeRegion(countryCode, regionCode)` method evaluates regions in this priority:

1. Find all regions that match the given country/state
2. If there are state-specific rules for the requested state, those take precedence
3. Otherwise, fall back to country-level rules (those without a `RegionCode`)
4. If only state-specific rules exist for *other* states (not the requested one), access is denied

## Stock Management

Stock is tracked per product variant per warehouse through the `ProductWarehouse` join entity:

```csharp
public class ProductWarehouse
{
    public Guid ProductId { get; set; }         // The variant
    public Guid WarehouseId { get; set; }       // The warehouse
    public int Stock { get; set; }              // Current stock level
    public int ReservedStock { get; set; }      // Reserved for pending orders
    public bool TrackStock { get; set; }        // Whether to enforce stock limits
}
```

### Stock Lifecycle

For tracked inventory, stock follows this lifecycle:

| Action | Effect |
|--------|--------|
| **Reserve** (at checkout) | `ReservedStock += qty` |
| **Allocate** (ship/fulfil) | `Stock -= qty`, `ReservedStock -= qty` |
| **Cancel/Release** | `ReservedStock -= qty` |

Available stock is calculated as `Stock - ReservedStock`.

### Product-Warehouse Priority

Products are linked to warehouses through `ProductRootWarehouse`, which includes a priority value. When fulfilling an order, the warehouse selection order is:

1. `ProductRootWarehouse` priority (lower number = higher priority)
2. Service region eligibility (can the warehouse ship to the customer's address?)
3. Stock availability (`Stock - Reserved >= qty`)

## Warehouse Provider Configs

Warehouses can store per-provider shipping configurations via `ProviderConfigsJson`. This allows different shipping providers to have warehouse-specific settings (e.g., account numbers, origin addresses for rate calculations).

## Managing Warehouses

### Via the Backoffice

Warehouses are managed in the Merchello backoffice under the warehouse management section. You can:
- Create and edit warehouses
- Set the shipping origin address
- Configure service regions
- Assign to a supplier
- View and manage stock levels

### Via the API

The `WarehousesApiController` provides API endpoints for warehouse management. In your own code, inject `IWarehouseService`:

```csharp
public class MyService(IWarehouseService warehouseService)
{
    public async Task<Warehouse?> GetWarehouseAsync(Guid id, CancellationToken ct)
    {
        return await warehouseService.GetWarehouseByIdAsync(id, ct);
    }
}
```

## Multi-Warehouse Setup

A typical multi-warehouse configuration might look like:

| Warehouse | Supplier | Service Region | Purpose |
|-----------|----------|---------------|---------|
| UK Main | UK Supplier | GB, IE | Primary UK/Ireland |
| EU Distribution | UK Supplier | DE, FR, NL, BE, ... | European orders |
| US East | US Supplier | US (east coast states) | East coast US |
| US West | US Supplier | US (west coast states) | West coast US |

Each warehouse has its own shipping options, and when a customer checks out, only shipping options from eligible warehouses (those that can serve the customer's address and have stock) are presented.

## Next Steps

- [Suppliers](./suppliers.md) -- managing supplier/vendor records
- [Countries and Regions](./countries-and-regions.md) -- the locality data system
- [Products Overview](../products/products-overview.md) -- how products link to warehouses
