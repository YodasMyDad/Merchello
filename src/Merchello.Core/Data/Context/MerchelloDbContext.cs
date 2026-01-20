using System.Reflection;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Customers.Models;
using Merchello.Core.DigitalProducts.Models;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Email.Models;
using Merchello.Core.ExchangeRates.Models;
using Merchello.Core.Payments.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Protocols.Webhooks.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Suppliers.Models;
using Merchello.Core.Tax.Models;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Webhooks.Models;
using Microsoft.EntityFrameworkCore;

namespace Merchello.Core.Data;

/// <summary>
/// Merchello database context - uses Umbraco's database provider automatically
/// </summary>
public class MerchelloDbContext : DbContext
{
    public MerchelloDbContext(DbContextOptions<MerchelloDbContext> options)
        : base(options)
    {
    }

    // Product DbSets
    public DbSet<ProductRoot> RootProducts => Set<ProductRoot>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductCollection> ProductCollections => Set<ProductCollection>();
    public DbSet<ProductFilter> ProductFilters => Set<ProductFilter>();
    public DbSet<ProductFilterGroup> ProductFilterGroups => Set<ProductFilterGroup>();
    public DbSet<ProductType> ProductTypes => Set<ProductType>();
    public DbSet<ProductWarehouse> ProductWarehouses => Set<ProductWarehouse>();
    public DbSet<ProductRootWarehouse> ProductRootWarehouses => Set<ProductRootWarehouse>();

    // Customer DbSets
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<CustomerTag> CustomerTags => Set<CustomerTag>();
    public DbSet<CustomerSegment> CustomerSegments => Set<CustomerSegment>();
    public DbSet<CustomerSegmentMember> CustomerSegmentMembers => Set<CustomerSegmentMember>();

    // Checkout DbSets
    public DbSet<Basket> Baskets => Set<Basket>();
    public DbSet<AbandonedCheckout> AbandonedCheckouts => Set<AbandonedCheckout>();

    // Supplier DbSets
    public DbSet<Supplier> Suppliers => Set<Supplier>();

    // Warehouse DbSets
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<WarehouseServiceRegion> WarehouseServiceRegions => Set<WarehouseServiceRegion>();

    // Accounting DbSets
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<LineItem> LineItems => Set<LineItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<TaxGroup> TaxGroups => Set<TaxGroup>();
    public DbSet<TaxGroupRate> TaxGroupRates => Set<TaxGroupRate>();
    public DbSet<ShippingTaxOverride> ShippingTaxOverrides => Set<ShippingTaxOverride>();

    // Shipping DbSets
    public DbSet<Shipment> Shipments => Set<Shipment>();
    public DbSet<ShippingOption> ShippingOptions => Set<ShippingOption>();
    public DbSet<ShippingCost> ShippingCosts => Set<ShippingCost>();
    public DbSet<ShippingWeightTier> ShippingWeightTiers => Set<ShippingWeightTier>();
    public DbSet<ShippingProviderConfiguration> ShippingProviderConfigurations => Set<ShippingProviderConfiguration>();

    // Payment Provider DbSets
    public DbSet<PaymentProviderSetting> PaymentProviderSettings => Set<PaymentProviderSetting>();
    public DbSet<PaymentMethodSetting> PaymentMethodSettings => Set<PaymentMethodSetting>();

    // Exchange Rate Provider DbSets
    public DbSet<ExchangeRateProviderSetting> ExchangeRateProviderSettings => Set<ExchangeRateProviderSetting>();

    // Tax Provider DbSets
    public DbSet<TaxProviderSetting> TaxProviderSettings => Set<TaxProviderSetting>();

    // Discount DbSets
    public DbSet<Discount> Discounts => Set<Discount>();
    public DbSet<DiscountTargetRule> DiscountTargetRules => Set<DiscountTargetRule>();
    public DbSet<DiscountEligibilityRule> DiscountEligibilityRules => Set<DiscountEligibilityRule>();
    public DbSet<DiscountBuyXGetYConfig> DiscountBuyXGetYConfigs => Set<DiscountBuyXGetYConfig>();
    public DbSet<DiscountFreeShippingConfig> DiscountFreeShippingConfigs => Set<DiscountFreeShippingConfig>();
    public DbSet<DiscountUsage> DiscountUsages => Set<DiscountUsage>();

    // Webhook DbSets
    public DbSet<WebhookSubscription> WebhookSubscriptions => Set<WebhookSubscription>();
    public DbSet<OutboundDelivery> OutboundDeliveries => Set<OutboundDelivery>();

    // Email DbSets
    public DbSet<EmailConfiguration> EmailConfigurations => Set<EmailConfiguration>();

    // Digital Products DbSets
    public DbSet<DownloadLink> DownloadLinks => Set<DownloadLink>();

    // Protocol Signing Keys DbSets
    public DbSet<SigningKey> SigningKeys => Set<SigningKey>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }
}
