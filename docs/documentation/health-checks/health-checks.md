# Health Checks

Merchello includes a set of built-in health checks that help you identify common data quality issues in your store. Health checks scan your product catalog for problems like missing images, missing warehouse assignments, and unpublished products.

## How Health Checks Work

Each health check implements the `IHealthCheck` interface:

```csharp
public interface IHealthCheck
{
    HealthCheckMetadata Metadata { get; }
    Task<HealthCheckResult> ExecuteAsync(CancellationToken ct = default);
    Task<HealthCheckDetailPage> GetDetailPageAsync(int page, int pageSize, CancellationToken ct = default);
}
```

When you run a health check, it returns:
- A **status** (`Success`, `Warning`, or `Error`)
- A **summary** message describing the result
- An **affected count** (how many items have the issue)

You can then drill into the details to see exactly which products are affected, with direct links to edit them in the backoffice.

## Built-In Health Checks

### Products Missing Images

**Alias:** `products-missing-images`

Finds products that have no images at either the root or variant level. Products without images may display poorly on the storefront.

- Checks root-level images first
- For roots with no images, checks if any variant has images
- Only flags products where neither root nor any variant has an image

### Products Missing Warehouses

**Alias:** `products-missing-warehouses`

Finds products that are not assigned to any warehouse. Without warehouse assignments, products cannot be fulfilled or have shipping calculated.

### Unpublished Products

**Alias:** `unpublished-products`

Finds products that exist in the database but are not published. These products are invisible to customers on the storefront.

### Option Values Missing Media

**Alias:** `option-values-missing-media`

Finds product option values (like color swatches) that are missing their associated media. This can cause broken images in option selectors on the storefront.

## Running Health Checks

### List Available Checks

```
GET /umbraco/api/v1/health-checks
```

> **Auth:** All health check endpoints require an authenticated Umbraco backoffice session (content section access).

Returns metadata for all registered health checks:

```json
[
  {
    "alias": "products-missing-images",
    "name": "Products Missing Images",
    "description": "Products without any images may display poorly on the storefront.",
    "icon": "icon-picture",
    "sortOrder": 300
  }
]
```

### Run a Check

```
POST /umbraco/api/v1/health-checks/{alias}/run
```

Returns the check result:

```json
{
  "alias": "products-missing-images",
  "name": "Products Missing Images",
  "description": "Products without any images may display poorly on the storefront.",
  "icon": "icon-picture",
  "status": "warning",
  "summary": "12 products without any images.",
  "affectedCount": 12
}
```

### Get Check Details

```
GET /umbraco/api/v1/health-checks/{alias}/details?page=1&pageSize=25
```

Returns a paginated list of affected items:

```json
{
  "items": [
    {
      "id": "a1b2c3d4-...",
      "name": "Blue Widget",
      "editPath": "section/merchello/workspace/merchello-products/edit/products/a1b2c3d4-..."
    }
  ],
  "page": 1,
  "pageSize": 25,
  "totalItems": 12,
  "totalPages": 1
}
```

The `editPath` field gives you a direct link to fix the issue in the backoffice.

## Interpreting Results

| Status | Meaning |
|---|---|
| `Success` | No issues found -- everything looks good |
| `Warning` | Non-critical issues found -- your store works but could be improved |
| `Error` | Critical issues found -- these may affect store functionality |

> **Tip:** Run health checks after bulk imports, migrations, or major product catalog changes to catch data quality issues early.

## Building a Custom Health Check

You can create your own health checks by implementing `IHealthCheck`:

```csharp
public class ProductsWithoutDescriptionHealthCheck : IHealthCheck
{
    public HealthCheckMetadata Metadata => new()
    {
        Alias = "products-without-description",
        Name = "Products Without Description",
        Description = "Products missing a description may perform poorly in search.",
        Icon = "icon-document",
        SortOrder = 400,
    };

    public async Task<HealthCheckResult> ExecuteAsync(CancellationToken ct = default)
    {
        // Query your data and return the result
        var count = await CountProductsWithoutDescription(ct);

        return count == 0
            ? new HealthCheckResult
            {
                Status = HealthCheckStatus.Success,
                Summary = "All products have descriptions."
            }
            : new HealthCheckResult
            {
                Status = HealthCheckStatus.Warning,
                Summary = $"{count} product(s) without descriptions.",
                AffectedCount = count
            };
    }

    public async Task<HealthCheckDetailPage> GetDetailPageAsync(
        int page, int pageSize, CancellationToken ct = default)
    {
        // Return paginated details for affected items
    }
}
```

Register it in your DI container and it will appear automatically in the health checks UI.

## Key Files

| File | Description |
|---|---|
| `Merchello.Core/HealthChecks/Interfaces/IHealthCheck.cs` | Interface implemented by every check |
| `Merchello.Core/HealthChecks/Models/HealthCheckMetadata.cs` | Metadata record |
| `Merchello.Core/HealthChecks/Models/HealthCheckResult.cs` | Result model (status + summary + count) |
| `Merchello.Core/HealthChecks/Models/HealthCheckStatus.cs` | Status enum (`Success`, `Warning`, `Error`) |
| `Merchello.Core/HealthChecks/Services/HealthCheckService.cs` | Resolves and runs registered checks |
| `Merchello.Core/HealthChecks/BuiltIn/` | Built-in checks (`ProductsMissingImages`, `ProductsMissingWarehouses`, `UnpublishedProducts`, `OptionValuesMissingMedia`) |
| `Merchello/Controllers/HealthChecksApiController.cs` | Admin API (`GET/POST /umbraco/api/v1/health-checks`) |

## Related Topics

- [Products](../products/)
- [Store Configuration](../store-configuration/)
