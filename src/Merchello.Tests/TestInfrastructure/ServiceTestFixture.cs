using System.IO;
using System.Linq;
using System.Net;
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
using Merchello.Core.Protocols.Webhooks;
using Merchello.Core.Protocols.UCP;
using Merchello.Core.Shared.Reflection;
using Merchello.Core.Checkout;
using Merchello.Core.Checkout.Factories;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Strategies;
using Merchello.Core.Checkout.Strategies.Interfaces;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Providers.Interfaces;
using Merchello.Core.Customers.Factories;
using Merchello.Core.Customers.Models;
using Merchello.Core.Customers.Services;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.Email;
using Merchello.Core.Email.Models;
using Merchello.Core.Email.Services;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.ExchangeRates.Models;
using Merchello.Core.ExchangeRates.Services;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Products.Dtos;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;
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
using Merchello.Core.Tax.Services;
using Merchello.Core.Tax.Services.Interfaces;
using Merchello.Core.Tax.Providers;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Core.Discounts.Factories;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services;
using Merchello.Core.Discounts.Services.Interfaces;
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
using Merchello.Core.Locality.Models;
using Merchello.Core.Locality.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Merchello.Core.Webhooks.Models;
using Merchello.Core.Webhooks.Services;
using Merchello.Core.Webhooks.Services.Interfaces;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Scoping;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Tests.TestInfrastructure;

/// <summary>
/// Mock HTTP message handler for testing webhook delivery.
/// Allows tests to configure expected responses.
/// </summary>
public class MockHttpMessageHandler : HttpMessageHandler
{
    public HttpStatusCode ResponseStatusCode { get; set; } = HttpStatusCode.OK;
    public string ResponseContent { get; set; } = "{}";
    public Exception? ExceptionToThrow { get; set; }
    public List<HttpRequestMessage> ReceivedRequests { get; } = [];

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        ReceivedRequests.Add(request);

        if (ExceptionToThrow != null)
        {
            throw ExceptionToThrow;
        }

        var response = new HttpResponseMessage(ResponseStatusCode)
        {
            Content = new StringContent(ResponseContent)
        };
        return Task.FromResult(response);
    }

    public void Reset()
    {
        ResponseStatusCode = HttpStatusCode.OK;
        ResponseContent = "{}";
        ExceptionToThrow = null;
        ReceivedRequests.Clear();
    }
}

/// <summary>
/// Mock HTTP context accessor for testing checkout flows that require session storage.
/// Provides an in-memory session implementation for test isolation.
/// </summary>
public class MockHttpContextAccessor : IHttpContextAccessor
{
    private readonly DefaultHttpContext _httpContext;
    private readonly MockSession _session;

    public MockHttpContextAccessor()
    {
        _session = new MockSession();
        _httpContext = new DefaultHttpContext();
        _httpContext.Features.Set<ISessionFeature>(new MockSessionFeature(_session));
    }

    public HttpContext? HttpContext
    {
        get => _httpContext;
        set { }
    }

    /// <summary>
    /// Clears all session data. Call this in test setup for isolation.
    /// </summary>
    public void ClearSession() => _session.Clear();

    /// <summary>
    /// Gets the mock session for direct access in tests.
    /// </summary>
    public ISession Session => _session;

    private class MockSessionFeature : ISessionFeature
    {
        public MockSessionFeature(ISession session) => Session = session;
        public ISession Session { get; set; }
    }

    private class MockSession : ISession
    {
        private readonly Dictionary<string, byte[]> _store = new(StringComparer.OrdinalIgnoreCase);

        public bool IsAvailable => true;
        public string Id { get; } = Guid.NewGuid().ToString();
        public IEnumerable<string> Keys => _store.Keys;

        public void Clear() => _store.Clear();

        public Task CommitAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task LoadAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;

        public void Remove(string key) => _store.Remove(key);

        public void Set(string key, byte[] value) => _store[key] = value;

