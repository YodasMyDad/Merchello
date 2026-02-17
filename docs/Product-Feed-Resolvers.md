# Product Feed Resolver Development Guide

Guide for creating Product Feed resolvers for Google feeds (custom labels and custom fields), including external assemblies.

## Quick Start

1. Implement `IProductFeedValueResolver` in a public class.
2. Use a unique, stable `Alias`.
3. Optionally implement `IProductFeedResolverMetadata` for better backoffice UX.
4. Ensure constructor dependencies are registered in DI.
5. Build and run; verify resolver appears in `GET /umbraco/backoffice/merchello/api/v1/product-feeds/resolvers`.

## Runtime Architecture

Resolver discovery and execution path:

1. `Startup.AddMerch(...)` sets the assembly scan list in `AssemblyManager`.
2. `ProductFeedResolverRegistry` asks `ExtensionManager` for `IProductFeedValueResolver` implementations.
3. Backoffice requests resolver descriptors from `ProductFeedService.GetResolversAsync()`.
4. Feed generation calls `GoogleProductFeedGenerator.ResolveConfiguredValueAsync(...)` per product/custom label/custom field.

Key files:
- `src/Merchello/Startup.cs`
- `src/Merchello.Core/Shared/Reflection/ExtensionManager.cs`
- `src/Merchello.Core/ProductFeeds/Services/ProductFeedResolverRegistry.cs`
- `src/Merchello.Core/ProductFeeds/Services/ProductFeedService.cs`
- `src/Merchello.Core/ProductFeeds/Services/GoogleProductFeedGenerator.cs`

## Contracts

### Required Runtime Contract

`IProductFeedValueResolver` (`src/Merchello.Core/ProductFeeds/Services/Interfaces/IProductFeedValueResolver.cs`)

```csharp
public interface IProductFeedValueResolver
{
    string Alias { get; }
    string Description { get; }

    Task<string?> ResolveAsync(
        ProductFeedResolverContext context,
        IReadOnlyDictionary<string, string> args,
        CancellationToken cancellationToken = default);
}
```

Rules:
- `Alias` must be unique across all resolvers.
- `Description` is fallback UI text.
- Return `null` or whitespace to omit the XML element.
- `args` is a string dictionary; treat values as user input.

### Optional UI Metadata Contract

`IProductFeedResolverMetadata` (`src/Merchello.Core/ProductFeeds/Services/Interfaces/IProductFeedResolverMetadata.cs`)

```csharp
public interface IProductFeedResolverMetadata
{
    string DisplayName { get; }
    string? HelpText { get; }
    bool SupportsArgs { get; }
    string? ArgsHelpText { get; }
    string? ArgsExampleJson { get; }
}
```

If this interface is not implemented:
- Resolver still works at runtime.
- Backoffice falls back to `alias`/`description`.
- Args editor is hidden by default (`supportsArgs = false`).

### Resolver Context

`ProductFeedResolverContext` (`src/Merchello.Core/ProductFeeds/Models/ProductFeedResolverContext.cs`)

- `Product`: current variant/product row being emitted.
- `ProductRoot`: parent product root.
- `Feed`: current feed configuration.

## Args Contract (JSON to Dictionary)

Backoffice args editor accepts a JSON object and serializes to `Dictionary<string, string>`.

Current behavior:
- JSON must be an object (`{}`), not array.
- Values must be primitives (string/number/boolean/null).
- Values are converted to strings before reaching resolver.

Examples:
- Input: `{"threshold": 10, "mode": "strict", "enabled": true}`
- Resolver receives:
  - `args["threshold"] == "10"`
  - `args["mode"] == "strict"`
  - `args["enabled"] == "true"`

## Implementation Example

```csharp
using System.Linq;
using Merchello.Core.ProductFeeds.Models;
using Merchello.Core.ProductFeeds.Services.Interfaces;

namespace MyCompany.Merchello.ProductFeeds;

public class PrimaryCollectionResolver : IProductFeedValueResolver, IProductFeedResolverMetadata
{
    public string Alias => "primary-collection";
    public string Description => "Resolves the first collection name for a product.";

    public string DisplayName => "Primary Collection";
    public string? HelpText => "Returns the alphabetically first collection name. Optional args: fallback.";
    public bool SupportsArgs => true;
    public string? ArgsHelpText => "Use {\"fallback\":\"Uncategorized\"}.";
    public string? ArgsExampleJson => "{\"fallback\":\"Uncategorized\"}";

    public Task<string?> ResolveAsync(
        ProductFeedResolverContext context,
        IReadOnlyDictionary<string, string> args,
        CancellationToken cancellationToken = default)
    {
        var value = context.ProductRoot.Collections
            .Select(c => c.Name)
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .OrderBy(n => n)
            .FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(value))
        {
            return Task.FromResult<string?>(value);
        }

        args.TryGetValue("fallback", out var fallback);
        return Task.FromResult<string?>(string.IsNullOrWhiteSpace(fallback) ? null : fallback.Trim());
    }
}
```

