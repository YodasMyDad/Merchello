# Extension Manager and Plugin Architecture

Merchello uses a modular plugin system built around the `ExtensionManager`. This is how your custom providers, strategies, and resolvers get discovered and instantiated at runtime -- without you needing to write any registration boilerplate.

## How It Works

When your Umbraco site starts up and calls `AddMerchello()`, Merchello scans loaded assemblies for classes that implement any of its provider interfaces. If it finds yours, your code gets automatically loaded and made available.

Here's the simplified flow:

```
App Starts
    -> AddMerchello() called in Startup
    -> DiscoverProviderAssemblies() scans loaded assemblies
    -> AssemblyManager caches the discovered types
    -> Provider managers use ExtensionManager to instantiate them on demand
```

## What Gets Discovered

Merchello scans for implementations of these interfaces:

| Interface | Purpose |
|---|---|
| `IPaymentProvider` | Payment gateways (Stripe, PayPal, etc.) |
| `IShippingProvider` | Shipping rate providers (FedEx, UPS, flat-rate) |
| `ITaxProvider` | Tax calculation providers (Avalara, manual rates) |
| `IFulfilmentProvider` | 3PL fulfilment providers (ShipBob, Supplier Direct) |
| `IExchangeRateProvider` | Currency exchange rate sources |
| `IAddressLookupProvider` | Address autocomplete/validation providers |
| `IOrderGroupingStrategy` | Custom order grouping strategies |
| `ICommerceProtocolAdapter` | Commerce protocol adapters (UCP) |
| `IProductFeedValueResolver` | Custom product feed field resolvers |

## Registering Your Plugin Assembly

There are two ways to get your plugin assembly discovered:

### Option 1: Automatic Discovery (Recommended)

If your assembly is loaded in the app domain and contains a class implementing any of the interfaces above, Merchello finds it automatically. This is the simplest approach -- just reference your NuGet package or project and you're done.

```csharp
// Your custom provider in a separate project/NuGet package
// As long as it's referenced by the web project, it gets found automatically
public class AcmeShippingProvider : ShippingProviderBase
{
    // ...
}
```

### Option 2: Explicit Assembly Registration

If automatic discovery doesn't pick up your assembly (for example, if it's loaded dynamically), you can pass it explicitly:

```csharp
// In your Startup.cs / Program.cs
builder.CreateUmbracoBuilder()
    .AddMerchello(pluginAssemblies: [typeof(AcmeShippingProvider).Assembly])
    .Build();
```

## How ExtensionManager Instantiates Providers

The `ExtensionManager` uses `ActivatorUtilities.CreateInstance()` from the DI container. This means your providers can use **constructor injection** for any registered service:

```csharp
public class AcmeShippingProvider(
    ICurrencyService currencyService,
    IHttpClientFactory httpClientFactory,
    ILogger<AcmeShippingProvider> logger)
    : ShippingProviderBase(currencyService)
{
    // All dependencies are resolved from the DI container
}
```

> **Warning:** Always use constructor injection. Never use setter injection or service locator patterns -- Merchello relies on `ActivatorUtilities` to create instances, so all dependencies must be constructor parameters.

## Assembly Scanning Details

When `AddMerchello()` runs, it builds a list of assemblies to scan:

1. The web project assembly (`typeof(Startup).Assembly`)
2. The Merchello.Core assembly (`typeof(MerchelloDbContext).Assembly`)
3. Any explicitly passed `pluginAssemblies`
4. Assemblies discovered by scanning `AppDomain.CurrentDomain.GetAssemblies()`

System and framework assemblies (`System.*`, `Microsoft.*`, `netstandard`, `mscorlib`) are skipped for performance.

The discovered assemblies are registered with `AssemblyManager.SetAssemblies()`, which makes them available to all `ExtensionManager` calls throughout the application lifetime.

## Provider Manager Pattern

Each provider type has its own "manager" that wraps `ExtensionManager` and adds provider-specific logic (configuration loading, enabling/disabling, etc.). For example:

- `PaymentProviderManager` manages `IPaymentProvider` instances
- `ShippingProviderManager` manages `IShippingProvider` instances
- `TaxProviderManager` manages `ITaxProvider` instances

When a manager needs provider instances, it calls something like:

```csharp
var providers = extensionManager.GetInstances<IPaymentProvider>(useCaching: true);
```

The `useCaching` flag tells `ExtensionManager` to cache the discovered types so subsequent calls don't re-scan assemblies.

## Caching Behavior

`ExtensionManager` supports two levels of caching:

1. **Type caching** (`useCaching: true`): Caches the discovered `Type` objects so assembly scanning only happens once per interface.
2. **Instance creation**: New instances are created each time `GetInstances` is called. The provider managers handle their own instance caching.

> **Tip:** If you update your provider class and redeploy, the type cache is cleared automatically since the app restarts. No manual cache invalidation needed.

## Creating Your Own Provider

The general pattern for any provider is:

1. Create a class that extends the appropriate base class (e.g., `PaymentProviderBase`, `ShippingProviderBase`)
2. Implement the required abstract members (typically `Metadata` and a few core methods)
3. Use constructor injection for dependencies
4. Reference your assembly from the web project

That's it. See the individual provider guides for detailed walkthroughs:

- [Creating Payment Providers](creating-payment-providers.md)
- [Creating Shipping Providers](creating-shipping-providers.md)
- [Creating Tax Providers](creating-tax-providers.md)
- [Creating Fulfilment Providers](creating-fulfilment-providers.md)
- [Creating Exchange Rate Providers](creating-exchange-rate-providers.md)
- [Creating Address Lookup Providers](creating-address-lookup-providers.md)
- [Custom Order Grouping Strategies](custom-order-grouping.md)
- [Creating Product Feed Resolvers](creating-product-feed-resolvers.md)
- [Custom Notification Handlers](notification-handlers.md)
- [Creating Commerce Protocol Adapters](commerce-protocol-adapters.md)
