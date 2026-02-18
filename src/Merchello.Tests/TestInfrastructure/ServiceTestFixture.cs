using System.IO;
using System.Linq;
using System.Net.Http;
using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Handlers;
using Merchello.Core.Accounting.Handlers.Interfaces;
using Merchello.Core.Accounting.Services;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.Payments;
using Merchello.Core.Protocols.Payments.Interfaces;
using Merchello.Core.Protocols.Webhooks;
using Merchello.Core.Protocols.Webhooks.Interfaces;
using Merchello.Core.Protocols.UCP;
using Merchello.Core.Protocols.UCP.Handlers;
using Merchello.Core.Protocols.UCP.Services;
using Merchello.Core.Protocols.UCP.Services.Interfaces;
using Merchello.Core.Shared.Reflection;
using Merchello.Core.Checkout;
using Merchello.Core.Checkout.Factories;
using Merchello.Core.Checkout.Handlers;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Strategies;
using Merchello.Core.Checkout.Strategies.Interfaces;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Providers.Interfaces;
using Merchello.Core.Customers.Dtos;
using Merchello.Core.Customers.Factories;
using Merchello.Core.Customers.Models;
using Merchello.Core.Customers.Services;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.DigitalProducts.Factories;
using Merchello.Core.DigitalProducts.Handlers;
using Merchello.Core.DigitalProducts.Models;
using Merchello.Core.DigitalProducts.Services;
using Merchello.Core.DigitalProducts.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.Email;
using Merchello.Core.Email.Attachments;
using Merchello.Core.Email.Handlers;
using Merchello.Core.Email.Interfaces;
using Merchello.Core.Email.Models;
using Merchello.Core.Email.Services;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.ExchangeRates.Models;
using Merchello.Core.ExchangeRates.Services;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.Locality.Factories;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Handlers;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Products.Dtos;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;
using Merchello.Core.ProductFeeds.Models;
using Merchello.Core.Products.Services;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Factories;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Storefront.Models;
using Merchello.Core.Storefront.Services;
using Merchello.Core.Storefront.Services.Interfaces;
using Merchello.Core.Suppliers.Models;
using Merchello.Core.Tax.Services;
using Merchello.Core.Tax.Services.Interfaces;
using Merchello.Core.Tax.Providers;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Core.Tax.Providers.Models;
using Merchello.Core.Discounts.Factories;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services.Calculators;
using Merchello.Core.Discounts.Services;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Upsells.Factories;
using Merchello.Core.Upsells.Dtos;
using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Core.Payments.Dtos;
using Merchello.Core.Payments.Factories;
using Merchello.Core.Payments.Services;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Shared.RateLimiting.Interfaces;
using Merchello.Core.Shared.RateLimiting.Models;
using Merchello.Core.Warehouses.Factories;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Warehouses.Services;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Parameters;
using Merchello.Core.Locality.Models;
using Merchello.Core.Locality.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Merchello.Core.Webhooks.Models;
using Merchello.Core.Webhooks.Handlers;
using Merchello.Core.Webhooks.Services;
using Merchello.Core.Webhooks.Services.Interfaces;
using Merchello.Core.Fulfilment;
using Merchello.Core.Fulfilment.Handlers;
using Merchello.Core.Fulfilment.Providers;
using Merchello.Core.Fulfilment.Providers.Interfaces;
using Merchello.Core.Fulfilment.Services;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Scoping;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Tests.TestInfrastructure;

/// <summary>
/// Shared test fixture providing DI container and in-memory database for integration tests.
/// Uses SQLite in-memory mode for fast, isolated test execution.
/// Uses Moq to create scope provider that forwards calls to real DbContext.
/// </summary>
public class ServiceTestFixture : IDisposable
{
    private readonly string _databaseFilePath;
    private readonly string _connectionString;
    private readonly string[] _tableNames;

    // Keep a master connection open so the shared database persists while tests run
    private SqliteConnection _keepAliveConnection;
    private readonly ServiceProvider _serviceProvider;
    private MockHttpContextAccessor _mockHttpContextAccessor = null!;

    // Configurable exchange rate cache mock for multi-currency testing
    private Mock<IExchangeRateCache> _exchangeRateCacheMock = null!;

    // Configurable fulfilment provider manager mock for fulfilment testing
    private Mock<IFulfilmentProviderManager> _fulfilmentProviderManagerMock = null!;

    // Configurable payment provider manager mock for payment testing
    private Mock<IPaymentProviderManager> _paymentProviderManagerMock = null!;

    // Configurable tax provider manager mock for tax orchestration testing
    private Mock<ITaxProviderManager> _taxProviderManagerMock = null!;

    // Cache service mock used by services that rely on tagged invalidation.
    private Mock<ICacheService> _cacheServiceMock = null!;

    public MerchelloDbContext DbContext { get; private set; } = null!;
    public IServiceProvider ServiceProvider => _serviceProvider;

    /// <summary>
    /// Gets the mock HTTP context accessor for test configuration.
    /// Use this to set up session data before tests that require HTTP context.
    /// </summary>
    public MockHttpContextAccessor MockHttpContext => _mockHttpContextAccessor;

    /// <summary>
    /// Gets the mock fulfilment provider manager for test configuration.
    /// Use this to configure fulfilment provider behavior per-test.
    /// </summary>
    public Mock<IFulfilmentProviderManager> FulfilmentProviderManagerMock => _fulfilmentProviderManagerMock;

    /// <summary>
    /// Gets the mock payment provider manager for test configuration.
    /// Use this to configure payment provider behavior per-test.
    /// </summary>
    public Mock<IPaymentProviderManager> PaymentProviderManagerMock => _paymentProviderManagerMock;

    /// <summary>
    /// Gets the mock tax provider manager for tax orchestration test configuration.
    /// </summary>
    public Mock<ITaxProviderManager> TaxProviderManagerMock => _taxProviderManagerMock;

    /// <summary>
    /// Gets the cache service mock for cache-invalidation assertions.
    /// </summary>
    public Mock<ICacheService> CacheServiceMock => _cacheServiceMock;

    public ServiceTestFixture()
    {
        _databaseFilePath = Path.Combine(Path.GetTempPath(), $"merchello_tests_{Guid.NewGuid():N}.db");
        _connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = _databaseFilePath,
            Cache = SqliteCacheMode.Shared,
            Pooling = false
        }.ToString();