        public bool TryGetValue(string key, [System.Diagnostics.CodeAnalysis.NotNullWhen(true)] out byte[]? value) => _store.TryGetValue(key, out value);
    }
}

/// <summary>
/// Shared test fixture providing DI container and in-memory database for integration tests.
/// Uses SQLite in-memory mode for fast, isolated test execution.
/// Uses Moq to create scope provider that forwards calls to real DbContext.
/// </summary>
public class ServiceTestFixture : IDisposable
{
    private readonly string _databaseFilePath;
    private readonly string _connectionString;

    // Keep a master connection open so the shared database persists while tests run
    private SqliteConnection _keepAliveConnection;
    private readonly ServiceProvider _serviceProvider;
    private MockHttpContextAccessor _mockHttpContextAccessor = null!;

    // Track all connections created by CreateDbContext for proper disposal
    private readonly List<SqliteConnection> _trackedConnections = [];
    private readonly object _connectionLock = new();

    // Configurable exchange rate cache mock for multi-currency testing
    private Mock<IExchangeRateCache> _exchangeRateCacheMock = null!;

    public MerchelloDbContext DbContext { get; private set; } = null!;
    public IServiceProvider ServiceProvider => _serviceProvider;

    /// <summary>
    /// Gets the mock HTTP context accessor for test configuration.
    /// Use this to set up session data before tests that require HTTP context.
    /// </summary>
    public MockHttpContextAccessor MockHttpContext => _mockHttpContextAccessor;

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

        // DbContext with SQLite
        services.AddDbContext<MerchelloDbContext>(options =>
            options.UseSqlite(_connectionString));
        services.AddDbContextFactory<MerchelloDbContext>(options =>
            options.UseSqlite(_connectionString));

