using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Warehouses.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace Merchello.Core.Data;

public interface IMerchDbContext : IDisposable
{
    // --- Product DbSets ---
    DbSet<ProductRoot> RootProducts { get; }
    DbSet<Product> Products { get; }
    DbSet<ProductCategory> ProductCategories { get; }
    DbSet<ProductFilter> ProductFilters { get; }
    DbSet<ProductFilterGroup> ProductFilterGroups { get; }
    DbSet<ProductType> ProductTypes { get; }
    DbSet<ProductWarehouse> ProductWarehouses { get; }
    DbSet<ProductRootWarehouse> ProductRootWarehouses { get; }

    // --- Checkout/Cart DbSets ---
    DbSet<Basket> Baskets { get; }

    // --- Warehouse DbSets ---
    DbSet<Warehouse> Warehouses { get; }
    DbSet<WarehouseServiceRegion> WarehouseServiceRegions { get; }

    // --- Accounting DbSets ---
    DbSet<Invoice> Invoices { get; }
    DbSet<LineItem> LineItems { get; }
    DbSet<Order> Orders { get; }
    DbSet<Payment> Payments { get; }
    DbSet<Shipment> Shipments { get; }
    DbSet<TaxGroup> TaxGroups { get; }

    // --- Shipping DbSets ---
    DbSet<ShippingOption> ShippingOptions { get; }
    DbSet<ShippingProviderConfiguration> ShippingProviderConfigurations { get; }

    // --- Common methods ---
    int SaveChanges();
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    DbSet<T> Set<T>() where T : class;
    EntityEntry Entry(object entity);

    // Add these for EF-style usage
    EntityEntry Add(object entity);
    EntityEntry<T> Add<T>(T entity) where T : class;
    void AddRange(params object[] entities);
    void AddRange(IEnumerable<object> entities);

    EntityEntry Update(object entity);
    EntityEntry<T> Update<T>(T entity) where T : class;
    void UpdateRange(params object[] entities);
    void UpdateRange(IEnumerable<object> entities);

    EntityEntry Remove(object entity);
    EntityEntry<T> Remove<T>(T entity) where T : class;
    void RemoveRange(params object[] entities);
    void RemoveRange(IEnumerable<object> entities);

    DatabaseFacade Database { get; }
}