        if (File.Exists(_databaseFilePath))
        {
            File.Delete(_databaseFilePath);
        }

        // Create and open a SQLite connection (kept alive for DB lifetime)
        _keepAliveConnection = new SqliteConnection(_connectionString);
        _keepAliveConnection.Open();

        var services = new ServiceCollection();

        // Logging
        services.AddLogging(builder => builder.AddDebug().SetMinimumLevel(LogLevel.Debug));
        services.AddMemoryCache();

        // DbContext with SQLite
        services.AddDbContext<MerchelloDbContext>(options =>
            options.UseSqlite(_connectionString));
        services.AddDbContextFactory<MerchelloDbContext>(options =>
            options.UseSqlite(_connectionString));

        // Ensure the schema exists and cache table names for fast reset operations
        using (var setupContext = CreateDbContext())
        {
            setupContext.Database.EnsureCreated();
            _tableNames = setupContext.Model.GetEntityTypes()
                .Select(t => t.GetTableName())
                .Where(n => !string.IsNullOrWhiteSpace(n))
                .Distinct()
                .Select(n => n!)
                .ToArray();
        }

        DbContext = CreateDbContext();

        // Create mock scope provider that forwards to the real DbContext
        var mockScopeProvider = CreateMockScopeProvider(CreateDbContext);
        services.AddSingleton(mockScopeProvider);

        // Factories
        services.AddSingleton<WarehouseFactory>();
        services.AddSingleton<TaxGroupFactory>();
        services.AddSingleton<ProductTypeFactory>();
        services.AddSingleton<ProductRootFactory>();
        services.AddSingleton<ProductFactory>();
        services.AddSingleton<ProductOptionFactory>();
        services.AddSingleton<ProductCollectionFactory>();
        services.AddSingleton<ShippingOptionFactory>();
        services.AddSingleton<ShipmentFactory>();
        services.AddSingleton<LineItemFactory>();
        services.AddSingleton<AddressFactory>();
        services.AddSingleton<CustomerSegmentFactory>();

        // Utilities
        services.AddSingleton<SlugHelper>();

        // Settings
        var merchelloSettings = new MerchelloSettings
        {
            StoreCurrencyCode = "USD",
            DefaultShippingCountry = "US",
            DefaultRounding = MidpointRounding.AwayFromZero,
            Store = new StoreSettings
            {
                WebsiteUrl = "https://test.example.com",
                TermsUrl = "https://test.example.com/terms",
                PrivacyUrl = "https://test.example.com/privacy"
            },
            DownloadTokenSecret = "test-download-token-secret-32-chars"
        };
        services.AddSingleton(Options.Create(merchelloSettings));

        var upsellSettings = new UpsellSettings
        {
            MaxSuggestionsPerLocation = 3,
            CacheDurationSeconds = 60,
            EventRetentionDays = 30,
            EnablePostPurchase = true,
            PostPurchaseTimeoutSeconds = 60,
            PostPurchaseFulfillmentHoldMinutes = 5
        };
        services.AddSingleton(Options.Create(upsellSettings));

        // Currency services
        services.AddScoped<ICurrencyService, CurrencyService>();

