using System.Reflection;
using System.Threading;
using Merchello.Core.AddressLookup.Providers;
using Merchello.Core.AddressLookup.Providers.Interfaces;
using Merchello.Core.AddressLookup.Services;
using Merchello.Core.AddressLookup.Services.Interfaces;
using Merchello.Composers;
using Merchello.Core.Accounting.Handlers;
using Merchello.Core.Accounting.Handlers.Interfaces;
using Merchello.Core.Accounting.Services;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout;
using Merchello.Core.Checkout.Factories;
using Merchello.Core.Checkout.Handlers;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Strategies;
using Merchello.Core.Checkout.Strategies.Interfaces;
using Merchello.Core.Customers.Factories;
using Merchello.Core.Customers.Services;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.Data.Handlers;
using Merchello.Core.Data.Seeding;
using Merchello.Core.Discounts.Factories;
using Merchello.Core.Discounts.Services;
using Merchello.Core.Discounts.Services.Calculators;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Locality.Services;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.ProductFeeds.Factories;
using Merchello.Core.ProductFeeds.Services;
using Merchello.Core.ProductFeeds.Services.Interfaces;
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
using Merchello.Core.Fulfilment;
using Merchello.Core.Fulfilment.Handlers;
using Merchello.Core.Fulfilment.Notifications;
using Merchello.Core.Fulfilment.Providers;
using Merchello.Core.Fulfilment.Providers.Interfaces;
using Merchello.Core.Fulfilment.Services;
using Merchello.Core.Fulfilment.Services.Interfaces;
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
using Merchello.Core.Payments.Handlers;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Payments.Services;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Shared.RateLimiting;
using Merchello.Core.Shared.RateLimiting.Interfaces;
using Merchello.Core.Warehouses.Services;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Storefront.Services;
using Merchello.Core.Storefront.Services.Interfaces;
using Merchello.Core.Reporting.Services;
using Merchello.Core.Reporting.Services.Interfaces;
using Merchello.Core.Developer.Services;
using Merchello.Core.Developer.Services.Interfaces;
using Merchello.Core.Tax.Providers;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Core.Tax.Services;
using Merchello.Core.Tax.Services.Interfaces;
using Merchello.Core.Suppliers.Factories;
using Merchello.Core.Webhooks.Handlers;
using Merchello.Core.Webhooks.Models;
using Merchello.Core.Webhooks.Services;
using Merchello.Core.Webhooks.Services.Interfaces;
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Authentication.Interfaces;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.Payments;
using Merchello.Core.Protocols.Payments.Interfaces;
using Merchello.Core.Protocols.UCP.Handlers;
using Merchello.Core.Protocols.UCP.Services;
using Merchello.Core.Protocols.UCP.Services.Interfaces;
using Merchello.Core.Protocols.Webhooks;
using Merchello.Core.Protocols.Webhooks.Interfaces;
using Merchello.Core.Email;
using Merchello.Core.Email.Attachments;
using Merchello.Core.Email.Interfaces;
using Merchello.Core.Email.Handlers;
using Merchello.Core.Email.Services;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Notifications.BasketNotifications;
using Merchello.Core.Notifications.CheckoutNotifications;
using Merchello.Core.Suppliers.Services;
using Merchello.Core.Suppliers.Services.Interfaces;
using Merchello.Core.Accounting;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Upsells.Factories;
using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Core.Locality.Factories;
using Merchello.Core.Warehouses.Factories;
using Merchello.Email.Services;
using Merchello.Factories;
using Merchello.Routing;
using Merchello.Services;
using Merchello.Tax.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Routing;
using Umbraco.Cms.Persistence.EFCore;
using Umbraco.Extensions;

namespace Merchello;

