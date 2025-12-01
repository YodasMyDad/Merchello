using Merchello.Core.Data;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Services;
using Merchello.Core.Shared.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Merchello.Tests;

public class ServiceTestFixture
{
    public IMerchDbContext DbContext { get; private set; } = null!;
    public IServiceProvider ServiceProvider { get; private set; }
    public IServiceCollection Services { get; private set; }

    public ServiceTestFixture()
    {
        Services = new ServiceCollection();
        Services.AddSingleton<ILoggerFactory, LoggerFactory>();
        Services.AddSingleton(typeof(ILogger<>), typeof(Logger<>));
        Services.AddSingleton<SlugHelper>();
        // Add IConfiguration with a basic in-memory configuration for testing
        var configuration = new ConfigurationBuilder()
            .Build();
        Services.AddSingleton<IConfiguration>(configuration);
        Services.AddDbContext<MerchDbContextTests>();
        Services.AddScoped<IMerchDbContext, MerchDbContextTests>();

        // Factories
        Services.AddSingleton<ProductRootFactory>();
        Services.AddSingleton<ProductFactory>();
        Services.AddSingleton<ProductOptionFactory>();
        Services.AddScoped<ProductService>();

        ServiceProvider = Services.BuildServiceProvider();

        // Initialize the DbContext
        InitializeDbContext();
    }

    public void InitializeDbContext()
    {
        DbContext = ServiceProvider.GetService<IMerchDbContext>()!;
        DbContext.Database.OpenConnection();
        DbContext.Database.EnsureCreated();
    }

    public void ResetDatabase()
    {
        DbContext.Database.EnsureDeleted();
        DbContext.Database.EnsureCreated();
    }
}