        // Mock exchange rate cache for testing (default: 1:1 rates, configurable via SetExchangeRate)
        _exchangeRateCacheMock = new Mock<IExchangeRateCache>();
        _exchangeRateCacheMock
            .Setup(x => x.GetRateQuoteAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ExchangeRateQuote(1m, DateTime.UtcNow, "mock"));
        _exchangeRateCacheMock
            .Setup(x => x.GetRateAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(1m);
        services.AddSingleton(_exchangeRateCacheMock.Object);

        // Services
        services.AddScoped<IOrderStatusHandler, DefaultOrderStatusHandler>();
        services.AddScoped<IInventoryService, InventoryService>();
        services.AddScoped<IWarehouseService, WarehouseService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<IProductCollectionService, ProductCollectionService>();

        // Customer segment services
        services.AddScoped<ISegmentCriteriaEvaluator, SegmentCriteriaEvaluator>();
        services.AddScoped<ICustomerSegmentService, CustomerSegmentService>();

        // Shipping service and its dependencies
        services.AddScoped<IOrderGroupingStrategy, DefaultOrderGroupingStrategy>();

        // Create a singleton wrapper around strategy resolver
        services.AddSingleton<IOrderGroupingStrategyResolver>(sp =>
        {
            var mockStrategyResolver = new Mock<IOrderGroupingStrategyResolver>();
            // Lazy-load the strategy since it depends on scoped services
            mockStrategyResolver
                .Setup(r => r.GetStrategy())
                .Returns(() =>
                {
                    using var scope = sp.CreateScope();
                    return scope.ServiceProvider.GetRequiredService<IOrderGroupingStrategy>();
                });
            return mockStrategyResolver.Object;
        });

        // Notification publisher + handlers (close to production behavior)
        services.AddSingleton<IMerchelloNotificationPublisher, MerchelloNotificationPublisher>();
        RegisterNotificationHandler<InvoiceTimelineHandler>(services);
        RegisterNotificationHandler<EmailNotificationHandler>(services);
        RegisterNotificationHandler<WebhookNotificationHandler>(services);
        RegisterNotificationHandler<DigitalProductPaymentHandler>(services);
        RegisterNotificationHandler<FulfilmentOrderSubmissionHandler>(services);
        RegisterNotificationHandler<FulfilmentAutoShipmentHandler>(services);
        RegisterNotificationHandler<FulfilmentCancellationHandler>(services);
        RegisterNotificationHandler<AbandonedCheckoutConversionHandler>(services);
        RegisterNotificationHandler<UcpOrderWebhookHandler>(services);
        RegisterNotificationHandler<UpsellEmailEnrichmentHandler>(services);
        RegisterNotificationHandler<UpsellConversionHandler>(services);
        RegisterNotificationHandler<AutoAddUpsellHandler>(services);
        RegisterNotificationHandler<AutoAddRemovalTracker>(services);
        RegisterNotificationHandler<PaymentPostPurchaseHandler>(services);

        // Mock IContentTypeService (Umbraco service used by ProductService for product type rendering)
        var mockContentTypeService = new Mock<IContentTypeService>();
        services.AddSingleton(mockContentTypeService.Object);

        // Mock IMediaService for digital product file lookups
        var mockMediaService = new Mock<IMediaService>();
        mockMediaService
            .Setup(m => m.GetById(It.IsAny<Guid>()))
            .Returns((Guid id) =>
            {
                var mediaMock = new Mock<Umbraco.Cms.Core.Models.IMedia>();
                mediaMock.SetupGet(m => m.Name).Returns($"Media-{id:N}");
                return mediaMock.Object;
            });
        services.AddSingleton(mockMediaService.Object);

        // Mock ApplicationPartManager (used by ProductService for view compilation checks)
        var applicationPartManager = new ApplicationPartManager();
        services.AddSingleton(applicationPartManager);

        // Mock IWebHostEnvironment (used by ProductService for environment info)
        var mockWebHostEnvironment = new Mock<IWebHostEnvironment>();
        mockWebHostEnvironment.Setup(e => e.EnvironmentName).Returns("Test");
        mockWebHostEnvironment.Setup(e => e.ApplicationName).Returns("Merchello.Tests");
        mockWebHostEnvironment.Setup(e => e.ContentRootPath).Returns(Directory.GetCurrentDirectory());
        mockWebHostEnvironment.Setup(e => e.WebRootPath).Returns(Directory.GetCurrentDirectory());
        mockWebHostEnvironment.Setup(e => e.ContentRootFileProvider).Returns(new NullFileProvider());
        mockWebHostEnvironment.Setup(e => e.WebRootFileProvider).Returns(new NullFileProvider());
        services.AddSingleton(mockWebHostEnvironment.Object);
        services.AddSingleton<IHostEnvironment>(sp => sp.GetRequiredService<IWebHostEnvironment>());

        services.AddSingleton<IShippingCostResolver, ShippingCostResolver>();
        services.AddScoped<IShippingOptionEligibilityService, ShippingOptionEligibilityService>();
        services.AddScoped<IShippingService, ShippingService>();
        services.AddScoped<IShipmentService, ShipmentService>();

        // Mock WarehouseProviderConfigService (returns empty configs for tests)
        var warehouseProviderConfigServiceMock = new Mock<IWarehouseProviderConfigService>();
        warehouseProviderConfigServiceMock
            .Setup(s => s.GetByWarehouseAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<WarehouseProviderConfig>());
        services.AddScoped<IWarehouseProviderConfigService>(_ => warehouseProviderConfigServiceMock.Object);
        services.AddScoped<ITaxService, TaxService>();

        // Tax calculation service (P1 tests)
        services.AddScoped<ITaxCalculationService, TaxCalculationService>();

        // Webhook settings
        var webhookSettings = new WebhookSettings
        {
            MaxRetries = 3,
            RetryDelaysSeconds = [60, 300, 900],
            DefaultTimeoutSeconds = 30
        };
        services.AddSingleton(Options.Create(webhookSettings));

        // Mock HTTP client factory for webhook delivery
        var httpClientFactoryMock = new Mock<IHttpClientFactory>();
        var mockHandler = new MockHttpMessageHandler();
        var httpClient = new HttpClient(mockHandler) { BaseAddress = new Uri("https://test.example.com") };
        httpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(httpClient);
        services.AddSingleton(httpClientFactoryMock.Object);
        services.AddSingleton(mockHandler); // Expose for test configuration

        // Webhook services (P4 tests)
        services.AddScoped<IWebhookTopicRegistry, WebhookTopicRegistry>();
        services.AddScoped<IWebhookDispatcher, WebhookDispatcher>();
        services.AddScoped<Core.Webhooks.Services.Interfaces.IWebhookService, Core.Webhooks.Services.WebhookService>();

        // Email settings
        var emailSettings = new EmailSettings
        {
            DefaultFromAddress = "test@example.com",
            MaxRetries = 3,
            RetryDelaysSeconds = [60, 300, 900]
        };
        services.AddSingleton(Options.Create(emailSettings));

        // Mock IEmailSender for email delivery (using non-obsolete overload with expires parameter)
        var emailSenderMock = new Mock<Umbraco.Cms.Core.Mail.IEmailSender>();
        emailSenderMock.Setup(x => x.SendAsync(
                It.IsAny<Umbraco.Cms.Core.Models.Email.EmailMessage>(),
                It.IsAny<string>(),
                It.IsAny<bool>(),
                It.IsAny<TimeSpan?>()))
            .Returns(Task.CompletedTask);
        services.AddSingleton(emailSenderMock.Object);

        // Email services (P5 tests)
        services.AddSingleton<IEmailTopicRegistry, EmailTopicRegistry>();
        services.AddSingleton<IEmailTemplateDiscoveryService, EmailTemplateDiscoveryService>();
        services.AddSingleton<IEmailAttachmentResolver, EmailAttachmentResolver>();
        services.AddSingleton<IEmailAttachmentStorageService, EmailAttachmentStorageService>();
        services.AddScoped<IEmailTokenResolver, EmailTokenResolver>();
        services.AddScoped<IEmailConfigurationService, EmailConfigurationService>();
        services.AddSingleton<IEmailTemplateRenderer, StubEmailTemplateRenderer>();
        services.AddSingleton<ISampleNotificationFactory, SampleNotificationFactory>();
        services.AddScoped<IEmailService, EmailService>();

        // Invoice/Checkout service dependencies (P2/P3 tests)

        // Additional factories
        services.AddSingleton<InvoiceFactory>();
        services.AddSingleton<OrderFactory>();
        services.AddSingleton<CustomerFactory>();
        services.AddSingleton<PaymentFactory>();
        services.AddSingleton<DiscountFactory>();
        services.AddSingleton<DownloadLinkFactory>();

        // Additional services
        services.AddScoped<ILineItemService, LineItemService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<IDiscountService, DiscountService>();
        services.AddScoped<IDiscountEngine, DiscountEngine>();
        services.AddScoped<IBuyXGetYCalculator, BuyXGetYCalculator>();
        services.AddScoped<IDigitalProductService, DigitalProductService>();
        services.AddScoped<IInvoiceEditService, InvoiceEditService>();

        // Upsells
        services.AddSingleton<UpsellFactory>();
        services.AddScoped<IUpsellService, UpsellService>();
        services.AddScoped<IUpsellRuleNameResolver, UpsellRuleNameResolver>();
        services.AddScoped<IUpsellEngine, UpsellEngine>();
        services.AddScoped<IUpsellContextBuilder, UpsellContextBuilder>();
        services.AddScoped<IPostPurchaseUpsellService, PostPurchaseUpsellService>();
        services.AddSingleton<IUpsellAnalyticsService, UpsellAnalyticsService>();

        // Mock rate limiter (always allows requests for tests)
        var rateLimiterMock = new Mock<IRateLimiter>();
        rateLimiterMock.Setup(x => x.TryAcquire(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<TimeSpan>()))
            .Returns(RateLimitResult.Allowed(1, 10));
        services.AddSingleton(rateLimiterMock.Object);

        // Mock tax provider manager (returns null to use default percentage-based tax)
        _taxProviderManagerMock = new Mock<ITaxProviderManager>();
        _taxProviderManagerMock
            .Setup(x => x.GetActiveProviderAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((RegisteredTaxProvider?)null);
        _taxProviderManagerMock
            .Setup(x => x.GetShippingTaxConfigurationAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ShippingTaxConfigurationResult.Proportional());
        services.AddSingleton(_taxProviderManagerMock.Object);
        services.AddScoped<ITaxOrchestrationService, TaxOrchestrationService>();

        // Mock shipping provider manager (returns null by default - providers not configured)
        var shippingProviderManagerMock = new Mock<IShippingProviderManager>();
        shippingProviderManagerMock
            .Setup(x => x.GetProviderAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((RegisteredShippingProvider?)null);
        services.AddSingleton(shippingProviderManagerMock.Object);

        // Mock payment provider manager with a manual provider that supports refunds
        _paymentProviderManagerMock = new Mock<IPaymentProviderManager>();
        SetupDefaultPaymentProviderManager();
        services.AddSingleton(_paymentProviderManagerMock.Object);

        // Mock payment idempotency service (returns null - no cached results)
        var paymentIdempotencyMock = new Mock<IPaymentIdempotencyService>();
        paymentIdempotencyMock
            .Setup(x => x.GetCachedPaymentResultAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PaymentResult?)null);
        paymentIdempotencyMock
            .Setup(x => x.TryMarkAsProcessingAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        paymentIdempotencyMock
            .Setup(x => x.GetCachedRefundResultAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((RefundResult?)null);
        paymentIdempotencyMock
            .Setup(x => x.CachePaymentResult(It.IsAny<string>(), It.IsAny<PaymentResult>()));
        paymentIdempotencyMock
            .Setup(x => x.CacheRefundResult(It.IsAny<string>(), It.IsAny<RefundResult>()));
        paymentIdempotencyMock
            .Setup(x => x.ClearProcessingMarker(It.IsAny<string>()));
        services.AddSingleton(paymentIdempotencyMock.Object);

        // Payment services
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IPaymentLinkService, PaymentLinkService>();
        services.AddSingleton<SavedPaymentMethodFactory>();
        services.AddScoped<ISavedPaymentMethodService, SavedPaymentMethodService>();

        // Invoice service (uses Lazy<ICheckoutService> to break circular dependency)
        services.AddScoped<IInvoiceService, InvoiceService>();

        // ============================================
        // CheckoutService Dependencies (Part B of Plan)
        // ============================================

        // Mock HTTP Context with session support for checkout tests
        _mockHttpContextAccessor = new MockHttpContextAccessor();
        services.AddSingleton<IHttpContextAccessor>(_mockHttpContextAccessor);

        // Checkout-specific factories
        services.AddSingleton<BasketFactory>();

        // CheckoutSessionService (uses IHttpContextAccessor)
        services.AddScoped<ICheckoutSessionService, CheckoutSessionService>();

        // AbandonedCheckoutService and settings
        var abandonedCheckoutSettings = new AbandonedCheckoutSettings
        {
            RecoveryUrlBase = "https://example.com/checkout/recover"
        };
        services.AddSingleton(Options.Create(abandonedCheckoutSettings));
        services.AddScoped<IAbandonedCheckoutService, AbandonedCheckoutService>();

        // Mock locality catalog (returns list of shippable countries)
        var localityCatalogMock = new Mock<ILocalityCatalog>();
        localityCatalogMock.Setup(x => x.GetCountriesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new CountryInfo("GB", "United Kingdom"),
                new CountryInfo("US", "United States"),
                new CountryInfo("DE", "Germany")
            ]);
        localityCatalogMock.Setup(x => x.GetRegionsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        services.AddSingleton(localityCatalogMock.Object);

        // Mock shipping quote service
        var shippingQuoteServiceMock = new Mock<IShippingQuoteService>();
        shippingQuoteServiceMock.Setup(x => x.GetQuotesAsync(
                It.IsAny<Basket>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<ShippingRateQuote>());
        services.AddSingleton(shippingQuoteServiceMock.Object);

        // Use the real shipping cost resolver for integration realism.

        // Mock locations service
        var locationsServiceMock = new Mock<ILocationsService>();
        locationsServiceMock.Setup(x => x.GetAvailableCountriesAsync(
                It.IsAny<GetAvailableCountriesParameters>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<CountryAvailability>());
        locationsServiceMock.Setup(x => x.GetAvailableRegionsAsync(
                It.IsAny<GetAvailableRegionsParameters>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<RegionAvailability>());
        services.AddSingleton(locationsServiceMock.Object);

        // Mock checkout member service
        var checkoutMemberServiceMock = new Mock<ICheckoutMemberService>();
        services.AddSingleton(checkoutMemberServiceMock.Object);

        // Mock storefront context service (provides location/currency context for checkout)
        var storefrontContextServiceMock = new Mock<IStorefrontContextService>();
        storefrontContextServiceMock.Setup(x => x.GetBasketAvailabilityAsync(
            It.IsAny<IReadOnlyList<LineItem>>(),
            It.IsAny<string?>(),
            It.IsAny<string?>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new BasketLocationAvailability(true, []));
        services.AddSingleton(storefrontContextServiceMock.Object);

        // Mock currency conversion service
        var currencyConversionServiceMock = new Mock<ICurrencyConversionService>();
        currencyConversionServiceMock.Setup(x => x.Convert(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<string>()))
            .Returns((decimal amount, decimal rate, string _) => amount * rate);
        currencyConversionServiceMock.Setup(x => x.Format(It.IsAny<decimal>(), It.IsAny<string>()))
            .Returns((decimal amount, string symbol) => $"{symbol}{amount:N2}");
        services.AddSingleton(currencyConversionServiceMock.Object);

        // Register CheckoutService
        // Important: This creates a proper Lazy<ICheckoutService> that resolves to the real service
        services.AddScoped<ICheckoutService, CheckoutService>();
        services.AddScoped(sp => new Lazy<ICheckoutService>(() => sp.GetRequiredService<ICheckoutService>()));
        services.AddScoped<ICheckoutDiscountService, CheckoutDiscountService>();
        services.AddScoped(sp => new Lazy<ICheckoutDiscountService>(() => sp.GetRequiredService<ICheckoutDiscountService>()));

        // ============================================
        // UCP Protocol Services (Protocol Integration Tests)
        // ============================================

        // Protocol settings
        var protocolSettings = new ProtocolSettings
        {
            WellKnownPath = "/.well-known",
            ManifestCacheDurationMinutes = 60,
            RequireHttps = false, // Allow HTTP in tests
            PublicBaseUrl = "https://test.example.com",
            Ucp = new UcpSettings
            {
                Version = "2026-01-23",
                RequireAuthentication = false,
                AllowedAgents = ["*"],
                SigningKeyRotationDays = 90,
                Capabilities = new UcpCapabilitySettings
                {
                    Checkout = true,
                    Order = true,
                    IdentityLinking = false
                },
                Extensions = new UcpExtensionSettings
                {
                    Discount = true,
                    Fulfillment = true,
                    BuyerConsent = false,
                    Ap2Mandates = false
                }
            }
        };
        services.AddSingleton(Options.Create(protocolSettings));

        // Mock ICacheService (simple pass-through for tests)
        _cacheServiceMock = new Mock<ICacheService>();
        _cacheServiceMock
            .Setup(x => x.GetOrCreateAsync(
                It.IsAny<string>(),
                It.IsAny<Func<CancellationToken, Task<object?>>>(),
                It.IsAny<TimeSpan?>(),
                It.IsAny<IEnumerable<string>?>(),
                It.IsAny<CancellationToken>()))
            .Returns((string _, Func<CancellationToken, Task<object?>> factory, TimeSpan? _, IEnumerable<string>? _, CancellationToken ct) => factory(ct));
        _cacheServiceMock
            .Setup(x => x.GetOrCreateAsync(
                It.IsAny<string>(),
                It.IsAny<Func<CancellationToken, Task<decimal>>>(),
                It.IsAny<TimeSpan?>(),
                It.IsAny<IEnumerable<string>?>(),
                It.IsAny<CancellationToken>()))
            .Returns((string _, Func<CancellationToken, Task<decimal>> factory, TimeSpan? _, IEnumerable<string>? _, CancellationToken ct) => factory(ct));
        _cacheServiceMock
            .Setup(x => x.RemoveByTagAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        services.AddSingleton(_cacheServiceMock.Object);

        // Protocol infrastructure
        services.AddScoped<ISigningKeyStore, SigningKeyStore>();
        services.AddScoped<IWebhookSigner, WebhookSigner>();
        services.AddScoped<IPaymentHandlerExporter, PaymentHandlerExporter>();
        services.AddScoped<Merchello.Core.Protocols.Authentication.Interfaces.IAgentAuthenticator, Merchello.Core.Protocols.Authentication.UcpAgentAuthenticator>();

        // ExtensionManager for protocol adapter discovery
        services.AddSingleton<ExtensionManager>();

        // UCP Agent Profile Service (required by UCPProtocolAdapter)
        services.AddScoped<IUcpAgentProfileService, UcpAgentProfileService>();

        // Register UCPProtocolAdapter directly (ExtensionManager will discover it)
        services.AddScoped<ICommerceProtocolAdapter, UCPProtocolAdapter>();
        services.AddScoped<ICommerceProtocolManager, CommerceProtocolManager>();

        // ============================================
        // Fulfilment Services (Fulfilment Integration Tests)
        // ============================================

        // Fulfilment settings
        var fulfilmentSettings = new FulfilmentSettings
        {
            PollingIntervalMinutes = 15,
            MaxRetryAttempts = 5,
            RetryDelaysMinutes = [5, 15, 30, 60, 120],
            InventorySyncIntervalMinutes = 60,
            ProductSyncOnSave = false,
            SyncLogRetentionDays = 30,
            WebhookLogRetentionDays = 7
        };
        services.AddSingleton(Options.Create(fulfilmentSettings));

        // Mock fulfilment provider manager
        var fulfilmentProviderManagerMock = new Mock<IFulfilmentProviderManager>();
        fulfilmentProviderManagerMock
            .Setup(x => x.GetProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<RegisteredFulfilmentProvider>());
        fulfilmentProviderManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<RegisteredFulfilmentProvider>());
        _fulfilmentProviderManagerMock = fulfilmentProviderManagerMock;
        services.AddSingleton(fulfilmentProviderManagerMock.Object);

        // Fulfilment services (using DbContext directly for tests)
        services.AddScoped<IFulfilmentService, Merchello.Core.Fulfilment.Services.FulfilmentService>();
        services.AddScoped<IFulfilmentSubmissionService, Merchello.Core.Fulfilment.Services.FulfilmentSubmissionService>();
        services.AddScoped<IFulfilmentSyncService, Merchello.Core.Fulfilment.Services.FulfilmentSyncService>();

        _serviceProvider = services.BuildServiceProvider();
    }

    private static void RegisterNotificationHandler<THandler>(IServiceCollection services)
        where THandler : class
    {
        services.AddScoped<THandler>();

        var handlerInterfaces = typeof(THandler).GetInterfaces()
            .Where(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(INotificationAsyncHandler<>));

        foreach (var handlerInterface in handlerInterfaces)
        {
            services.AddScoped(handlerInterface, sp => sp.GetRequiredService<THandler>());
        }
    }

    /// <summary>
    /// Sets up the payment provider manager mock with a default manual provider that supports refunds.
    /// Called during construction and from ResetMocks().
    /// </summary>
    private void SetupDefaultPaymentProviderManager()
    {
        var mockPaymentProvider = new Mock<IPaymentProvider>();
        mockPaymentProvider.Setup(p => p.Metadata).Returns(new PaymentProviderMetadata
        {
            Alias = "manual",
            DisplayName = "Manual Payment",
            SupportsRefunds = true,
            SupportsPartialRefunds = true
        });
        mockPaymentProvider
            .Setup(p => p.RefundPaymentAsync(It.IsAny<RefundRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((RefundRequest req, CancellationToken _) => RefundResult.Successful(
                $"manual_refund_{Guid.NewGuid():N}", req.Amount ?? 0m));
        var registeredManualProvider = new RegisteredPaymentProvider(mockPaymentProvider.Object, null);

        var stripeProviderMock = new Mock<IPaymentProvider>();
        stripeProviderMock.Setup(p => p.Metadata).Returns(new PaymentProviderMetadata
        {
            Alias = "stripe",
            DisplayName = "Stripe",
            SupportsVaultedPayments = true
        });
        var stripeSetting = new PaymentProviderSetting
        {
            ProviderAlias = "stripe",
            DisplayName = "Stripe",
            IsEnabled = true,
            IsVaultingEnabled = true
        };
        var registeredStripeProvider = new RegisteredPaymentProvider(stripeProviderMock.Object, stripeSetting);

        _paymentProviderManagerMock
            .Setup(x => x.GetProviderAsync("manual", It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(registeredManualProvider);
        _paymentProviderManagerMock
            .Setup(x => x.GetProviderAsync("stripe", It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(registeredStripeProvider);
        _paymentProviderManagerMock
            .Setup(x => x.GetAvailableProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([registeredManualProvider, registeredStripeProvider]);
        _paymentProviderManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([registeredManualProvider, registeredStripeProvider]);
        _paymentProviderManagerMock
            .Setup(x => x.GetCheckoutPaymentMethodsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<PaymentMethodDto>());
        _paymentProviderManagerMock
            .Setup(x => x.GetExpressCheckoutMethodsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<PaymentMethodDto>());
        _paymentProviderManagerMock
            .Setup(x => x.GetStandardPaymentMethodsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<PaymentMethodDto>());
    }

    /// <summary>
    /// Creates a mock IEFCoreScopeProvider that forwards ExecuteWithContextAsync calls to the real DbContext.
    /// Handles both overloads:
    /// 1. Task ExecuteWithContextAsync[T](Func[DbContext, Task]) - void returning (T is marker like Task)
    /// 2. Task[T] ExecuteWithContextAsync[T](Func[DbContext, Task[T]]) - value returning
    /// </summary>
    private static IEFCoreScopeProvider<MerchelloDbContext> CreateMockScopeProvider(Func<MerchelloDbContext> dbContextFactory)
    {
        var scopeProviderMock = new Mock<IEFCoreScopeProvider<MerchelloDbContext>>();
        scopeProviderMock
            .Setup(p => p.CreateScope(It.IsAny<RepositoryCacheMode>(), It.IsAny<bool?>()))
            .Returns(() =>
            {
                var dbContext = dbContextFactory();
                var scopeMock = new Mock<IEfCoreScope<MerchelloDbContext>>();

                // Setup value-returning overloads for common return types
                // NOTE: Intentionally NOT setting up ExecuteWithContextAsync<Task> - that pattern
                // doesn't properly await SaveChangesAsync and can cause data loss. All production
                // code should use ExecuteWithContextAsync<bool> with return true; instead.
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<int>>>()))
                    .Returns((Func<MerchelloDbContext, Task<int>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<bool>>>()))
                    .Returns((Func<MerchelloDbContext, Task<bool>> func) => func(dbContext));

                // Product and warehouse related types
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Product?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Product?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Warehouse?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Warehouse?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<Warehouse>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<Warehouse>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<ProductStockLevel>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<ProductStockLevel>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<WarehouseInventoryItem>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<WarehouseInventoryItem>>> func) => func(dbContext));

                // Product service return types
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<ProductRoot?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<ProductRoot?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<Product>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<Product>>> func) => func(dbContext));

                // Product feed return types
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<ProductFeed?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<ProductFeed?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<ProductFeed>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<ProductFeed>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<ProductRootDetailDto?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<ProductRootDetailDto?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<ProductVariantDto?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<ProductVariantDto?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<AddonPricePreviewDto?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<AddonPricePreviewDto?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<ProductOption?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<ProductOption?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<ProductType?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<ProductType?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<ProductCollection?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<ProductCollection?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<ProductType>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<ProductType>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<ProductCollection>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<ProductCollection>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<ProductCollectionDto>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<ProductCollectionDto>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<ProductFilterGroup>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<ProductFilterGroup>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<ProductFilterGroup?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<ProductFilterGroup?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<ProductFilter?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<ProductFilter?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<ProductFilter>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<ProductFilter>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Supplier?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Supplier?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<Supplier>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<Supplier>>> func) => func(dbContext));

                // Paginated list types for query methods
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<PaginatedList<ProductRoot>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<PaginatedList<ProductRoot>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<PaginatedList<Product>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<PaginatedList<Product>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<PaginatedList<ProductListItemDto>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<PaginatedList<ProductListItemDto>>> func) => func(dbContext));

                // Shipping service return types
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<ShippingOption>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<ShippingOption>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Dictionary<Guid, ShippingOption>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Dictionary<Guid, ShippingOption>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<ProductShippingOptionsResultDto>>>()))
                    .Returns((Func<MerchelloDbContext, Task<ProductShippingOptionsResultDto>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<WarehouseShippingOptionsResultDto>>>()))
                    .Returns((Func<MerchelloDbContext, Task<WarehouseShippingOptionsResultDto>> func) => func(dbContext));

                // ShippingOption service return types (for ShippingOptionServiceTests)
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<ShippingOption?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<ShippingOption?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<ShippingOptionListItemDto>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<ShippingOptionListItemDto>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<string>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<string>>> func) => func(dbContext));

                // WarehouseProviderConfig service return types (for WarehouseProviderConfigServiceTests)
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<WarehouseProviderConfig?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<WarehouseProviderConfig?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<WarehouseProviderConfig>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<WarehouseProviderConfig>>> func) => func(dbContext));

                // Tuple return type for shipping basket query
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<(Dictionary<Guid, Product>, Dictionary<Guid, Warehouse>)>>>()))
                    .Returns((Func<MerchelloDbContext, Task<(Dictionary<Guid, Product>, Dictionary<Guid, Warehouse>)>> func) => func(dbContext));

                // Customer segment return types
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<CustomerSegment?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<CustomerSegment?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<CustomerSegment>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<CustomerSegment>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<CustomerSegmentMember?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<CustomerSegmentMember?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<CustomerSegmentMember>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<CustomerSegmentMember>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<PaginatedList<CustomerSegmentMember>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<PaginatedList<CustomerSegmentMember>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<CustomerMetrics>>>()))
                    .Returns((Func<MerchelloDbContext, Task<CustomerMetrics>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<Guid>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<Guid>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<PaginatedList<Guid>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<PaginatedList<Guid>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Customer?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Customer?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<Customer>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<Customer>>> func) => func(dbContext));

                // Reporting service return types
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Core.Reporting.Dtos.SalesBreakdownDto>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Core.Reporting.Dtos.SalesBreakdownDto>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Core.Reporting.Dtos.AnalyticsSummaryDto>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Core.Reporting.Dtos.AnalyticsSummaryDto>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<Core.Reporting.Dtos.TimeSeriesDataPointDto>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<Core.Reporting.Dtos.TimeSeriesDataPointDto>>> func) => func(dbContext));

                // Webhook service return types
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<WebhookSubscription?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<WebhookSubscription?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<WebhookSubscription>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<WebhookSubscription>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<OutboundDelivery?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<OutboundDelivery?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<OutboundDelivery>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<OutboundDelivery>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<PaginatedList<OutboundDelivery>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<PaginatedList<OutboundDelivery>>> func) => func(dbContext));

                // Email service return types
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Core.Email.Models.EmailConfiguration?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Core.Email.Models.EmailConfiguration?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<Core.Email.Models.EmailConfiguration>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<Core.Email.Models.EmailConfiguration>>> func) => func(dbContext));

                // Invoice service return types
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Invoice?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Invoice?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<Invoice>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<Invoice>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<PaginatedList<Invoice>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<PaginatedList<Invoice>>> func) => func(dbContext));

                // Invoice edit service return types
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<InvoiceForEditDto?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<InvoiceForEditDto?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<PreviewEditResultDto?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<PreviewEditResultDto?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<PreviewDiscountResultDto>>>()))
                    .Returns((Func<MerchelloDbContext, Task<PreviewDiscountResultDto>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Merchello.Core.Shared.OperationResult<EditInvoiceResultDto>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Merchello.Core.Shared.OperationResult<EditInvoiceResultDto>>> func) => func(dbContext));

                // Order return types
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Order?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Order?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<Order>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<Order>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<PaginatedList<Order>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<PaginatedList<Order>>> func) => func(dbContext));

                // Invoice creation tuple return type (for CreateOrderFromBasketAsync)
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<(Invoice? Invoice, List<Order> Orders)>>>()))
                    .Returns((Func<MerchelloDbContext, Task<(Invoice?, List<Order>)>> func) => func(dbContext));

                // Payment return types
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Payment?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Payment?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<Payment>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<Payment>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<(decimal InvoiceTotal, string CurrencyCode, List<Payment> Payments)>>>()))
                    .Returns((Func<MerchelloDbContext, Task<(decimal, string, List<Payment>)>> func) => func(dbContext));

                // Saved payment method return types
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<SavedPaymentMethod?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<SavedPaymentMethod?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<SavedPaymentMethod>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<SavedPaymentMethod>>> func) => func(dbContext));

                // Discount return types
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Discount?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Discount?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<Discount>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<Discount>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<PaginatedList<Discount>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<PaginatedList<Discount>>> func) => func(dbContext));

                // Upsell return types
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<UpsellRule?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<UpsellRule?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<UpsellRule>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<UpsellRule>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<PaginatedList<UpsellRule>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<PaginatedList<UpsellRule>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<UpsellPerformanceDto?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<UpsellPerformanceDto?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<UpsellSummaryDto>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<UpsellSummaryDto>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<UpsellDashboardDto>>>()))
                    .Returns((Func<MerchelloDbContext, Task<UpsellDashboardDto>> func) => func(dbContext));

                // Download link return types
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<DownloadLink?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<DownloadLink?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<DownloadLink>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<DownloadLink>>> func) => func(dbContext));

                // Shipment return types
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Shipment?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Shipment?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<Shipment>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<Shipment>>> func) => func(dbContext));

                // ShippingTaxOverride return types (for TaxService shipping tax tests)
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<ShippingTaxOverride?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<ShippingTaxOverride?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<ShippingTaxOverride>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<ShippingTaxOverride>>> func) => func(dbContext));

                // TaxProviderSetting return types (for real TaxProviderManager integration tests)
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<Merchello.Core.Tax.Models.TaxProviderSetting>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<Merchello.Core.Tax.Models.TaxProviderSetting>>> func) => func(dbContext));

                // ProductWarehouse return types (for FulfilmentSyncService inventory sync)
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<ProductWarehouse?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<ProductWarehouse?>> func) => func(dbContext));

                // Customer lookup DTO for CustomerService.SearchCustomersAsync
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<CustomerLookupResultDto>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<CustomerLookupResultDto>>> func) => func(dbContext));

                // Abandoned checkout service return types
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Basket?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Basket?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<AbandonedCheckout?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<AbandonedCheckout?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<AbandonedCheckout>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<AbandonedCheckout>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<PaginatedList<AbandonedCheckout>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<PaginatedList<AbandonedCheckout>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<string?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<string?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Core.Checkout.Dtos.AbandonedCheckoutStatsDto>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Core.Checkout.Dtos.AbandonedCheckoutStatsDto>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Core.Checkout.Dtos.AbandonedCheckoutPageDto>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Core.Checkout.Dtos.AbandonedCheckoutPageDto>> func) => func(dbContext));

                // GetUnpaidInvoiceForBasketAsync return type (tuple of Invoice and Basket)
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<(Invoice? Invoice, Basket? Basket)>>>()))
                    .Returns((Func<MerchelloDbContext, Task<(Invoice? Invoice, Basket? Basket)>> func) => func(dbContext));

                // Fulfilment service return types
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Core.Fulfilment.Models.FulfilmentProviderConfiguration?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Core.Fulfilment.Models.FulfilmentProviderConfiguration?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<Core.Fulfilment.Models.FulfilmentProviderConfiguration>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<Core.Fulfilment.Models.FulfilmentProviderConfiguration>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Core.Fulfilment.Models.FulfilmentSyncLog?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Core.Fulfilment.Models.FulfilmentSyncLog?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<Core.Fulfilment.Models.FulfilmentSyncLog>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<Core.Fulfilment.Models.FulfilmentSyncLog>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<PaginatedList<Core.Fulfilment.Models.FulfilmentSyncLog>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<PaginatedList<Core.Fulfilment.Models.FulfilmentSyncLog>>> func) => func(dbContext));

                // SigningKey service return types (for protocol tests)
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Core.Protocols.Webhooks.Models.SigningKey?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Core.Protocols.Webhooks.Models.SigningKey?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<Core.Protocols.Webhooks.Models.SigningKey>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<Core.Protocols.Webhooks.Models.SigningKey>>> func) => func(dbContext));

                scopeMock.Setup(s => s.Complete()).Returns(true);
                scopeMock.Setup(s => s.Dispose()).Callback(dbContext.Dispose);

                return scopeMock.Object;
            });

        return scopeProviderMock.Object;
    }

    /// <summary>
    /// Resets the database to a clean state for test isolation.
    /// Clears the ChangeTracker to prevent stale entity references after database reset.
    /// </summary>
    public void ResetDatabase()
    {
        DbContext.Dispose();

        using var resetContext = CreateDbContext();
        resetContext.Database.OpenConnection();
        try
        {
            resetContext.Database.ExecuteSqlRaw("PRAGMA foreign_keys = OFF;");
            try
            {
                foreach (var table in _tableNames)
                {
#pragma warning disable EF1002 // Table names come from EF metadata, not user input
                    resetContext.Database.ExecuteSqlRaw($"""DELETE FROM "{table}";""");
#pragma warning restore EF1002
                }
            }
            finally
            {
                resetContext.Database.ExecuteSqlRaw("PRAGMA foreign_keys = ON;");
            }
        }
        finally
        {
            resetContext.Database.CloseConnection();
        }

        DbContext = CreateDbContext();
    }

    /// <summary>
    /// Creates a new TestDataBuilder for the current DbContext
    /// </summary>
    public TestDataBuilder CreateDataBuilder() => new(DbContext, GetService<ICurrencyService>());

    /// <summary>
    /// Gets a service from the DI container
    /// </summary>
    public T GetService<T>() where T : notnull => _serviceProvider.GetRequiredService<T>();

    /// <summary>
    /// Creates a new scope for test operations
    /// </summary>
    public IServiceScope CreateScope() => _serviceProvider.CreateScope();

    /// <summary>
    /// Configure the exchange rate for a specific currency pair.
    /// Rate direction is presentment → store (e.g., GBP→USD means 1 GBP = rate USD).
    /// Call this before creating invoices in multi-currency tests.
    /// </summary>
    /// <param name="fromCurrency">Presentment currency code (customer's currency)</param>
    /// <param name="toCurrency">Store currency code</param>
    /// <param name="rate">Exchange rate (1 fromCurrency = rate toCurrency)</param>
    public void SetExchangeRate(string fromCurrency, string toCurrency, decimal rate)
    {
        _exchangeRateCacheMock
            .Setup(x => x.GetRateQuoteAsync(fromCurrency, toCurrency, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ExchangeRateQuote(rate, DateTime.UtcNow, "test-mock"));

        _exchangeRateCacheMock
            .Setup(x => x.GetRateAsync(fromCurrency, toCurrency, It.IsAny<CancellationToken>()))
            .ReturnsAsync(rate);
    }

    /// <summary>
    /// Creates a new DbContext instance that points at the shared test database.
    /// Useful for concurrent test threads where a unique context is required.
    /// </summary>
    public MerchelloDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<MerchelloDbContext>()
            .UseSqlite(_connectionString)
            .Options;

        return new MerchelloDbContext(options);
    }

    /// <summary>
    /// Resets all configurable mocks to their default state.
    /// Call this in test constructors or IAsyncLifetime.InitializeAsync for isolation.
    /// </summary>
    public void ResetMocks()
    {
        // Reset exchange rate cache to default 1:1 rates
        _exchangeRateCacheMock.Reset();
        _exchangeRateCacheMock
            .Setup(x => x.GetRateQuoteAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ExchangeRateQuote(1m, DateTime.UtcNow, "mock"));
        _exchangeRateCacheMock
            .Setup(x => x.GetRateAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(1m);

        // Reset fulfilment provider manager to empty providers
        _fulfilmentProviderManagerMock.Reset();
        _fulfilmentProviderManagerMock
            .Setup(x => x.GetProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<RegisteredFulfilmentProvider>());
        _fulfilmentProviderManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<RegisteredFulfilmentProvider>());

        // Reset payment provider manager to default manual provider
        _paymentProviderManagerMock.Reset();
        SetupDefaultPaymentProviderManager();

        // Reset tax provider manager to default centralized/manual behavior.
        _taxProviderManagerMock.Reset();
        _taxProviderManagerMock
            .Setup(x => x.GetActiveProviderAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((RegisteredTaxProvider?)null);
        _taxProviderManagerMock
            .Setup(x => x.GetShippingTaxConfigurationAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ShippingTaxConfigurationResult.Proportional());

        _cacheServiceMock.Reset();
        _cacheServiceMock
            .Setup(x => x.GetOrCreateAsync(
                It.IsAny<string>(),
                It.IsAny<Func<CancellationToken, Task<object?>>>(),
                It.IsAny<TimeSpan?>(),
                It.IsAny<IEnumerable<string>?>(),
                It.IsAny<CancellationToken>()))
            .Returns((string _, Func<CancellationToken, Task<object?>> factory, TimeSpan? _, IEnumerable<string>? _, CancellationToken ct) => factory(ct));
        _cacheServiceMock
            .Setup(x => x.GetOrCreateAsync(
                It.IsAny<string>(),
                It.IsAny<Func<CancellationToken, Task<decimal>>>(),
                It.IsAny<TimeSpan?>(),
                It.IsAny<IEnumerable<string>?>(),
                It.IsAny<CancellationToken>()))
            .Returns((string _, Func<CancellationToken, Task<decimal>> factory, TimeSpan? _, IEnumerable<string>? _, CancellationToken ct) => factory(ct));
        _cacheServiceMock
            .Setup(x => x.RemoveByTagAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Reset HTTP message handler (clear accumulated requests)
        var mockHandler = _serviceProvider.GetService<MockHttpMessageHandler>();
        mockHandler?.Reset();

        // Clear session state
        _mockHttpContextAccessor.ClearSession();
    }

    public void Dispose()
    {
        DbContext?.Dispose();
        _serviceProvider?.Dispose();

        _keepAliveConnection?.Dispose();

        // Clean up the temp database file
        try
        {
            if (File.Exists(_databaseFilePath))
            {
                File.Delete(_databaseFilePath);
            }
        }
        catch
        {
            // Best effort cleanup - file may be locked
        }

        GC.SuppressFinalize(this);
    }
}
