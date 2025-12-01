using System.Reflection;
using Merchello.Core.Accounting.Services;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Services;
using Merchello.Core.Checkout.Services.Interfaces;
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
using Merchello.Core.Warehouses.Services;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Warehouses.Factories;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Merchello.Core;

public static class Startup
{
    /*
    public static void AddMerch(this WebApplication app)
    {
        using (var scope = app.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<MerchDbContext>();
            //var mediatr = scope.ServiceProvider.GetRequiredService<IMediator>();
            try
            {
                if (dbContext.Database.GetPendingMigrations().Any())
                {
                    dbContext.Database.Migrate();
                }

                //await dbContext.SeedData(mediatr);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error during startup trying to do Db migrations");
            }
        }
    }
    */

    public static void AddMerch(this WebApplicationBuilder builder, IEnumerable<Assembly>? pluginAssemblies = null)
    {
        var merchSettings = new MerchSettings();
        builder.Configuration.GetSection("Merch").Bind(merchSettings);
        builder.Services.Configure<MerchSettings>(builder.Configuration.GetSection("Merch"));

        var databaseProvider = merchSettings.DatabaseProvider;
        if (databaseProvider != null)
        {
            switch (databaseProvider.ToLower())
            {
                case "sqlite":
                    builder.Services.AddDbContext<SqliteMerchDbContext>();
                    builder.Services.AddScoped<IMerchDbContext, SqliteMerchDbContext>();
                    break;
                case "postgresql":
                    builder.Services.AddDbContext<PostgreSqlMerchDbContext>();
                    builder.Services.AddScoped<IMerchDbContext, PostgreSqlMerchDbContext>();
                    break;
                case "sqlserver":
                    builder.Services.AddDbContext<MerchDbContext>();
                    builder.Services.AddScoped<IMerchDbContext, MerchDbContext>();
                    break;
                default:
                    throw new Exception("Unable to find database provider in appSettings");
            }
        }
        else
        {
            throw new Exception("DatabaseProvider not configured in Merch settings");
        }

        builder.Services.AddMemoryCache();
        builder.Services.AddHybridCache();

        // Configure cache options (will use defaults from CacheOptions class if section doesn't exist)
        builder.Services.Configure<CacheOptions>(builder.Configuration.GetSection("Merch:Cache"));

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
        builder.Services.AddSingleton<Merchello.Core.Locality.Factories.AddressFactory>();

        // Services
        builder.Services.AddScoped<ILineItemService, LineItemService>();
        builder.Services.AddScoped<ICheckoutService, CheckoutService>();
        builder.Services.AddScoped<IOrderService, OrderService>();
        builder.Services.AddScoped<IInventoryService, Merchello.Core.Products.Services.InventoryService>();
        builder.Services.AddScoped<IOrderStatusHandler, DefaultOrderStatusHandler>();
        builder.Services.AddScoped<IShippingQuoteService, ShippingQuoteService>();
        builder.Services.AddScoped<IShippingProviderManager, ShippingProviderManager>();
        builder.Services.AddScoped<IShippingService, ShippingService>();
        builder.Services.AddScoped<IDeliveryDateService, DeliveryDateService>();
        builder.Services.AddScoped<IDeliveryDateProvider, DefaultDeliveryDateProvider>();
        builder.Services.AddScoped<IWarehouseService, WarehouseService>();
        builder.Services.AddScoped<ILocationsService, LocationsService>();
        builder.Services.AddSingleton<ILocalityCatalog, DefaultLocalityCatalog>();
        builder.Services.AddSingleton<ILocalityCacheInvalidator, LocalityCacheInvalidator>();
        builder.Services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
        builder.Services.AddScoped<IProductService, ProductService>();
        builder.Services.AddScoped<ITaxService, TaxService>();


        var assembliesToScan = (pluginAssemblies ?? Enumerable.Empty<Assembly>())
            .Distinct()
            .ToList();

        if (!assembliesToScan.Any())
        {
            assembliesToScan.Add(typeof(Startup).Assembly);
        }

        AssemblyManager.SetAssemblies(assembliesToScan.ToArray());
    }
}