/// <summary>
/// Extension methods for adding Merchello services to the Umbraco builder.
/// </summary>
public static class Startup
{
    /// <summary>
    /// Adds all Merchello services to the Umbraco builder.
    /// </summary>
    /// <remarks>
    /// <para>Registration is organized into sections:</para>
    /// <list type="bullet">
    ///   <item><description>Database &amp; Configuration - DbContext and appsettings bindings</description></item>
    ///   <item><description>Infrastructure - Singletons for caching, currency, and locality services</description></item>
    ///   <item><description>Factories - Stateless object creators for domain models</description></item>
    ///   <item><description>Services - Scoped services organized by feature domain</description></item>
    ///   <item><description>Web Services - Services requiring ASP.NET Core / Umbraco Web dependencies</description></item>
    ///   <item><description>Background Services - Hosted services for scheduled tasks</description></item>
    ///   <item><description>Notification Handlers - Event handlers for webhooks and emails</description></item>
    ///   <item><description>Startup Handlers - One-time initialization on application start</description></item>
    ///   <item><description>Content Finders - URL routing for products and checkout</description></item>
    /// </list>
    /// </remarks>
    /// <param name="builder">The Umbraco builder to add services to.</param>
    /// <param name="pluginAssemblies">Optional assemblies containing Merchello plugin extensions (providers, resolvers, etc.).</param>
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
            options.ConfigureWarnings(w =>
            {
                w.Ignore(SqlServerEventId.SavepointsDisabledBecauseOfMARS);
                w.Ignore(RelationalEventId.MultipleCollectionIncludeWarning);
            });
        });

        // Core settings (currency, tax, store defaults)
        builder.Services.Configure<MerchelloSettings>(builder.Config.GetSection("Merchello"));
        // Google Shopping taxonomy feed mappings and cache settings
        builder.Services.Configure<GoogleShoppingCategorySettings>(builder.Config.GetSection("Merchello:GoogleShoppingCategories"));
        // Checkout flow configuration (guest checkout, session timeouts)
        builder.Services.Configure<CheckoutSettings>(builder.Config.GetSection("Merchello:Checkout"));
        // Abandoned cart detection and recovery email timing (supports legacy and nested sections)
        builder.Services.Configure<AbandonedCheckoutSettings>(builder.Config.GetSection("Merchello:AbandonedCheckout"));
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
        // Protocol infrastructure settings (UCP, etc.)
        builder.Services.Configure<ProtocolSettings>(builder.Config.GetSection("Merchello:Protocols"));
        // Fulfilment provider settings (retries, polling intervals)
        builder.Services.Configure<Core.Fulfilment.FulfilmentSettings>(builder.Config.GetSection("Merchello:Fulfilment"));
        // Upsell feature settings (suggestions per location, cache duration, event retention)
        builder.Services.Configure<UpsellSettings>(builder.Config.GetSection("Merchello:Upsells"));

        // =====================================================
        // Infrastructure (Singletons)
        // =====================================================

        builder.Services.AddMemoryCache();
        builder.Services.AddDataProtection();
        builder.Services.AddHttpClient();
        builder.Services.AddHttpClient("Webhooks", client =>
        {
            // Per-subscription webhook timeout is enforced via cancellation tokens in WebhookDispatcher.
            // Keep HttpClient timeout uncapped to avoid a hidden global 100s ceiling.
            client.Timeout = Timeout.InfiniteTimeSpan;
        });

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
        builder.Services.AddSingleton<ProductFeedFactory>();

        // Customers
        builder.Services.AddSingleton<CustomerFactory>();
        builder.Services.AddSingleton<CustomerSegmentFactory>();

        // Discounts
        builder.Services.AddSingleton<DiscountFactory>();

        // Upsells
        builder.Services.AddSingleton<UpsellFactory>();

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
        builder.Services.AddScoped<ICheckoutDiscountService, CheckoutDiscountService>();
        builder.Services.AddScoped(sp => new Lazy<ICheckoutDiscountService>(() => sp.GetRequiredService<ICheckoutDiscountService>()));
        builder.Services.AddScoped<ICheckoutSessionService, CheckoutSessionService>();
        builder.Services.AddScoped<ICheckoutValidator, CheckoutValidator>();
        builder.Services.AddScoped<IInvoiceService, InvoiceService>();
        builder.Services.AddScoped<IInvoiceEditService, InvoiceEditService>();
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
        builder.Services.AddScoped<IDiscountRuleNameResolver, DiscountRuleNameResolver>();
        builder.Services.AddScoped<IDiscountEngine, DiscountEngine>();
        builder.Services.AddScoped<IBuyXGetYCalculator, BuyXGetYCalculator>();

        // Upsells
        builder.Services.AddScoped<IUpsellService, UpsellService>();
        builder.Services.AddScoped<IUpsellRuleNameResolver, UpsellRuleNameResolver>();
        builder.Services.AddScoped<IUpsellEngine, UpsellEngine>();
        builder.Services.AddScoped<IUpsellContextBuilder, UpsellContextBuilder>();
        builder.Services.AddSingleton<IUpsellAnalyticsService, UpsellAnalyticsService>();
        builder.Services.AddScoped<IPostPurchaseUpsellService, PostPurchaseUpsellService>();

        // Products & Inventory
        builder.Services.AddScoped<IProductService, ProductService>();
        builder.Services.AddScoped<IProductFilterService, ProductFilterService>();
        builder.Services.AddScoped<IProductTypeService, ProductTypeService>();
        builder.Services.AddScoped<IProductCollectionService, ProductCollectionService>();
        builder.Services.AddScoped<IGoogleShoppingCategoryService, GoogleShoppingCategoryService>();
        builder.Services.AddScoped<IInventoryService, InventoryService>();
        builder.Services.AddScoped<IProductFeedService, ProductFeedService>();
        builder.Services.AddScoped<IGoogleProductFeedGenerator, GoogleProductFeedGenerator>();
        builder.Services.AddScoped<IGooglePromotionFeedGenerator, GooglePromotionFeedGenerator>();
        builder.Services.AddScoped<IProductFeedResolverRegistry, ProductFeedResolverRegistry>();
        builder.Services.AddScoped<IProductFeedMediaUrlResolver, ProductFeedMediaUrlResolver>();
        builder.Services.AddScoped<IProductFeedValueResolver, ProductFeedSupplierResolver>();
        builder.Services.AddScoped<IProductFeedValueResolver, ProductFeedStockStatusResolver>();
        builder.Services.AddScoped<IProductFeedValueResolver, ProductFeedOnSaleResolver>();
        builder.Services.AddScoped<IProductFeedValueResolver, ProductFeedProductTypeResolver>();
        builder.Services.AddScoped<IProductFeedValueResolver, ProductFeedCollectionsResolver>();

        // Digital Products
        builder.Services.AddSingleton<Core.DigitalProducts.Factories.DownloadLinkFactory>();
        builder.Services.AddScoped<Core.DigitalProducts.Services.Interfaces.IDigitalProductService, Core.DigitalProducts.Services.DigitalProductService>();

        // Payments
        builder.Services.AddScoped<IPaymentProviderManager, PaymentProviderManager>();
        builder.Services.AddScoped<IPaymentService, PaymentService>();
        builder.Services.AddScoped<IPaymentLinkService, PaymentLinkService>();
        builder.Services.AddScoped<ISavedPaymentMethodService, SavedPaymentMethodService>();
        builder.Services.AddSingleton<SavedPaymentMethodFactory>();
        builder.Services.AddScoped<IWebhookSecurityService, WebhookSecurityService>();
        builder.Services.AddScoped<IPaymentIdempotencyService, PaymentIdempotencyService>();

        // Shared Services
        builder.Services.AddSingleton<IRateLimiter, AtomicRateLimiter>();
        builder.Services.AddSingleton<ISeedDataInstallationState, SeedDataInstallationState>();

        // Shipping
        builder.Services.AddScoped<IShippingProviderManager, ShippingProviderManager>();
        builder.Services.AddScoped<IShippingQuoteService, ShippingQuoteService>();
        builder.Services.AddScoped<IShippingService, ShippingService>();
        builder.Services.AddScoped<IShippingOptionService, ShippingOptionService>();
        builder.Services.AddScoped<IShippingOptionEligibilityService, ShippingOptionEligibilityService>();
        builder.Services.AddScoped<IShipmentService, ShipmentService>();
        builder.Services.AddScoped<IWarehouseProviderConfigService, WarehouseProviderConfigService>();
        builder.Services.AddSingleton<IShippingCostResolver, ShippingCostResolver>();
        builder.Services.AddSingleton<IPostcodeMatcher, PostcodeMatcher>();

        // Fulfilment
        builder.Services.AddScoped<IFulfilmentProviderManager, FulfilmentProviderManager>();
        builder.Services.AddScoped<IFulfilmentService, FulfilmentService>();
        builder.Services.AddScoped<IFulfilmentSyncService, FulfilmentSyncService>();
        builder.Services.AddSingleton<Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv.SupplierDirectCsvGenerator>();
        builder.Services.AddSingleton<Merchello.Core.Fulfilment.Providers.SupplierDirect.Transport.IFtpClientFactory, Merchello.Core.Fulfilment.Providers.SupplierDirect.Transport.FtpClientFactory>();

        // Tax
        builder.Services.AddScoped<ITaxService, TaxService>();
        builder.Services.AddScoped<ITaxProviderManager, TaxProviderManager>();
        builder.Services.AddScoped<ITaxOrchestrationService, TaxOrchestrationService>();
        builder.Services.AddSingleton<ITaxCalculationService, TaxCalculationService>();
        builder.Services.AddSingleton<IProviderSettingsProtector, DataProtectionProviderSettingsProtector>();

        // Address Lookup
        builder.Services.AddScoped<IAddressLookupProviderManager, AddressLookupProviderManager>();
        builder.Services.AddScoped<IAddressLookupService, AddressLookupService>();

        // Warehouses & Suppliers
        builder.Services.AddScoped<IWarehouseService, WarehouseService>();
        builder.Services.AddScoped<ISupplierService, SupplierService>();

        // Locality & Locations
        builder.Services.AddScoped<ILocationsService, LocationsService>();

        // Storefront
        builder.Services.AddScoped<IStorefrontContextService, StorefrontContextService>();
        builder.Services.AddScoped<ICurrencyConversionService, CurrencyConversionService>();

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
        builder.Services.AddSingleton<IEmailAttachmentResolver, EmailAttachmentResolver>();
        builder.Services.AddSingleton<IEmailAttachmentStorageService, EmailAttachmentStorageService>();
        builder.Services.AddScoped<IEmailConfigurationService, EmailConfigurationService>();
        builder.Services.AddScoped<IEmailTemplateRenderer, EmailRazorViewRenderer>();
        builder.Services.AddSingleton<ISampleNotificationFactory, SampleNotificationFactory>();
        builder.Services.AddScoped<IEmailService, EmailService>();

        // PDF & Statements
        builder.Services.AddSingleton<IPdfService, PdfService>();
        builder.Services.AddScoped<IStatementService, StatementService>();

        // Other Scoped
        builder.Services.AddScoped<DbSeeder>();
        builder.Services.AddSingleton<ExtensionManager>();
        builder.Services.AddScoped<IMerchelloNotificationPublisher, MerchelloNotificationPublisher>();

        // Developer Tools
        builder.Services.AddScoped<INotificationDiscoveryService, NotificationDiscoveryService>();

        // Protocols
        builder.Services.AddScoped<ICommerceProtocolManager, CommerceProtocolManager>();
        builder.Services.AddScoped<IPaymentHandlerExporter, PaymentHandlerExporter>();
        builder.Services.AddScoped<ISigningKeyStore, SigningKeyStore>();
        builder.Services.AddScoped<IWebhookSigner, WebhookSigner>();
        builder.Services.AddScoped<IUcpAgentProfileService, UcpAgentProfileService>();
        builder.Services.AddScoped<IAgentAuthenticator, UcpAgentAuthenticator>();
        // UCPProtocolAdapter is auto-discovered by ExtensionManager (implements ICommerceProtocolAdapter)

        // =====================================================
        // Web Services (require ASP.NET Core / Umbraco Web)
        // =====================================================

        // Checkout member service (requires IMemberSignInManager from Umbraco.Cms.Web.Common)
        builder.Services.AddScoped<ICheckoutMemberService, CheckoutMemberService>();
        builder.Services.AddScoped<ICheckoutDtoMapper, CheckoutDtoMapper>();
        builder.Services.AddScoped<IStorefrontDtoMapper, StorefrontDtoMapper>();
        builder.Services.AddScoped<ICheckoutPaymentsOrchestrationService, CheckoutPaymentsOrchestrationService>();
        builder.Services.AddScoped<IOrdersDtoMapper, OrdersDtoMapper>();
        builder.Services.AddScoped<IOrdersRequestMapper, OrdersRequestMapper>();


        // Front-End Rendering
        builder.Services.AddScoped<MerchelloPublishedElementFactory>();
        builder.Services.AddScoped<IMerchelloViewModelFactory, MerchelloViewModelFactory>();
        builder.Services.AddSingleton<IRichTextRenderer, RichTextRenderer>();

        // =====================================================
        // Background Services (Hosted Services)
        // =====================================================
        // These run on configurable intervals defined in appsettings.json.
        // All jobs inherit from BackgroundService and run for the lifetime of the application.

        builder.Services.AddHostedService<ExchangeRateRefreshJob>();        // Refreshes currency exchange rates from configured provider
        builder.Services.AddHostedService<DiscountStatusJob>();             // Marks expired discounts as inactive
        builder.Services.AddHostedService<UpsellStatusJob>();               // Transitions scheduled/expired upsells, cleans up old events
        builder.Services.AddHostedService<OutboundDeliveryJob>();           // Retries failed webhook/email deliveries, cleans up old logs
        builder.Services.AddHostedService<InvoiceReminderJob>();            // Sends payment reminder and overdue notifications
        builder.Services.AddHostedService<AbandonedCheckoutDetectionJob>(); // Detects abandoned carts and triggers recovery emails
        builder.Services.AddHostedService<FulfilmentRetryJob>();              // Retries failed fulfilment submissions to 3PLs
        builder.Services.AddHostedService<FulfilmentPollingJob>();             // Polls 3PLs for order status updates
        builder.Services.AddHostedService<FulfilmentCleanupJob>();             // Cleans up old fulfilment sync/webhook logs
        builder.Services.AddHostedService<EmailAttachmentCleanupJob>();        // Cleans up orphaned email attachment temp files

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
        builder.AddNotificationAsyncHandler<InvoiceDeletedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<InvoiceCancelledNotification, WebhookNotificationHandler>();
        // Payments
        builder.AddNotificationAsyncHandler<PaymentCreatedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<PaymentRefundedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<PaymentCreatedNotification, AbandonedCheckoutConversionHandler>();
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
        // Baskets
        builder.AddNotificationAsyncHandler<BasketCreatedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<BasketItemAddedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<BasketItemRemovedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<BasketItemQuantityChangedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<BasketClearedNotification, WebhookNotificationHandler>();
        // Checkout
        builder.AddNotificationAsyncHandler<CheckoutAbandonedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<CheckoutAbandonedFirstNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<CheckoutAbandonedReminderNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<CheckoutAbandonedFinalNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<CheckoutRecoveredNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<CheckoutRecoveryConvertedNotification, WebhookNotificationHandler>();
        // Digital Products
        builder.AddNotificationAsyncHandler<Core.DigitalProducts.Notifications.DigitalProductDeliveredNotification, WebhookNotificationHandler>();
        // Fulfilment
        builder.AddNotificationAsyncHandler<Core.Fulfilment.Notifications.FulfilmentSubmittedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<Core.Fulfilment.Notifications.FulfilmentSubmissionFailedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<Core.Fulfilment.Notifications.FulfilmentInventoryUpdatedNotification, WebhookNotificationHandler>();
        builder.AddNotificationAsyncHandler<Core.Fulfilment.Notifications.FulfilmentProductSyncedNotification, WebhookNotificationHandler>();

        // -----------------------------------------------------
        // Digital Product Handlers
        // -----------------------------------------------------
        // Handle digital product delivery when payment is successful.
        // Creates download links and auto-completes digital-only orders.

        builder.AddNotificationAsyncHandler<PaymentCreatedNotification, Core.DigitalProducts.Handlers.DigitalProductPaymentHandler>();

        // -----------------------------------------------------
        // Fulfilment Handlers
        // -----------------------------------------------------
        // Auto-submit orders to 3PL fulfilment providers and handle cancellation.

        builder.AddNotificationAsyncHandler<PaymentCreatedNotification, FulfilmentOrderSubmissionHandler>();
        builder.AddNotificationAsyncHandler<OrderStatusChangedNotification, FulfilmentCancellationHandler>();
        // Auto-create preparing shipments for providers that handle fulfilment internally
        builder.AddNotificationAsyncHandler<Core.Fulfilment.Notifications.FulfilmentSubmittedNotification, Core.Fulfilment.Handlers.FulfilmentAutoShipmentHandler>();
        // Add timeline notes for fulfilment events
        builder.AddNotificationAsyncHandler<Core.Fulfilment.Notifications.FulfilmentSubmittedNotification, Core.Fulfilment.Handlers.FulfilmentTimelineHandler>();
        builder.AddNotificationAsyncHandler<Core.Fulfilment.Notifications.FulfilmentSubmissionAttemptFailedNotification, Core.Fulfilment.Handlers.FulfilmentTimelineHandler>();
        builder.AddNotificationAsyncHandler<Core.Fulfilment.Notifications.FulfilmentSubmissionFailedNotification, Core.Fulfilment.Handlers.FulfilmentTimelineHandler>();

        // -----------------------------------------------------
        // UCP Protocol Handlers
        // -----------------------------------------------------
        // Send signed webhooks to UCP agents for order lifecycle events.
        // Webhook URLs are extracted from agent profiles at checkout completion.

        builder.AddNotificationAsyncHandler<OrderStatusChangedNotification, UcpOrderWebhookHandler>();
        builder.AddNotificationAsyncHandler<ShipmentCreatedNotification, UcpOrderWebhookHandler>();
        builder.AddNotificationAsyncHandler<ShipmentSavedNotification, UcpOrderWebhookHandler>();

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
        builder.AddNotificationAsyncHandler<CustomerSavedNotification, EmailNotificationHandler>();
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
        // Digital Products
        builder.AddNotificationAsyncHandler<Core.DigitalProducts.Notifications.DigitalProductDeliveredNotification, EmailNotificationHandler>();
        // Fulfilment
        builder.AddNotificationAsyncHandler<Core.Fulfilment.Notifications.SupplierOrderNotification, EmailNotificationHandler>();

        // Upsells
        builder.AddNotificationAsyncHandler<OrderCreatedNotification, UpsellEmailEnrichmentHandler>();
        builder.AddNotificationAsyncHandler<OrderCreatedNotification, UpsellConversionHandler>();
        builder.AddNotificationAsyncHandler<PaymentCreatedNotification, PaymentPostPurchaseHandler>();
        builder.AddNotificationAsyncHandler<BasketItemAddedNotification, AutoAddUpsellHandler>();
        builder.AddNotificationAsyncHandler<BasketItemRemovedNotification, AutoAddRemovalTracker>();

        // =====================================================
        // Startup Handlers
        // =====================================================
        // These run once when Umbraco starts, in registration order.

        // 1. Run EF Core migrations to ensure database schema is up to date
        builder.AddNotificationAsyncHandler<UmbracoApplicationStartedNotification, RunMerchMigration>();

        // 2. Ensure built-in payment providers (Manual Payment) exist and are enabled
        builder.AddNotificationAsyncHandler<UmbracoApplicationStartedNotification, EnsureBuiltInPaymentProvidersHandler>();

        // 3. Initialize Merchello DataTypes (Product Description TipTap editor)
        builder.Services.AddSingleton<MerchelloDataTypeInitializer>();
        builder.AddNotificationAsyncHandler<UmbracoApplicationStartedNotification, InitializeMerchelloDataTypesHandler>();

        // =====================================================
        // Content Finders
        // =====================================================
        // Custom content finders for product and checkout URL routing.
        var merchelloSettings = new MerchelloSettings();
        builder.Config.GetSection("Merchello").Bind(merchelloSettings);

        if (merchelloSettings.EnableProductRendering)
        {
            builder.ContentFinders().InsertAfter<ContentFinderByUrlNew, ProductContentFinder>();

            if (merchelloSettings.EnableCheckout)
            {
                builder.ContentFinders().InsertAfter<ProductContentFinder, CheckoutContentFinder>();
            }
        }
        else if (merchelloSettings.EnableCheckout)
        {
            builder.ContentFinders().InsertAfter<ContentFinderByUrlNew, CheckoutContentFinder>();
        }

        // =====================================================
        // Plugin Assembly Discovery
        // =====================================================

        List<Assembly> assembliesToScan = (pluginAssemblies ?? [])
            .Distinct()
            .ToList();

        assembliesToScan.Add(typeof(Startup).Assembly);
        assembliesToScan.Add(typeof(MerchelloDbContext).Assembly);

        var providerAssemblies = DiscoverProviderAssemblies();
        assembliesToScan.AddRange(providerAssemblies);

        AssemblyManager.SetAssemblies(assembliesToScan.Distinct().ToArray());

        return builder;
    }

    /// <summary>
    /// Discovers assemblies containing provider, strategy, resolver, and protocol adapter implementations.
    /// Scans all loaded assemblies for types implementing provider interfaces.
    /// </summary>
    private static IEnumerable<Assembly> DiscoverProviderAssemblies()
    {
        var paymentProviderType = typeof(IPaymentProvider);
        var shippingProviderType = typeof(IShippingProvider);
        var fulfilmentProviderType = typeof(IFulfilmentProvider);
        var orderGroupingStrategyType = typeof(IOrderGroupingStrategy);
        var exchangeRateProviderType = typeof(IExchangeRateProvider);
        var taxProviderType = typeof(ITaxProvider);
        var addressLookupProviderType = typeof(IAddressLookupProvider);
        var emailAttachmentType = typeof(IEmailAttachment);
        var commerceProtocolAdapterType = typeof(ICommerceProtocolAdapter);
        var productFeedResolverType = typeof(IProductFeedValueResolver);

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
                     fulfilmentProviderType.IsAssignableFrom(t) ||
                     orderGroupingStrategyType.IsAssignableFrom(t) ||
                     exchangeRateProviderType.IsAssignableFrom(t) ||
                     taxProviderType.IsAssignableFrom(t) ||
                     addressLookupProviderType.IsAssignableFrom(t) ||
                     emailAttachmentType.IsAssignableFrom(t) ||
                     commerceProtocolAdapterType.IsAssignableFrom(t) ||
                     productFeedResolverType.IsAssignableFrom(t)));

                if (hasProviders)
                {
                    discoveredAssemblies.Add(assembly);
                }
            }
            catch (Exception ex) when (ex is ReflectionTypeLoadException or TypeLoadException or NotSupportedException or FileNotFoundException)
            {
                // Expected for dynamic assemblies, collectible assemblies, or assemblies with missing dependencies.
                // These are intentionally skipped during provider discovery.
            }
        }

        return discoveredAssemblies;
    }

}
