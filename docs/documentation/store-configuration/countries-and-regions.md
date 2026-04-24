# Countries, Regions, and Locality

Merchello includes a built-in locality data system that provides country and region (state/province) information for shipping, billing, and tax configuration. This data is used throughout the system -- from checkout address forms to warehouse service regions to tax rate lookups.

## How Locality Data Works

Locality data in Merchello comes from a static, auto-generated dataset based on [country-region-data](https://github.com/country-regions/country-region-data). The data lives in [LocalityData.cs](../../../src/Merchello.Core/Locality/Data/LocalityData.cs) and includes:

- **All countries** from .NET's `CultureInfo` plus additional territories (Guernsey, Isle of Man, Jersey)
- **Subdivisions** (states, provinces, regions) for each country using ISO 3166-2 suffix codes

> **Note:** Region codes use the ISO 3166-2 suffix only (e.g., `"CA"` for California, not `"US-CA"`). This is important when configuring tax rates and warehouse service regions.

## Key Models

### Country

The `Country` model is an EF Core owned type used in addresses:

```csharp
public class Country
{
    public string? Name { get; set; }        // e.g., "United States"
    public string? CountryCode { get; set; } // e.g., "US" (ISO 3166-1 alpha-2)
    public List<CountyState> CountyStates { get; set; } = [];
}
```

### CountyState

Represents a state, province, or region within a country:

```csharp
public class CountyState
{
    public string? Name { get; set; }        // e.g., "California"
    public string? RegionCode { get; set; }  // e.g., "CA"
}
```

### CountryInfo and SubdivisionInfo

These are lightweight read-only records returned by the locality catalog:

- `CountryInfo(string Code, string Name)` -- e.g., `("US", "United States")`. See [CountryInfo.cs](../../../src/Merchello.Core/Locality/Models/CountryInfo.cs).
- `SubdivisionInfo(string CountryCode, string RegionCode, string Name)` -- e.g., `("US", "CA", "California")`. See [SubdivisionInfo.cs](../../../src/Merchello.Core/Locality/Models/SubdivisionInfo.cs).

## The Locality Catalog

The `ILocalityCatalog` service provides access to the locality data. It is the main entry point for querying countries and regions. See [ILocalityCatalog.cs](../../../src/Merchello.Core/Locality/Services/Interfaces/ILocalityCatalog.cs).

### Getting All Countries

```csharp
public class MyController(ILocalityCatalog localityCatalog) : Controller
{
    public async Task<IActionResult> Index()
    {
        var countries = await localityCatalog.GetCountriesAsync();
        // Returns IReadOnlyCollection<CountryInfo> sorted by name
        // e.g., Afghanistan, Albania, Algeria, ...
    }
}
```

### Getting Regions for a Country

```csharp
var regions = await localityCatalog.GetRegionsAsync("US");
// Returns IReadOnlyCollection<SubdivisionInfo>
// e.g., ("US", "AL", "Alabama"), ("US", "AK", "Alaska"), ...

var ukRegions = await localityCatalog.GetRegionsAsync("GB");
// e.g., ("GB", "ENG", "England"), ("GB", "SCT", "Scotland"), ...
```

### Looking Up a Country Name

```csharp
var name = await localityCatalog.TryGetCountryNameAsync("GB");
// Returns "United Kingdom"
```

## Caching

Locality data is cached with a 24-hour TTL since countries and regions rarely change. The cache key pattern is:

- Countries: loaded once lazily (in-memory dictionary)
- Regions: `locality:regions:{countryCode}` with `Locality` cache tag

The cache is managed through `ICacheService`, so it participates in Merchello's standard cache invalidation.

## Where Locality Data is Used

### Checkout Addresses

When customers enter shipping and billing addresses, the country and region dropdowns are populated from the locality catalog. The selected values are stored using the `Country` and `CountyState` models.

### Warehouse Service Regions

Warehouses define which countries and regions they can ship to using `WarehouseServiceRegion`:

```csharp
public class WarehouseServiceRegion
{
    public string CountryCode { get; set; }   // "US", "GB", or "*" for all
    public string? RegionCode { get; set; }   // "CA", "ENG", or null for whole country
    public bool IsExcluded { get; set; }      // true = cannot ship here
}
```

See the [Warehouses](./warehouses.md) guide for details.

### Tax Configuration

Tax rates are configured per country and region. When calculating tax for a customer, the system looks up rates using their shipping address country code and region code.

### Shipping Options

Shipping costs can be configured at different geographic levels with a priority chain: State > Country > Universal (`*`) > Fixed Cost.

## The Address Model

Merchello uses a consistent `Address` model across all address contexts (warehouse origin, supplier contact, customer billing/shipping):

The model is an EF Core owned type, meaning it is stored as columns on the parent entity's table rather than in its own table. See [Address.cs](../../../src/Merchello.Core/Locality/Models/Address.cs) and the API contract in [AddressDto.cs](../../../src/Merchello.Core/Locality/Dtos/AddressDto.cs).

> **Warning:** When working with addresses across the C#/TypeScript boundary, use the canonical field names defined in the project conventions: `AddressOne` (not `address1`), `TownCity` (not `city`), `CountyState` (not `state`), `RegionCode` (not `stateCode`). This is a cross-boundary invariant -- see the CLAUDE.md naming conventions for the full list.

## Additional Territories

Merchello includes three territories not found in standard .NET `CultureInfo`:

| Code | Name |
|------|------|
| `GG` | Guernsey |
| `IM` | Isle of Man |
| `JE` | Jersey |

These are Crown Dependencies that need to be handled separately for shipping and tax purposes.

## Next Steps

- [Warehouses](./warehouses.md) -- configuring warehouse service regions
- [Store Settings](./store-settings.md) -- setting your default shipping country
- [Suppliers](./suppliers.md) -- supplier and vendor management
