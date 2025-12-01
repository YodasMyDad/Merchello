using System.Reflection;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Warehouses.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;

namespace Merchello.Core.Data;

public abstract class MerchDbContextBase(DbContextOptions options, IConfiguration configuration)
    : DbContext(options)
{
    // ReSharper disable once UnusedMember.Local
    private readonly IConfiguration _configuration = configuration;

    // All DbSets
    public DbSet<ProductRoot> RootProducts => Set<ProductRoot>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductCategory> ProductCategories => Set<ProductCategory>();
    public DbSet<ProductFilter> ProductFilters => Set<ProductFilter>();
    public DbSet<ProductFilterGroup> ProductFilterGroups => Set<ProductFilterGroup>();
    public DbSet<ProductType> ProductTypes => Set<ProductType>();
    public DbSet<ProductWarehouse> ProductWarehouses => Set<ProductWarehouse>();
    public DbSet<ProductRootWarehouse> ProductRootWarehouses => Set<ProductRootWarehouse>();
    public DbSet<Basket> Baskets => Set<Basket>();
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<LineItem> LineItems => Set<LineItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Shipment> Shipments => Set<Shipment>();
    public DbSet<TaxGroup> TaxGroups => Set<TaxGroup>();
    public DbSet<ShippingOption> ShippingOptions => Set<ShippingOption>();
    public DbSet<ShippingProviderConfiguration> ShippingProviderConfigurations => Set<ShippingProviderConfiguration>();
    public DbSet<WarehouseServiceRegion> WarehouseServiceRegions => Set<WarehouseServiceRegion>();

    // Common OnModelCreating code
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }

    public new DatabaseFacade Database => base.Database;
}