        // Ensure the schema exists on the shared in-memory database
        using (var setupContext = CreateDbContext())
        {
            setupContext.Database.EnsureCreated();
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
        services.AddSingleton<LineItemFactory>();
        services.AddSingleton<CustomerSegmentFactory>();

        // Utilities
        services.AddSingleton<SlugHelper>();

        // Settings
        var merchelloSettings = new MerchelloSettings
        {
            StoreCurrencyCode = "USD",
            DefaultShippingCountry = "US",
            DefaultRounding = MidpointRounding.AwayFromZero
        };
        services.AddSingleton(Options.Create(merchelloSettings));

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

        // Mock the notification publisher to not cancel notifications
        var mockNotificationPublisher = new Mock<IMerchelloNotificationPublisher>();
        mockNotificationPublisher
            .Setup(p => p.PublishCancelableAsync(It.IsAny<ICancelableNotification>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        mockNotificationPublisher
            .Setup(p => p.PublishAsync(It.IsAny<INotification>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        services.AddSingleton(mockNotificationPublisher.Object);

        // Mock IContentTypeService (Umbraco service used by ProductService for product type rendering)
        var mockContentTypeService = new Mock<IContentTypeService>();
        services.AddSingleton(mockContentTypeService.Object);

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

        services.AddSingleton<IShippingCostResolver, ShippingCostResolver>();
        services.AddScoped<IShippingService, ShippingService>();
        services.AddScoped<ITaxService, TaxService>();

        // Tax calculation service (P1 tests)
        services.AddScoped<ITaxCalculationService, TaxCalculationService>();

        // Webhook settings
        var webhookSettings = new WebhookSettings
        {
            Enabled = true,
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
            Enabled = true,
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
        services.AddScoped<IEmailTokenResolver, EmailTokenResolver>();
        services.AddScoped<IEmailConfigurationService, EmailConfigurationService>();
        services.AddScoped<IEmailService, EmailService>();

        // Invoice/Checkout service dependencies (P2/P3 tests)

        // Additional factories
        services.AddSingleton<InvoiceFactory>();
        services.AddSingleton<OrderFactory>();
        services.AddSingleton<CustomerFactory>();
        services.AddSingleton<PaymentFactory>();
        services.AddSingleton<DiscountFactory>();

        // Additional services
        services.AddScoped<ILineItemService, LineItemService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<IDiscountService, DiscountService>();

        // Mock rate limiter (always allows requests for tests)
        var rateLimiterMock = new Mock<IRateLimiter>();
        rateLimiterMock.Setup(x => x.TryAcquire(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<TimeSpan>()))
            .Returns(RateLimitResult.Allowed(1, 10));
        services.AddSingleton(rateLimiterMock.Object);

        // Mock tax provider manager (returns null to use default percentage-based tax)
        var taxProviderManagerMock = new Mock<ITaxProviderManager>();
        taxProviderManagerMock
            .Setup(x => x.GetActiveProviderAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((RegisteredTaxProvider?)null);
        services.AddSingleton(taxProviderManagerMock.Object);

        // Mock shipping provider manager (returns null by default - providers not configured)
        var shippingProviderManagerMock = new Mock<IShippingProviderManager>();
        shippingProviderManagerMock
            .Setup(x => x.GetProviderAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((RegisteredShippingProvider?)null);
        services.AddSingleton(shippingProviderManagerMock.Object);

        // Mock payment provider manager (returns empty list - no payment providers configured)
        var paymentProviderManagerMock = new Mock<IPaymentProviderManager>();
        paymentProviderManagerMock
            .Setup(x => x.GetAvailableProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<RegisteredPaymentProvider>());
        paymentProviderManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<RegisteredPaymentProvider>());
        services.AddSingleton(paymentProviderManagerMock.Object);

        // Mock payment idempotency service (returns null - no cached results)
        var paymentIdempotencyMock = new Mock<IPaymentIdempotencyService>();
        paymentIdempotencyMock
            .Setup(x => x.GetCachedPaymentResultAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PaymentResult?)null);
        services.AddSingleton(paymentIdempotencyMock.Object);

        // Payment service
        services.AddScoped<IPaymentService, PaymentService>();

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
            Enabled = true,
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

        // Mock shipping cost resolver (synchronous methods)
        var shippingCostResolverMock = new Mock<IShippingCostResolver>();
        shippingCostResolverMock.Setup(x => x.ResolveBaseCost(
                It.IsAny<IReadOnlyCollection<ShippingCost>>(), It.IsAny<string>(),
                It.IsAny<string?>(), It.IsAny<decimal?>()))
            .Returns(5m);
        shippingCostResolverMock.Setup(x => x.ResolveWeightTierSurcharge(
                It.IsAny<IReadOnlyCollection<ShippingWeightTier>>(), It.IsAny<decimal>(),
                It.IsAny<string>(), It.IsAny<string?>()))
            .Returns(0m);
        shippingCostResolverMock.Setup(x => x.GetTotalShippingCost(
                It.IsAny<ShippingOption>(), It.IsAny<string>(),
                It.IsAny<string?>(), It.IsAny<decimal?>()))
            .Returns(5m);
        services.AddSingleton(shippingCostResolverMock.Object);

        // Mock locations service
        var locationsServiceMock = new Mock<ILocationsService>();
        locationsServiceMock.Setup(x => x.GetAvailableCountriesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<CountryAvailability>());
        locationsServiceMock.Setup(x => x.GetAvailableRegionsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
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

        // ============================================
        // UCP Protocol Services (Protocol Integration Tests)
        // ============================================

        // Protocol settings
        var protocolSettings = new ProtocolSettings
        {
            Enabled = true,
            WellKnownPath = "/.well-known",
            ManifestCacheDurationMinutes = 60,
            RequireHttps = false, // Allow HTTP in tests
            Ucp = new UcpSettings
            {
                Enabled = true,
                Version = "2026-01-11",
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
        var cacheServiceMock = new Mock<ICacheService>();
        cacheServiceMock
            .Setup(x => x.GetOrCreateAsync(
                It.IsAny<string>(),
                It.IsAny<Func<CancellationToken, Task<object?>>>(),
                It.IsAny<TimeSpan?>(),
                It.IsAny<IEnumerable<string>?>(),
                It.IsAny<CancellationToken>()))
            .Returns((string _, Func<CancellationToken, Task<object?>> factory, TimeSpan? _, IEnumerable<string>? _, CancellationToken ct) => factory(ct));
        services.AddSingleton(cacheServiceMock.Object);

        // Protocol infrastructure
        services.AddScoped<ISigningKeyStore, SigningKeyStore>();
        services.AddScoped<IWebhookSigner, WebhookSigner>();
        services.AddScoped<IPaymentHandlerExporter, PaymentHandlerExporter>();

        // ExtensionManager for protocol adapter discovery
        services.AddScoped<ExtensionManager>();

        // Register UCPProtocolAdapter directly (ExtensionManager will discover it)
        services.AddScoped<ICommerceProtocolAdapter, UCPProtocolAdapter>();
        services.AddScoped<ICommerceProtocolManager, CommerceProtocolManager>();

        _serviceProvider = services.BuildServiceProvider();
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

                // Setup the void-returning overload: Task ExecuteWithContextAsync<T>(Func<DbContext, Task>)
                // This is used like: scope.ExecuteWithContextAsync<Task>(async db => { ... })
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync<Task>(It.IsAny<Func<MerchelloDbContext, Task>>()))
                    .Returns((Func<MerchelloDbContext, Task> func) => func(dbContext));

                // Setup value-returning overloads for common return types
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

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<ProductRootDetailDto?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<ProductRootDetailDto?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<ProductVariantDto?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<ProductVariantDto?>> func) => func(dbContext));

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
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<ProductFilterGroup>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<ProductFilterGroup>>> func) => func(dbContext));

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

                // Payment return types
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Payment?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Payment?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<Payment>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<Payment>>> func) => func(dbContext));

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

                // Customer lookup DTO for InvoiceService.SearchCustomersAsync
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

                // GetUnpaidInvoiceForBasketAsync return type (tuple of Invoice and Basket)
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<(Invoice? Invoice, Basket? Basket)>>>()))
                    .Returns((Func<MerchelloDbContext, Task<(Invoice? Invoice, Basket? Basket)>> func) => func(dbContext));

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
        resetContext.Database.EnsureCreated();
        resetContext.Database.ExecuteSqlRaw("PRAGMA foreign_keys = OFF;");

