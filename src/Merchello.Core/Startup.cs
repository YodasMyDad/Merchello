using System.Reflection;
using Merchello.Core.Accounting.Handlers;
using Merchello.Core.Accounting.Handlers.Interfaces;
using Merchello.Core.Accounting.Services;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout;
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
using Merchello.Core.Caching.Refreshers;
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
using Merchello.Core.Notifications.CustomerNotifications;
using Merchello.Core.Notifications.DiscountNotifications;
using Merchello.Core.Notifications.Inventory;
using Merchello.Core.Notifications.Invoice;
using Merchello.Core.Notifications.Order;
using Merchello.Core.Notifications.Payment;
using Merchello.Core.Notifications.Product;
using Merchello.Core.Notifications.Shipment;
using Merchello.Core.Payments.Factories;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Payments.Services;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Shared.RateLimiting;
using Merchello.Core.Shared.RateLimiting.Interfaces;
using Merchello.Core.Warehouses.Services;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Storefront.Services;
using Merchello.Core.Reporting.Services;
using Merchello.Core.Reporting.Services.Interfaces;
using Merchello.Core.Tax.Providers;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Core.Tax.Services;
using Merchello.Core.Tax.Services.Interfaces;
using Merchello.Core.Suppliers.Factories;
using Merchello.Core.Webhooks.Handlers;
using Merchello.Core.Webhooks.Models;
using Merchello.Core.Webhooks.Services;
using Merchello.Core.Webhooks.Services.Interfaces;
using Merchello.Core.Email;
using Merchello.Core.Email.Handlers;
using Merchello.Core.Email.Services;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Notifications.CheckoutNotifications;
using Merchello.Core.Suppliers.Services;
using Merchello.Core.Suppliers.Services.Interfaces;
using Merchello.Core.Accounting;
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
    /// <remarks>
    /// <para>Registration is organized into sections:</para>
    /// <list type="bullet">
    ///   <item><description>Database &amp; Configuration - DbContext and appsettings bindings</description></item>
    ///   <item><description>Infrastructure - Singletons for caching, currency, and locality services</description></item>
    ///   <item><description>Factories - Stateless object creators for domain models</description></item>
    ///   <item><description>Services - Scoped services organized by feature domain</description></item>
    ///   <item><description>Background Services - Hosted services for scheduled tasks</description></item>
    ///   <item><description>Notification Handlers - Event handlers for webhooks and emails</description></item>
    /// </list>
    /// <para>Web-specific services (requiring Umbraco.Cms.Web.Common) are registered in MerchelloComposer.</para>
    /// </remarks>
    /// <param name="builder">The Umbraco builder to add services to.</param>
    /// <param name="pluginAssemblies">Optional assemblies containing payment/shipping provider plugins.</param>
    /// <returns>The builder for method chaining.</returns>
    public static IUmbracoBuilder AddMerch(this IUmbracoBuilder builder, IEnumerable<Assembly>? pluginAssemblies = null)
    {
        // =====================================================
        // Database & Configuration
        // =====================================================

        // Register MerchelloDbContext with Umbraco's database provider (automatically uses same DB as Umbraco)
        builder.Services.AddUmbracoDbContext<MerchelloDbContext>((serviceProvider, options, connectionString, providerName) =>
        {
            options.UseUmbracoDatabaseProvider(serviceProvider);
        });

        // Core settings (currency, tax, store defaults)
        builder.Services.Configure<MerchelloSettings>(builder.Config.GetSection("Merchello"));
        // Checkout flow configuration (guest checkout, session timeouts)
        builder.Services.Configure<CheckoutSettings>(builder.Config.GetSection("Merchello:Checkout"));
        // Abandoned cart detection and recovery email timing
        builder.Services.Configure<AbandonedCheckoutSettings>(builder.Config.GetSection("Merchello:Checkout:AbandonedCart"));
        // Cache durations for products, customers, etc.
        builder.Services.Configure<CacheOptions>(builder.Config.GetSection("Merchello:Cache"));
        // Currency exchange rate provider and refresh intervals
        builder.Services.Configure<ExchangeRateOptions>(builder.Config.GetSection("Merchello:ExchangeRates"));
        // Outbound webhook delivery settings (retries, timeouts)
        builder.Services.Configure<WebhookSettings>(builder.Config.GetSection("Merchello:Webhooks"));
        // Email provider configuration (SMTP, templates)
        builder.Services.Configure<EmailSettings>(builder.Config.GetSection("Merchello:Email"));
        // Invoice payment reminder and overdue notification timing
        builder.Services.Configure<InvoiceReminderSettings>(builder.Config.GetSection("Merchello:Invoices:Reminders"));

        // =====================================================
        // Infrastructure (Singletons)
        // =====================================================

        builder.Services.AddMemoryCache();
        builder.Services.AddHttpClient();

        // Register Merchello cache refresher for distributed cache invalidation
        builder.CacheRefreshers().Add<MerchelloCacheRefresher>();

        builder.Services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
        builder.Services.AddSingleton<ICacheService, CacheService>();
        builder.Services.AddSingleton<ICurrencyService, CurrencyService>();
        builder.Services.AddSingleton<ICountryCurrencyMappingService, CountryCurrencyMappingService>();
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
        builder.Services.AddScoped<ICheckoutValidator, CheckoutValidator>();
        // Note: ICheckoutMemberService is registered in MerchelloComposer (web project)
        // because it depends on Umbraco.Cms.Web.Common.Security (IMemberSignInManager)
        builder.Services.AddScoped<IInvoiceService, InvoiceService>();
        builder.Services.AddScoped<IInvoiceReminderService, InvoiceReminderService>();
        builder.Services.AddScoped<ILineItemService, LineItemService>();
        builder.Services.AddScoped<IOrderStatusHandler, DefaultOrderStatusHandler>();
        builder.Services.AddScoped<IOrderGroupingStrategyResolver, OrderGroupingStrategyResolver>();
        builder.Services.AddScoped<DefaultOrderGroupingStrategy>();
        builder.Services.AddScoped<IAbandonedCheckoutService, AbandonedCheckoutService>();

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
        builder.Services.AddScoped<IWebhookSecurityService, WebhookSecurityService>();
        builder.Services.AddScoped<IPaymentIdempotencyService, PaymentIdempotencyService>();

        // Shared Services
        builder.Services.AddSingleton<IRateLimiter, AtomicRateLimiter>();

        // Shipping
        builder.Services.AddScoped<IShippingProviderManager, ShippingProviderManager>();
        builder.Services.AddScoped<IShippingQuoteService, ShippingQuoteService>();
        builder.Services.AddScoped<IShippingService, ShippingService>();
        builder.Services.AddScoped<IShippingOptionService, ShippingOptionService>();
        builder.Services.AddScoped<IShipmentService, ShipmentService>();
        builder.Services.AddSingleton<IShippingCostResolver, ShippingCostResolver>();

        // Tax
        builder.Services.AddScoped<ITaxService, TaxService>();
        builder.Services.AddScoped<ITaxProviderManager, TaxProviderManager>();
        builder.Services.AddSingleton<ITaxCalculationService, TaxCalculationService>();

        // Warehouses & Suppliers
        builder.Services.AddScoped<IWarehouseService, WarehouseService>();
        builder.Services.AddScoped<ISupplierService, SupplierService>();

        // Locality & Locations
        builder.Services.AddScoped<ILocationsService, LocationsService>();

        // Storefront
        builder.Services.AddScoped<IStorefrontContextService, StorefrontContextService>();

        // Exchange Rates
        builder.Services.AddScoped<IExchangeRateProviderManager, ExchangeRateProviderManager>();
        builder.Services.AddScoped<IExchangeRateCache, ExchangeRateCache>();

        // Reporting
        builder.Services.AddScoped<IReportingService, ReportingService>();

        // Webhooks
        builder.Services.AddSingleton<IWebhookTopicRegistry, WebhookTopicRegistry>();
        builder.Services.AddScoped<IWebhookDispatcher, WebhookDispatcher>();
        builder.Services.AddScoped<IWebhookService, WebhookService>();

        // Email
        builder.Services.AddSingleton<IEmailTopicRegistry, EmailTopicRegistry>();
        builder.Services.AddSingleton<IEmailTokenResolver, EmailTokenResolver>();
        builder.Services.AddSingleton<IEmailTemplateDiscoveryService, EmailTemplateDiscoveryService>();
        builder.Services.AddSingleton<IMjmlCompiler, MjmlCompiler>();
        builder.Services.AddScoped<IEmailConfigurationService, EmailConfigurationService>();
        builder.Services.AddScoped<IEmailService, EmailService>();

        // PDF & Statements
        builder.Services.AddSingleton<IPdfService, PdfService>();
        builder.Services.AddScoped<IStatementService, StatementService>();

        // Other Scoped
        builder.Services.AddScoped<DbSeeder>();
        builder.Services.AddScoped<ExtensionManager>();
        builder.Services.AddScoped<IMerchelloNotificationPublisher, MerchelloNotificationPublisher>();

        // =====================================================
        // Background Services (Hosted Services)
        // =====================================================
        // These run on configurable intervals defined in appsettings.json.
        // All jobs inherit from BackgroundService and run for the lifetime of the application.

        builder.Services.AddHostedService<ExchangeRateRefreshJob>();        // Refreshes currency exchange rates from configured provider
        builder.Services.AddHostedService<DiscountStatusJob>();             // Marks expired discounts as inactive
        builder.Services.AddHostedService<OutboundDeliveryJob>();           // Retries failed webhook/email deliveries, cleans up old logs
        builder.Services.AddHostedService<InvoiceReminderJob>();            // Sends payment reminder and overdue notifications
        builder.Services.AddHostedService<AbandonedCheckoutDetectionJob>(); // Detects abandoned carts and triggers recovery emails

        // =====================================================
        // Notification Handlers
        // =====================================================
        // Handlers subscribe to internal events and trigger side effects.
        // Multiple handlers can respond to the same notification.

        // -----------------------------------------------------
        // Invoice Timeline Handlers
        // -----------------------------------------------------
        // Updates the invoice activity timeline for order/payment events

        builder.AddNotificationAsyncHandler<OrderStatusChangedNotification, InvoiceTimelineHandler>();
        builder.AddNotificationAsyncHandler<ShipmentCreatedNotification, InvoiceTimelineHandler>();
        builder.AddNotificationAsyncHandler<PaymentCreatedNotification, InvoiceTimelineHandler>();
        builder.AddNotificationAsyncHandler<PaymentRefundedNotification, InvoiceTimelineHandler>();

        // -----------------------------------------------------
        // Webhook Handlers
        // -----------------------------------------------------
        // Bridge internal events to external webhook endpoints.
        // Configure webhooks in the backoffice under Settings > Webhooks.

        // Orders
        builder.AddNotificationAsyncHandler<OrderCreatedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<OrderSavedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<OrderStatusChangedNotification, WebhookNotificationHandler>();
        // Invoices
        builder.AddNotificationAsyncHandler<InvoiceSavedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<InvoiceCancelledNotification, WebhookNotificationHandler>();
        // Payments
        builder.AddNotificationAsyncHandler<PaymentCreatedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<PaymentRefundedNotification, WebhookNotificationHandler>();
        // Products
        builder.AddNotificationAsyncHandler<ProductCreatedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<ProductSavedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<ProductDeletedNotification, WebhookNotificationHandler>();
        // Customers
        builder.AddNotificationAsyncHandler<CustomerCreatedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<CustomerSavedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<CustomerDeletedNotification, WebhookNotificationHandler>();
        // Shipments
        builder.AddNotificationAsyncHandler<ShipmentCreatedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<ShipmentSavedNotification, WebhookNotificationHandler>();
        // Discounts
        builder.AddNotificationAsyncHandler<DiscountCreatedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<DiscountSavedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<DiscountDeletedNotification, WebhookNotificationHandler>();
        // Inventory
        builder.AddNotificationAsyncHandler<StockAdjustedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<LowStockNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<StockReservedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<StockAllocatedNotification, WebhookNotificationHandler>();
        // Checkout
        builder.AddNotificationAsyncHandler<CheckoutAbandonedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<CheckoutAbandonedFirstNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<CheckoutAbandonedReminderNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<CheckoutAbandonedFinalNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<CheckoutRecoveredNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<CheckoutRecoveryConvertedNotification, WebhookNotificationHandler>();

        // -----------------------------------------------------
        // Email Handlers
        // -----------------------------------------------------
        // Send emails based on configured email templates.
        // Configure email templates in the backoffice under Settings > Email.

        // Orders
        builder.AddNotificationAsyncHandler<OrderCreatedNotification, EmailNotificationHandler>();
        builder.AddNotificationAsyncHandler<OrderStatusChangedNotification, EmailNotificationHandler>();
        builder.AddNotificationAsyncHandler<InvoiceCancelledNotification, EmailNotificationHandler>();
        // Payments
        builder.AddNotificationAsyncHandler<PaymentCreatedNotification, EmailNotificationHandler>();
        builder.AddNotificationAsyncHandler<PaymentRefundedNotification, EmailNotificationHandler>();
        // Customers
        builder.AddNotificationAsyncHandler<CustomerCreatedNotification, EmailNotificationHandler>();
        builder.AddNotificationAsyncHandler<CustomerPasswordResetRequestedNotification, EmailNotificationHandler>();
        // Shipments
        builder.AddNotificationAsyncHandler<ShipmentCreatedNotification, EmailNotificationHandler>();
        builder.AddNotificationAsyncHandler<ShipmentSavedNotification, EmailNotificationHandler>();
        builder.AddNotificationAsyncHandler<ShipmentStatusChangedNotification, EmailNotificationHandler>();
        // Invoices
        builder.AddNotificationAsyncHandler<InvoiceSavedNotification, EmailNotificationHandler>();
        builder.AddNotificationAsyncHandler<InvoiceDeletedNotification, EmailNotificationHandler>();
        builder.AddNotificationAsyncHandler<InvoiceReminderNotification, EmailNotificationHandler>();
        builder.AddNotificationAsyncHandler<InvoiceOverdueNotification, EmailNotificationHandler>();
        // Inventory
        builder.AddNotificationAsyncHandler<LowStockNotification, EmailNotificationHandler>();
        // Checkout
        builder.AddNotificationAsyncHandler<CheckoutAbandonedNotification, EmailNotificationHandler>();
        builder.AddNotificationAsyncHandler<CheckoutAbandonedFirstNotification, EmailNotificationHandler>();
        builder.AddNotificationAsyncHandler<CheckoutAbandonedReminderNotification, EmailNotificationHandler>();
        builder.AddNotificationAsyncHandler<CheckoutAbandonedFinalNotification, EmailNotificationHandler>();
        builder.AddNotificationAsyncHandler<CheckoutRecoveredNotification, EmailNotificationHandler>();
        builder.AddNotificationAsyncHandler<CheckoutRecoveryConvertedNotification, EmailNotificationHandler>();

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
        var taxProviderType = typeof(ITaxProvider);

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
                     exchangeRateProviderType.IsAssignableFrom(t) ||
                     taxProviderType.IsAssignableFrom(t)));

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
