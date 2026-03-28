# Creating Product Feed Value Resolvers

Product feed value resolvers let you add custom fields to Google Shopping feeds and other product data exports. They resolve dynamic values for each product at feed generation time -- things like "on sale" status, stock availability, product categories, or any custom logic.

## Quick Overview

To create a product feed resolver:

1. Create a class that implements `IProductFeedValueResolver`
2. Optionally implement `IProductFeedResolverMetadata` for richer backoffice UI
3. Reference your assembly from the web project (auto-discovered)

## How Resolvers Work

When Merchello generates a product feed, it processes each product and evaluates custom field expressions. When an expression references a resolver (by alias), Merchello calls your resolver's `ResolveAsync()` method with the product context.

```
Feed generation starts
    -> For each product:
        -> For each custom field in the feed config:
            -> If field uses a resolver alias:
                -> Call resolver.ResolveAsync(context, args)
                -> Use returned string as the field value
```

## The Interface

```csharp
public interface IProductFeedValueResolver
{
    string Alias { get; }        // Unique identifier, used in feed configuration
    string Description { get; }  // Brief description of what this resolver does

    Task<string?> ResolveAsync(
        ProductFeedResolverContext context,
        IReadOnlyDictionary<string, string> args,
        CancellationToken cancellationToken = default);
}
```

## Minimal Example

```csharp
using Merchello.Core.ProductFeeds.Models;
using Merchello.Core.ProductFeeds.Services.Interfaces;

public class BrandResolver : IProductFeedValueResolver
{
    public string Alias => "brand";
    public string Description => "Returns the product's brand name.";

    public Task<string?> ResolveAsync(
        ProductFeedResolverContext context,
        IReadOnlyDictionary<string, string> args,
        CancellationToken cancellationToken = default)
    {
        // Get brand from product root's extended data
        var brand = context.ProductRoot.ExtendedData
            .GetValueOrDefault("Brand")?.ToString();

        return Task.FromResult(brand);
    }
}
```

## Adding Backoffice UI Metadata

Implement `IProductFeedResolverMetadata` to give the backoffice richer information about your resolver:

```csharp
public class BrandResolver : IProductFeedValueResolver, IProductFeedResolverMetadata
{
    public string Alias => "brand";
    public string Description => "Returns the product's brand name.";

    // IProductFeedResolverMetadata
    public string DisplayName => "Brand Name";
    public string? HelpText => "Resolves the brand name from product extended data.";
    public bool SupportsArgs => false;       // Does this resolver accept arguments?
    public string? ArgsHelpText => null;
    public string? ArgsExampleJson => null;

    public Task<string?> ResolveAsync(
        ProductFeedResolverContext context,
        IReadOnlyDictionary<string, string> args,
        CancellationToken cancellationToken = default)
    {
        var brand = context.ProductRoot.ExtendedData
            .GetValueOrDefault("Brand")?.ToString();
        return Task.FromResult(brand);
    }
}
```

## Resolver with Arguments

Some resolvers accept arguments to customize their behavior:

```csharp
public class PriceFormatResolver : IProductFeedValueResolver, IProductFeedResolverMetadata
{
    public string Alias => "formatted-price";
    public string Description => "Returns the product price in a specific format.";
    public string DisplayName => "Formatted Price";
    public string? HelpText => "Formats the product price with currency code.";
    public bool SupportsArgs => true;
    public string? ArgsHelpText => "Specify 'currency' to override the default currency code.";
    public string? ArgsExampleJson => """{"currency": "USD"}""";

    public Task<string?> ResolveAsync(
        ProductFeedResolverContext context,
        IReadOnlyDictionary<string, string> args,
        CancellationToken cancellationToken = default)
    {
        var currency = args.GetValueOrDefault("currency", "GBP");
        var price = context.Product.Price;
        var formatted = $"{price:F2} {currency}";

        return Task.FromResult<string?>(formatted);
    }
}
```

## The Resolver Context

Your resolver receives a `ProductFeedResolverContext` with:

```csharp
public class ProductFeedResolverContext
{
    public Product Product { get; set; }         // The specific variant
    public ProductRoot ProductRoot { get; set; }  // The parent product root
    public ProductFeed Feed { get; set; }         // The feed being generated
}
```

This gives you access to:

- **Product**: SKU, price, sale price, stock, weight, dimensions, extended data, option choices
- **ProductRoot**: Name, description, tax group, collection membership, images, all variants, extended data
- **Feed**: Feed configuration, title, target country/currency settings

## Built-in Resolvers

Merchello includes several built-in resolvers you can use as reference:

| Resolver | Alias | Description | Location |
|---|---|---|---|
| On Sale | `on-sale` | Returns "true" when sale pricing is active | `ProductFeedOnSaleResolver.cs` |
| Stock Status | `stock-status` | Returns availability based on stock levels | `ProductFeedStockStatusResolver.cs` |
| Product Type | `product-type` | Returns the Google product type | `ProductFeedProductTypeResolver.cs` |
| Collections | `collections` | Returns collection membership | `ProductFeedCollectionsResolver.cs` |
| Supplier | `supplier` | Returns supplier information | `ProductFeedSupplierResolver.cs` |

## Example: On Sale Resolver (Built-in)

Here's the actual built-in on-sale resolver for reference:

```csharp
public class ProductFeedOnSaleResolver : IProductFeedValueResolver, IProductFeedResolverMetadata
{
    public string Alias => "on-sale";
    public string Description => "Returns true when sale pricing is active.";
    public string DisplayName => "On Sale";
    public string? HelpText => "Returns true when a valid sale price is currently active for the product.";
    public bool SupportsArgs => false;
    public string? ArgsHelpText => null;
    public string? ArgsExampleJson => null;

    public Task<string?> ResolveAsync(
        ProductFeedResolverContext context,
        IReadOnlyDictionary<string, string> args,
        CancellationToken cancellationToken = default)
    {
        var onSale = context.Product.OnSale &&
                     context.Product.PreviousPrice.HasValue &&
                     context.Product.PreviousPrice.Value > context.Product.Price;

        return Task.FromResult<string?>(onSale ? "true" : "false");
    }
}
```

## Resolver Registry

All discovered resolvers are registered in `IProductFeedResolverRegistry`:

```csharp
public interface IProductFeedResolverRegistry
{
    IReadOnlyCollection<IProductFeedValueResolver> GetResolvers();
    IProductFeedValueResolver? GetResolver(string alias);
}
```

The backoffice uses this registry to show available resolvers in the feed configuration UI (with display names and help text from `IProductFeedResolverMetadata`).

## Tips

- **Return `null`** when a value can't be resolved -- the feed generator handles null gracefully
- **Keep resolvers fast** -- they're called once per product per feed generation, which can be thousands of calls
- **Use constructor injection** for any services you need (HTTP clients, database services, etc.)
- **Resolver aliases must be unique** across all discovered assemblies
