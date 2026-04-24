# Caching

Merchello provides a caching layer through `ICacheService` that wraps Umbraco's `AppCaches` with a tag-based invalidation system. This gives you cache-aside semantics with distributed invalidation support in load-balanced environments.

## ICacheService API

The cache service has three methods:

### GetOrCreateAsync

Retrieves an item from the cache, or creates it using the factory function if it does not exist.

```csharp
var product = await cacheService.GetOrCreateAsync(
    key: "merchello:product:a1b2c3d4",
    factory: async (ct) => await productService.GetByIdAsync(id, ct),
    ttl: TimeSpan.FromMinutes(10),
    tags: ["products", $"product:{id}"]);
```

| Parameter | Description |
|---|---|
| `key` | Unique cache key |
| `factory` | Async function to create the value if not cached |
| `ttl` | Time-to-live (optional, defaults to `DefaultTtlSeconds`) |
| `tags` | Tags for group invalidation (optional) |

### RemoveAsync

Removes a specific item from the cache by key.

```csharp
await cacheService.RemoveAsync("merchello:product:a1b2c3d4");
```

### RemoveByTagAsync

Removes all cached items that share a tag. This is the main mechanism for invalidating related cache entries.

```csharp
// Invalidate all product-related caches
await cacheService.RemoveByTagAsync("products");

// Invalidate caches for a specific product
await cacheService.RemoveByTagAsync($"product:{productId}");
```

## Tags

Tags are the key to efficient cache invalidation. When you cache an item, you can associate it with one or more tags. Later, you can invalidate all items sharing a tag in one call.

For example, when a product is updated:

```csharp
// Cache the product list (tagged with "products")
var products = await cacheService.GetOrCreateAsync(
    "merchello:products:page:1",
    async (ct) => await productService.QueryAsync(params, ct),
    tags: ["products"]);

// Cache a specific product (tagged with both "products" and its own tag)
var product = await cacheService.GetOrCreateAsync(
    $"merchello:product:{id}",
    async (ct) => await productService.GetByIdAsync(id, ct),
    tags: ["products", $"product:{id}"]);

// When the product is updated, invalidate everything related
await cacheService.RemoveByTagAsync("products"); // Clears list caches
await cacheService.RemoveByTagAsync($"product:{id}"); // Clears specific product cache
```

### Legacy Prefix Fallback

`RemoveByTagAsync` also clears cache entries whose keys start with the tag as a prefix (using regex matching). This provides backward compatibility with older cache key schemes.

## Configuration

```json
{
  "Merchello": {
    "Cache": {
      "DefaultTtlSeconds": 300
    }
  }
}
```

The default TTL is 5 minutes. Domain-specific TTLs (like exchange rates) are configured in their own settings classes.

## Distributed Cache Invalidation

In load-balanced environments (multiple web servers), cache invalidation needs to happen on all servers, not just the one that made the change. Merchello handles this through Umbraco's `ICacheRefresher` infrastructure.

### MerchelloCacheRefresher

The `MerchelloCacheRefresher` is a single generic cache refresher for all Merchello cache invalidation. When a cache entry is invalidated on one server, the refresher broadcasts the invalidation to all other servers via Umbraco's `IServerMessenger`.

Cache refresh payloads support three modes:

| Mode | Description |
|---|---|
| `ClearAll` | Clears all Merchello caches (keys starting with `merchello:`) |
| `Prefix` | Clears all caches matching a prefix (e.g., `merchello:products:`) |
| `Key` | Clears a specific cache key |

### How It Works

1. A service invalidates a cache entry on Server A
2. The `DistributedCacheExtensions` helper creates a `MerchelloCachePayload`
3. Umbraco's `IServerMessenger` broadcasts the payload to all servers
4. On each server (including Server A), `MerchelloCacheRefresher` clears the matching cache entries

This means you do not need to manually handle distributed invalidation -- just use `ICacheService` and the framework handles the rest.

## Common Cache Key Prefixes

Merchello's canonical cache key/tag constants live in `Merchello.Core/Constants.cs` under `CacheKeys` and `CacheTags` (see [Constants.cs](../../../src/Merchello.Core/Constants.cs)). Services that own their own cache also define local constants. Current prefixes in use:

| Prefix / Key | Used For | Source |
|---|---|---|
| `merchello:exchange-rates:` | Currency exchange rates | `Constants.CacheKeys.ExchangeRatesPrefix` |
| `merchello:locality:` | Countries, regions, locality lookups | `Constants.CacheKeys.LocalityPrefix` |
| `merchello:locality:regions:` | Regions for a country | `Constants.CacheKeys.LocalityRegionsPrefix` |
| `merchello:tax-rate:` | Tax rate lookups per country/region | `Constants.CacheKeys.TaxRatePrefix` |
| `merchello:store-settings:` | Store runtime configuration | `Constants.CacheKeys.StoreSettingsPrefix` |
| `merchello:products:google-shopping-taxonomy:` | Google Shopping taxonomy lookups | `Constants.CacheKeys.GoogleShoppingTaxonomyPrefix` |
| `merchello:product-feeds:` | Product feed renders | `ProductFeedService` |
| `merchello:protocols:manifest:` | Protocol manifest documents | `ProtocolCacheKeys.ManifestPrefix` |
| `merchello:protocols:capabilities:` | Protocol capability lookups | `ProtocolCacheKeys.CapabilitiesPrefix` |
| `merchello:protocols:signing-keys` | Active ES256 signing keys | `ProtocolCacheKeys.SigningKeys` |
| `merchello:protocols:agent-profile:` | External agent profile data | `ProtocolCacheKeys.AgentProfilePrefix` |
| `merchello:google-auto-discount:public-key` | Google auto-discount verifier key | `GoogleAutoDiscountService` |
| `merchello:upsells:active` | Active upsell rules | `UpsellService` |
| `shipping-quote:` (tag `shipping-quotes`) | Carrier rate quotes | `Constants.CacheKeys.ShippingQuotePrefix` |

> **Tip:** When adding new caching, prefer to define a constant alongside the service (or add to `Constants.CacheKeys`/`CacheTags`) so consumers can reference the prefix rather than hardcoding strings.

In-memory session cache keys live alongside the services that own them and follow a different convention (e.g., `CheckoutService`, `StorefrontContextService` use `"merchello:Basket"`, `"merchello:DisplayContext"`, `"merchello:ShippingLocation"`).

## Payment Deduplication

The cache service is also used for payment deduplication. When processing a payment, an idempotency key is cached to prevent duplicate charges from concurrent requests. This is separate from the `Payment.IdempotencyKey` database field -- the cache provides fast first-line deduplication, while the database provides durable uniqueness.

## Best Practices

1. **Use descriptive keys** -- Follow the `merchello:{domain}:{identifier}` pattern
2. **Tag generously** -- The more tags you add, the more precisely you can invalidate
3. **Set appropriate TTLs** -- Volatile data (prices, stock) needs shorter TTLs than static data (store settings)
4. **Do not cache per-user data with shared keys** -- Include user/session identifiers in the key when caching user-specific data
5. **Let the framework handle distribution** -- Use `ICacheService` and `DistributedCacheExtensions` instead of directly manipulating Umbraco's `AppCaches`

## Implementation Notes

The current `CacheService` implementation uses Umbraco's synchronous `RuntimeCache` API with a sync-over-async pattern in the factory delegate. This is a known Umbraco platform limitation. The tag-to-key mapping is maintained in memory using thread-safe dictionaries.

## Related Topics

- [Background Jobs](../background-jobs/background-jobs.md)
- [Store Configuration](../store-configuration/)