## Dependency Injection

Yes, resolver constructor injection is supported.

`ExtensionManager` creates resolver instances via `ActivatorUtilities.CreateInstance(...)`, so constructor parameters are resolved from DI.

Example:

```csharp
public class MyResolver(ILogger<MyResolver> logger, IInventoryService inventoryService)
    : IProductFeedValueResolver, IProductFeedResolverMetadata
{
    // ...
}
```

Important:
- Dependencies must be registered in DI.
- Resolver type registration (`AddScoped<IProductFeedValueResolver, MyResolver>()`) is optional for discovery, but acceptable.

## External Assembly Steps

For resolvers in a separate assembly/package:

1. Create a Class Library targeting the same .NET/Umbraco compatibility as the host.
2. Reference `Merchello.Core` (and `Umbraco.Cms.Core` if you add a composer).
3. Implement resolver classes (`IProductFeedValueResolver`, optional metadata interface).
4. Register custom constructor dependencies in a composer (if needed).
5. Deploy assembly with the Umbraco site.
6. Verify resolver appears in `GET .../product-feeds/resolvers`.

### Minimal Composer Example (external assembly)

```csharp
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace MyCompany.Merchello.ProductFeeds;

public class MyProductFeedResolversComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        // Register dependencies used by resolver constructors.
        builder.Services.AddScoped<IMyDependency, MyDependency>();

        // Optional: explicit resolver registration.
        builder.Services.AddScoped<IProductFeedValueResolver, PrimaryCollectionResolver>();
    }
}
```

Notes:
- Resolver assemblies are included in Merchello startup assembly discovery (`IProductFeedValueResolver` is part of the discovery predicate).
- Alias collisions are de-duplicated by alias; first discovered wins. Keep aliases unique.

## Backoffice Descriptor Contract

Resolver list endpoint:
- `GET /umbraco/backoffice/merchello/api/v1/product-feeds/resolvers`

DTO:
- `Alias`
- `Description`
- `DisplayName`
- `HelpText`
- `SupportsArgs`
- `ArgsHelpText`
- `ArgsExampleJson`

Backoffice behavior:
- Dropdown label uses `DisplayName` first, alias as secondary context.
- Help text renders near resolver selection.
- Args UI shows only when `SupportsArgs == true`.

## Performance and Reliability

Resolvers run per product while feed XML is generated. Keep them cheap and deterministic.

Recommendations:
- Avoid network I/O inside resolver execution path.
- Avoid repeated expensive queries; use already-loaded `context` data where possible.
- Handle missing data gracefully and return `null` instead of throwing for normal absence cases.
- Use cancellation token in async work.

## Troubleshooting

Resolver not visible in dropdown:
- Assembly not loaded/deployed.
- Resolver class not public or is abstract.
- Constructor dependency missing from DI.
- Alias duplicates another resolver.

Resolver selected but no value emitted:
- Resolver returned `null`/empty.
- Args expected but not supplied.
- Custom field attribute blocked by whitelist (for custom fields).

Feed generation warning says resolver not found:
- Feed references an alias that no longer exists or changed.
- Keep resolver aliases stable across releases.

## Built-In Resolver References

Examples shipped with Merchello:
- `src/Merchello.Core/ProductFeeds/Services/ProductFeedSupplierResolver.cs`
- `src/Merchello.Core/ProductFeeds/Services/ProductFeedStockStatusResolver.cs`
- `src/Merchello.Core/ProductFeeds/Services/ProductFeedOnSaleResolver.cs`
- `src/Merchello.Core/ProductFeeds/Services/ProductFeedProductTypeResolver.cs`
- `src/Merchello.Core/ProductFeeds/Services/ProductFeedCollectionsResolver.cs`
