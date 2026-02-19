using System.Reflection;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Customers.Models;
using Merchello.Core.DigitalProducts.Models;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Email.Models;
using Merchello.Core.ExchangeRates.Models;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Payments.Models;
using Merchello.Core.ProductFeeds.Models;
using Merchello.Core.ProductSync.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Protocols.Webhooks.Models;
using Merchello.Core.Shared.Providers;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Suppliers.Models;
using Merchello.Core.Tax.Models;
using Merchello.Core.Upsells.Models;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Data.Interfaces;
using Merchello.Core.Auditing.Models;
using Merchello.Core.GiftCards.Models;
using Merchello.Core.Returns.Models;
using Merchello.Core.Search.Models;
using Merchello.Core.Settings.Models;
using Merchello.Core.Subscriptions.Models;
using Merchello.Core.Webhooks.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Configuration.Models;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Extensions;

namespace Merchello.Core.Data;

/// <summary>
/// Merchello database context - uses Umbraco's database provider automatically
/// </summary>
public class MerchelloDbContext : DbContext
{
    public MerchelloDbContext(DbContextOptions<MerchelloDbContext> options)
        : base(ConfigureOptions(options))
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
    public DbSet<ProductFeed> ProductFeeds => Set<ProductFeed>();
    public DbSet<ProductSyncRun> ProductSyncRuns => Set<ProductSyncRun>();
    public DbSet<ProductSyncIssue> ProductSyncIssues => Set<ProductSyncIssue>();

    // Customer DbSets
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<CustomerSegment> CustomerSegments => Set<CustomerSegment>();
    public DbSet<CustomerSegmentMember> CustomerSegmentMembers => Set<CustomerSegmentMember>();

    // Checkout DbSets
    public DbSet<Basket> Baskets => Set<Basket>();
    public DbSet<AbandonedCheckout> AbandonedCheckouts => Set<AbandonedCheckout>();

    // Supplier DbSets
    public DbSet<Supplier> Suppliers => Set<Supplier>();

    // Warehouse DbSets
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();

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
    public DbSet<ProviderConfiguration> ProviderConfigurations => Set<ProviderConfiguration>();

    // Fulfilment DbSets
    public DbSet<FulfilmentSyncLog> FulfilmentSyncLogs => Set<FulfilmentSyncLog>();
    public DbSet<FulfilmentWebhookLog> FulfilmentWebhookLogs => Set<FulfilmentWebhookLog>();

    // Payment Provider DbSets
    public DbSet<SavedPaymentMethod> SavedPaymentMethods => Set<SavedPaymentMethod>();

    // Exchange Rate & Tax Provider DbSets are consolidated into ProviderConfigurations

    // Discount DbSets
    public DbSet<Discount> Discounts => Set<Discount>();
    public DbSet<DiscountUsage> DiscountUsages => Set<DiscountUsage>();

    // Upsell DbSets
    public DbSet<UpsellRule> UpsellRules => Set<UpsellRule>();
    public DbSet<UpsellEvent> UpsellEvents => Set<UpsellEvent>();

    // Webhook DbSets
    public DbSet<WebhookSubscription> WebhookSubscriptions => Set<WebhookSubscription>();
    public DbSet<OutboundDelivery> OutboundDeliveries => Set<OutboundDelivery>();

    // Email DbSets
    public DbSet<EmailConfiguration> EmailConfigurations => Set<EmailConfiguration>();

    // Digital Products DbSets
    public DbSet<DownloadLink> DownloadLinks => Set<DownloadLink>();

    // Protocol Signing Keys DbSets
    public DbSet<SigningKey> SigningKeys => Set<SigningKey>();

    // Audit Trail DbSets
    public DbSet<AuditTrailEntry> AuditTrailEntries => Set<AuditTrailEntry>();

    // Customer Address DbSets
    public DbSet<CustomerAddress> CustomerAddresses => Set<CustomerAddress>();

    // Gift Card DbSets
    public DbSet<GiftCard> GiftCards => Set<GiftCard>();
    public DbSet<GiftCardTransaction> GiftCardTransactions => Set<GiftCardTransaction>();

    // Search DbSets
    public DbSet<SearchProviderSetting> SearchProviderSettings => Set<SearchProviderSetting>();

    // Store Settings DbSets
    public DbSet<MerchelloStore> MerchelloStores => Set<MerchelloStore>();

    // Returns DbSets
    public DbSet<Return> Returns => Set<Return>();
    public DbSet<ReturnLineItem> ReturnLineItems => Set<ReturnLineItem>();
    public DbSet<ReturnReason> ReturnReasons => Set<ReturnReason>();

    // Subscription DbSets
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<SubscriptionInvoice> SubscriptionInvoices => Set<SubscriptionInvoice>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }

    private static DbContextOptions<MerchelloDbContext> ConfigureOptions(DbContextOptions<MerchelloDbContext> options)
    {
        // If a provider is already configured (normal runtime and design-time factories), keep existing options.
        if (options.Extensions.Any(extension => extension.Info.IsDatabaseProvider))
        {
            return options;
        }

        var coreOptionsExtension = options.Extensions.OfType<CoreOptionsExtension>().FirstOrDefault();
        var serviceProvider = coreOptionsExtension?.ApplicationServiceProvider ?? StaticServiceProvider.Instance;
        if (serviceProvider is null)
        {
            return options;
        }

        var connectionStrings = serviceProvider.GetRequiredService<IOptionsMonitor<ConnectionStrings>>().CurrentValue;
        if (string.IsNullOrWhiteSpace(connectionStrings.ProviderName) || string.IsNullOrWhiteSpace(connectionStrings.ConnectionString))
        {
            return options;
        }

        var connectionString = ResolveDataDirectory(connectionStrings.ConnectionString);
        var providerName = connectionStrings.ProviderName;

        var optionsBuilder = new DbContextOptionsBuilder<MerchelloDbContext>(options);
        var providerSetup = serviceProvider
            .GetServices<IMerchelloMigrationProviderSetup>()
            .FirstOrDefault(x => ProviderNameMatches(x.ProviderName, providerName));

        if (providerSetup is not null)
        {
            providerSetup.Setup(optionsBuilder, connectionString);
        }
        else
        {
            optionsBuilder.UseDatabaseProvider(providerName, connectionString);
        }

        return optionsBuilder.Options;
    }

    private static string ResolveDataDirectory(string connectionString)
    {
        var dataDirectory = AppDomain.CurrentDomain.GetData(Umbraco.Cms.Core.Constants.System.DataDirectoryName)?.ToString();
        if (string.IsNullOrWhiteSpace(dataDirectory))
        {
            return connectionString;
        }

        return connectionString.Replace(Umbraco.Cms.Core.Constants.System.DataDirectoryPlaceholder, dataDirectory);
    }

    private static bool ProviderNameMatches(string configuredProviderName, string activeProviderName)
    {
        if (configuredProviderName.Equals(activeProviderName, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return configuredProviderName == "Microsoft.Data.Sqlite" &&
               activeProviderName is "Microsoft.Data.SQLite" or "Microsoft.Data.Sqlite";
    }
}
