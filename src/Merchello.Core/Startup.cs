using System.Reflection;
using Merchello.Core.Accounting.Handlers;
using Merchello.Core.Accounting.Handlers.Interfaces;
using Merchello.Core.Accounting.Services;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Factories;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Strategies;
using Merchello.Core.Checkout.Strategies.Interfaces;
using Merchello.Core.Customers.Factories;
using Merchello.Core.Customers.Services;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.Discounts.Factories;
using Merchello.Core.Discounts.Services;
using Merchello.Core.Discounts.Services.Calculators;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Locality.Services;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Services;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Caching.Models;
using Merchello.Core.Shared.Reflection;
using Merchello.Core.Caching.Services;
using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.ExchangeRates.Models;
using Merchello.Core.ExchangeRates.Providers;
using Merchello.Core.ExchangeRates.Providers.Interfaces;
using Merchello.Core.ExchangeRates.Services;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.Shipping.Factories;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Providers.Interfaces;
using Merchello.Core.Shipping.Services;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.Handlers;
using Merchello.Core.Notifications.Order;
using Merchello.Core.Notifications.Payment;
using Merchello.Core.Notifications.Shipment;
using Merchello.Core.Payments.Factories;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Payments.Services;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Warehouses.Services;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Reporting.Services;
using Merchello.Core.Reporting.Services.Interfaces;
using Merchello.Core.Suppliers.Factories;
using Merchello.Core.Suppliers.Services;
using Merchello.Core.Suppliers.Services.Interfaces;
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
    /// Adds Merchello services to the Umbraco builder.
    /// </summary>
    public static IUmbracoBuilder AddMerch(this IUmbracoBuilder builder, IEnumerable<Assembly>? pluginAssemblies = null)
    {
        // =====================================================
        // Database & Configuration
        // =====================================================

        // Register MerchelloDbContext with Umbraco's database provider (automatically uses same DB as Umbraco)
        // TODO: Update to new overload when upgrading to Umbraco 18
#pragma warning disable CS0618 // Type or member is obsolete
        builder.Services.AddUmbracoDbContext<MerchelloDbContext>((serviceProvider, options) =>
        {
            options.UseUmbracoDatabaseProvider(serviceProvider);
        });
#pragma warning restore CS0618

        builder.Services.Configure<MerchelloSettings>(builder.Config.GetSection("Merchello"));
        builder.Services.Configure<CheckoutSettings>(builder.Config.GetSection("Merchello:Checkout"));
        builder.Services.Configure<CacheOptions>(builder.Config.GetSection("Merchello:Cache"));
        builder.Services.Configure<ExchangeRateOptions>(builder.Config.GetSection("Merchello:ExchangeRates"));

        // =====================================================
        // Infrastructure (Singletons)
        // =====================================================

        builder.Services.AddMemoryCache();
        builder.Services.AddHybridCache();
        builder.Services.AddHttpClient();

        builder.Services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
        builder.Services.AddSingleton<ICacheService, CacheService>();
        builder.Services.AddSingleton<ICurrencyService, CurrencyService>();
        builder.Services.AddSingleton<ILocalityCatalog, DefaultLocalityCatalog>();
        builder.Services.AddSingleton<ILocalityCacheInvalidator, LocalityCacheInvalidator>();
        builder.Services.AddSingleton<SlugHelper>();

        // =====================================================
        // Factories (Singletons - stateless object creators)
        // =====================================================

        // Checkout & Orders
        builder.Services.AddSingleton<AddressFactory>();
        builder.Services.AddSingleton<BasketFactory>();
        builder.Services.AddSingleton<InvoiceFactory>();
        builder.Services.AddSingleton<LineItemFactory>();
        builder.Services.AddSingleton<OrderFactory>();
        builder.Services.AddSingleton<PaymentFactory>();
        builder.Services.AddSingleton<ShipmentFactory>();

        // Products
        builder.Services.AddSingleton<ProductRootFactory>();
        builder.Services.AddSingleton<ProductFactory>();
        builder.Services.AddSingleton<ProductTypeFactory>();
        builder.Services.AddSingleton<ProductCollectionFactory>();
        builder.Services.AddSingleton<ProductFilterGroupFactory>();
        builder.Services.AddSingleton<ProductFilterFactory>();
        builder.Services.AddSingleton<ProductOptionFactory>();

        // Customers
        builder.Services.AddSingleton<CustomerFactory>();
        builder.Services.AddSingleton<CustomerSegmentFactory>();

        // Discounts
        builder.Services.AddSingleton<DiscountFactory>();

        // Other
        builder.Services.AddSingleton<ShippingOptionFactory>();
        builder.Services.AddSingleton<SupplierFactory>();
        builder.Services.AddSingleton<TaxGroupFactory>();
        builder.Services.AddSingleton<WarehouseFactory>();

        // =====================================================
        // Services (Scoped - use DbContext)
        // =====================================================

        // Checkout & Orders
        builder.Services.AddScoped<ICheckoutService, CheckoutService>();
        builder.Services.AddScoped(sp => new Lazy<ICheckoutService>(() => sp.GetRequiredService<ICheckoutService>()));
        builder.Services.AddScoped<ICheckoutSessionService, CheckoutSessionService>();
        builder.Services.AddScoped<IInvoiceService, InvoiceService>();
        builder.Services.AddScoped<ILineItemService, LineItemService>();
        builder.Services.AddScoped<IOrderStatusHandler, DefaultOrderStatusHandler>();
        builder.Services.AddScoped<IOrderGroupingStrategyResolver, OrderGroupingStrategyResolver>();
        builder.Services.AddScoped<DefaultOrderGroupingStrategy>();

        // Customers
        builder.Services.AddScoped<ICustomerService, CustomerService>();
        builder.Services.AddScoped<ICustomerSegmentService, CustomerSegmentService>();
        builder.Services.AddScoped<ISegmentCriteriaEvaluator, SegmentCriteriaEvaluator>();

        // Discounts
        builder.Services.AddScoped<IDiscountService, DiscountService>();
        builder.Services.AddScoped<IDiscountEngine, DiscountEngine>();
        builder.Services.AddScoped<IBuyXGetYCalculator, BuyXGetYCalculator>();

        // Products & Inventory
        builder.Services.AddScoped<IProductService, ProductService>();
        builder.Services.AddScoped<IInventoryService, InventoryService>();

        // Payments
        builder.Services.AddScoped<IPaymentProviderManager, PaymentProviderManager>();
        builder.Services.AddScoped<IPaymentService, PaymentService>();
        builder.Services.AddScoped<IPaymentLinkService, PaymentLinkService>();

        // Shipping
        builder.Services.AddScoped<IShippingProviderManager, ShippingProviderManager>();
        builder.Services.AddScoped<IShippingQuoteService, ShippingQuoteService>();
        builder.Services.AddScoped<IShippingService, ShippingService>();
        builder.Services.AddScoped<IShippingOptionService, ShippingOptionService>();

        // Tax
        builder.Services.AddScoped<ITaxService, TaxService>();

        // Warehouses & Suppliers
        builder.Services.AddScoped<IWarehouseService, WarehouseService>();
        builder.Services.AddScoped<ISupplierService, SupplierService>();

        // Locality & Locations
        builder.Services.AddScoped<ILocationsService, LocationsService>();

        // Exchange Rates
        builder.Services.AddScoped<IExchangeRateProviderManager, ExchangeRateProviderManager>();
        builder.Services.AddScoped<IExchangeRateCache, ExchangeRateCache>();

        // Reporting
        builder.Services.AddScoped<IReportingService, ReportingService>();

        // Other Scoped
        builder.Services.AddScoped<DbSeeder>();
        builder.Services.AddScoped<ExtensionManager>();
        builder.Services.AddScoped<IMerchelloNotificationPublisher, MerchelloNotificationPublisher>();

        // =====================================================
        // Background Services
        // =====================================================

        builder.Services.AddHostedService<ExchangeRateRefreshJob>();
        builder.Services.AddHostedService<DiscountStatusJob>();

        // =====================================================
        // Notification Handlers
        // =====================================================

        builder.AddNotificationAsyncHandler<OrderStatusChangedNotification, InvoiceTimelineHandler>();
        builder.AddNotificationAsyncHandler<ShipmentCreatedNotification, InvoiceTimelineHandler>();
        builder.AddNotificationAsyncHandler<PaymentCreatedNotification, InvoiceTimelineHandler>();
        builder.AddNotificationAsyncHandler<PaymentRefundedNotification, InvoiceTimelineHandler>();

        // =====================================================
        // Plugin Assembly Discovery
        // =====================================================

        List<Assembly> assembliesToScan = (pluginAssemblies ?? [])
            .Distinct()
            .ToList();

        assembliesToScan.Add(typeof(Startup).Assembly);

        var providerAssemblies = DiscoverProviderAssemblies();
        assembliesToScan.AddRange(providerAssemblies);

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
        var exchangeRateProviderType = typeof(IExchangeRateProvider);

        HashSet<Assembly> discoveredAssemblies = [];

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
                     orderGroupingStrategyType.IsAssignableFrom(t) ||
                     exchangeRateProviderType.IsAssignableFrom(t)));

                if (hasProviders)
                {
                    discoveredAssemblies.Add(assembly);
                }
            }
            catch (Exception ex) when (ex is ReflectionTypeLoadException or NotSupportedException or FileNotFoundException)
            {
                // Expected for dynamic assemblies, collectible assemblies, or assemblies with missing dependencies.
                // These are intentionally skipped during provider discovery.
            }
        }

        return discoveredAssemblies;
    }
}
