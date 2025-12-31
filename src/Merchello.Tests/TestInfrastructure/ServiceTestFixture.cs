using System.IO;
using System.Linq;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Handlers;
using Merchello.Core.Accounting.Handlers.Interfaces;
using Merchello.Core.Accounting.Services;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Strategies;
using Merchello.Core.Checkout.Strategies.Interfaces;
using Merchello.Core.Customers.Factories;
using Merchello.Core.Customers.Models;
using Merchello.Core.Customers.Services;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Data;
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
using Merchello.Core.Warehouses.Factories;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Warehouses.Services;
using Merchello.Core.Warehouses.Services.Interfaces;
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

    // Track all connections created by CreateDbContext for proper disposal
    private readonly List<SqliteConnection> _trackedConnections = [];
    private readonly object _connectionLock = new();

    public MerchelloDbContext DbContext { get; private set; } = null!;
    public IServiceProvider ServiceProvider => _serviceProvider;

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
        var merchelloSettings = new MerchelloSettings { StoreCurrencyCode = "USD", DefaultRounding = MidpointRounding.AwayFromZero };
        services.AddSingleton(Options.Create(merchelloSettings));

        // Currency services
        services.AddScoped<ICurrencyService, CurrencyService>();

        // Mock exchange rate cache for testing (returns 1:1 rates)
        var exchangeRateCacheMock = new Mock<IExchangeRateCache>();
        exchangeRateCacheMock
            .Setup(x => x.GetRateQuoteAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ExchangeRateQuote(1m, DateTime.UtcNow, "mock"));
        exchangeRateCacheMock
            .Setup(x => x.GetRateAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(1m);
        services.AddSingleton(exchangeRateCacheMock.Object);

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

        services.AddScoped<IShippingService, ShippingService>();

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
    public TestDataBuilder CreateDataBuilder() => new(DbContext);

    /// <summary>
    /// Gets a service from the DI container
    /// </summary>
    public T GetService<T>() where T : notnull => _serviceProvider.GetRequiredService<T>();

    /// <summary>
    /// Creates a new scope for test operations
    /// </summary>
    public IServiceScope CreateScope() => _serviceProvider.CreateScope();

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