        var tableNames = resetContext.Model.GetEntityTypes()
            .Select(t => t.GetTableName())
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .Distinct()
            .ToList();

        foreach (var table in tableNames)
        {
#pragma warning disable EF1002 // Table names come from EF metadata, not user input
            resetContext.Database.ExecuteSqlRaw($"""DELETE FROM "{table}";""");
#pragma warning restore EF1002
        }

        resetContext.Database.ExecuteSqlRaw("PRAGMA foreign_keys = ON;");
        resetContext.SaveChanges();

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
    /// Creates a new DbContext instance that points at the shared in-memory database.
    /// Useful for concurrent test threads where a unique context is required.
    /// Note: Connections are tracked and disposed when the fixture is disposed.
    /// </summary>
    public MerchelloDbContext CreateDbContext()
    {
        var connection = new SqliteConnection(_connectionString);
        connection.Open();

        // Track connection for cleanup (EF Core doesn't dispose externally-provided connections)
        lock (_connectionLock)
        {
            _trackedConnections.Add(connection);
        }

        var options = new DbContextOptionsBuilder<MerchelloDbContext>()
            .UseSqlite(connection)
            .Options;

        return new MerchelloDbContext(options);
    }

    public void Dispose()
    {
        DbContext?.Dispose();
        _serviceProvider?.Dispose();

        // Dispose all tracked connections from CreateDbContext calls
        lock (_connectionLock)
        {
            foreach (var connection in _trackedConnections)
            {
                connection.Dispose();
            }
            _trackedConnections.Clear();
        }

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
