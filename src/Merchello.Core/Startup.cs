using System.Reflection;
using Merchello.Core.Accounting.Handlers;
using Merchello.Core.Accounting.Services;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Services;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Strategies;
using Merchello.Core.Data;
using Merchello.Core.Locality.Services;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Services;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Options;
using Merchello.Core.Shared.Reflection;
using Merchello.Core.Shared.Services;
using Merchello.Core.Shipping.Factories;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Services;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Handlers;
using Merchello.Core.Notifications.Order;
using Merchello.Core.Notifications.Payment;
using Merchello.Core.Notifications.Shipment;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Services;
using Merchello.Core.Warehouses.Services;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Locality.Factories;
using Merchello.Core.Warehouses.Factories;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Persistence.EFCore;
using Umbraco.Extensions;

namespace Merchello.Core;

public static class Startup
{
    /// <summary>
    /// Adds Merchello services to the Umbraco builder
    /// </summary>
    public static IUmbracoBuilder AddMerch(this IUmbracoBuilder builder, IEnumerable<Assembly>? pluginAssemblies = null)
    {
        // Register MerchelloDbContext with Umbraco's database provider (automatically uses same DB as Umbraco)
        // TODO: Update to new overload when upgrading to Umbraco 18
#pragma warning disable CS0618 // Type or member is obsolete
        builder.Services.AddUmbracoDbContext<MerchelloDbContext>((serviceProvider, options) =>
        {
            options.UseUmbracoDatabaseProvider(serviceProvider);
        });
#pragma warning restore CS0618

        // Configure Merchello settings
        builder.Services.Configure<MerchelloSettings>(builder.Config.GetSection("Merchello"));
        builder.Services.Configure<CacheOptions>(builder.Config.GetSection("Merchello:Cache"));

        // Caching
        builder.Services.AddMemoryCache();
        builder.Services.AddHybridCache();

        builder.Services.AddSingleton<CacheService>();
        builder.Services.AddScoped<ExtensionManager>();
        builder.Services.AddSingleton<SlugHelper>();

        // Factories
        builder.Services.AddSingleton<TaxGroupFactory>();
        builder.Services.AddSingleton<ProductRootFactory>();
        builder.Services.AddSingleton<ProductFactory>();
        builder.Services.AddSingleton<ProductTypeFactory>();
        builder.Services.AddSingleton<ProductCategoryFactory>();
        builder.Services.AddSingleton<ProductFilterGroupFactory>();
        builder.Services.AddSingleton<ProductFilterFactory>();
        builder.Services.AddSingleton<ProductOptionFactory>();
        builder.Services.AddSingleton<ShippingOptionFactory>();
        builder.Services.AddSingleton<WarehouseFactory>();
        builder.Services.AddSingleton<LineItemFactory>();
        builder.Services.AddSingleton<AddressFactory>();

        // Database seeding
        builder.Services.AddScoped<DbSeeder>();

        // Services
        builder.Services.AddScoped<ILineItemService, LineItemService>();
        builder.Services.AddScoped<ICheckoutService, CheckoutService>();
        builder.Services.AddScoped<IInvoiceService, InvoiceService>();
        builder.Services.AddScoped<IInventoryService, InventoryService>();
        builder.Services.AddScoped<IOrderStatusHandler, DefaultOrderStatusHandler>();
        builder.Services.AddScoped<IShippingQuoteService, ShippingQuoteService>();
        builder.Services.AddScoped<IShippingProviderManager, ShippingProviderManager>();
        builder.Services.AddScoped<IShippingService, ShippingService>();
        builder.Services.AddScoped<IWarehouseService, WarehouseService>();
        builder.Services.AddScoped<ILocationsService, LocationsService>();
        builder.Services.AddSingleton<ILocalityCatalog, DefaultLocalityCatalog>();
        builder.Services.AddSingleton<ILocalityCacheInvalidator, LocalityCacheInvalidator>();
        builder.Services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
        builder.Services.AddScoped<IProductService, ProductService>();
        builder.Services.AddScoped<ITaxService, TaxService>();

        // Payment services
        builder.Services.AddScoped<IPaymentProviderManager, PaymentProviderManager>();
        builder.Services.AddScoped<IPaymentService, PaymentService>();

        // Order grouping strategy
        builder.Services.AddScoped<IOrderGroupingStrategyResolver, OrderGroupingStrategyResolver>();
        builder.Services.AddScoped<DefaultOrderGroupingStrategy>();

        // Notification publisher
        builder.Services.AddScoped<IMerchelloNotificationPublisher, MerchelloNotificationPublisher>();

        // Internal notification handlers for invoice timeline (dogfooding)
        builder.AddNotificationAsyncHandler<OrderStatusChangedNotification, InvoiceTimelineHandler>();
        builder.AddNotificationAsyncHandler<ShipmentCreatedNotification, InvoiceTimelineHandler>();
        builder.AddNotificationAsyncHandler<PaymentCreatedNotification, InvoiceTimelineHandler>();
        builder.AddNotificationAsyncHandler<PaymentRefundedNotification, InvoiceTimelineHandler>();

        // Plugin assemblies for extension scanning
        // Start with explicitly passed assemblies
        List<Assembly> assembliesToScan = (pluginAssemblies ?? [])
            .Distinct()
            .ToList();

        // Always include Merchello.Core assembly
        assembliesToScan.Add(typeof(Startup).Assembly);

        // Auto-discover assemblies containing IPaymentProvider or IShippingProvider implementations
        var providerAssemblies = DiscoverProviderAssemblies();
        assembliesToScan.AddRange(providerAssemblies);

        // Remove duplicates and set assemblies for scanning
        AssemblyManager.SetAssemblies(assembliesToScan.Distinct().ToArray());

        return builder;
    }

    /// <summary>
    /// Discovers assemblies containing payment, shipping, or order grouping strategy implementations.
    /// Scans all loaded assemblies for types implementing IPaymentProvider, IShippingProvider, or IOrderGroupingStrategy.
    /// </summary>
    private static IEnumerable<Assembly> DiscoverProviderAssemblies()
    {
        var paymentProviderType = typeof(IPaymentProvider);
        var shippingProviderType = typeof(IShippingProvider);
        var orderGroupingStrategyType = typeof(IOrderGroupingStrategy);

        var discoveredAssemblies = new HashSet<Assembly>();

        foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
        {
            // Skip system and framework assemblies
            var assemblyName = assembly.GetName().Name;
            if (assemblyName == null ||
                assemblyName.StartsWith("System", StringComparison.OrdinalIgnoreCase) ||
                assemblyName.StartsWith("Microsoft", StringComparison.OrdinalIgnoreCase) ||
                assemblyName.StartsWith("netstandard", StringComparison.OrdinalIgnoreCase) ||
                assemblyName.StartsWith("mscorlib", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            try
            {
                var types = assembly.GetExportedTypes();
                var hasProviders = types.Any(t =>
                    t.IsClass && !t.IsAbstract &&
                    (paymentProviderType.IsAssignableFrom(t) ||
                     shippingProviderType.IsAssignableFrom(t) ||
                     orderGroupingStrategyType.IsAssignableFrom(t)));

                if (hasProviders)
                {
                    discoveredAssemblies.Add(assembly);
                }
            }
            catch
            {
                // Skip assemblies that can't be scanned (e.g., dynamic assemblies)
            }
        }

        return discoveredAssemblies;
    }
}
