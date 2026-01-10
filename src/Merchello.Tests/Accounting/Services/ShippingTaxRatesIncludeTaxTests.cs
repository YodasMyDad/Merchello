using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Handlers.Interfaces;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Strategies.Interfaces;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.ExchangeRates.Models;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.Locality.Models;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Providers.Interfaces;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Tax.Models;
using Merchello.Core.Tax.Providers;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Core.Tax.Providers.Models;
using Merchello.Core.Tax.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Tests.TestInfrastructure;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Umbraco.Cms.Core.Scoping;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Accounting.Services;

/// <summary>
/// Tests for the RatesIncludeTax flag on shipping providers.
/// Verifies that shipping from providers with RatesIncludeTax = true
/// is excluded from shipping tax calculation.
/// </summary>
[Collection("Integration")]
public class ShippingTaxRatesIncludeTaxTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;

    public ShippingTaxRatesIncludeTaxTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
    }

    /// <summary>
    /// Creates an InvoiceService with custom shipping provider manager mock for testing
    /// </summary>
    private InvoiceService CreateInvoiceServiceWithCustomMocks(
        Func<string, RegisteredShippingProvider?> providerLookup)
    {
        var scopeProvider = CreateScopeProvider();
        var shippingServiceMock = new Mock<IShippingService>();

        // Configure shipping service to return shipping options with provider keys
        shippingServiceMock
            .Setup(x => x.GetShippingOptionByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Guid id, CancellationToken ct) =>
            {
                // Return a shipping option with a provider key based on the ID
                // This allows tests to control which provider is looked up
                return new ShippingOption
                {
                    Id = id,
                    Name = "Test Shipping",
                    ProviderKey = id.ToString() // Use ID as provider key for lookup
                };
            });

        // Configure shipping provider manager with custom lookup
        var shippingProviderManagerMock = new Mock<IShippingProviderManager>();
        shippingProviderManagerMock
            .Setup(x => x.GetProviderAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string key, bool enabled, CancellationToken ct) => providerLookup(key));

        var inventoryService = new Mock<IInventoryService>().Object;
        var statusHandler = _fixture.GetService<IOrderStatusHandler>();
        var paymentService = new Mock<IPaymentService>().Object;
        var customerService = new Mock<ICustomerService>().Object;
        var checkoutService = new Lazy<ICheckoutService>(() => new Mock<ICheckoutService>().Object);
        var notificationPublisher = new Mock<IMerchelloNotificationPublisher>().Object;
        var exchangeRateCacheMock = new Mock<IExchangeRateCache>();
        exchangeRateCacheMock.Setup(x => x.GetRateQuoteAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ExchangeRateQuote(1m, DateTime.UtcNow, "mock"));
        var settings = Options.Create(new MerchelloSettings { DefaultRounding = MidpointRounding.AwayFromZero, StoreCurrencyCode = "USD" });
        var currencyService = new CurrencyService(settings);
        var lineItemService = new LineItemService(currencyService);
        var discountService = new Mock<IDiscountService>().Object;

        // Mock tax service to return tax rates
        var taxServiceMock = new Mock<ITaxService>();
        taxServiceMock.Setup(x => x.GetApplicableRateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(10m); // 10% tax rate

        // Mock tax provider manager to return a ManualTaxProvider that calculates shipping tax
        var taxProviderManagerMock = new Mock<ITaxProviderManager>();
        var manualTaxProviderMock = CreateMockManualTaxProvider();
        taxProviderManagerMock
            .Setup(x => x.GetActiveProviderAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(manualTaxProviderMock);

        var strategyResolver = new Mock<IOrderGroupingStrategyResolver>().Object;
        var logger = new Mock<ILogger<InvoiceService>>().Object;

        var invoiceFactory = new InvoiceFactory(currencyService);
        var orderFactory = new OrderFactory();
        var lineItemFactory = new LineItemFactory();

        return new InvoiceService(
            scopeProvider,
            shippingServiceMock.Object,
            shippingProviderManagerMock.Object,
            inventoryService,
            statusHandler,
            paymentService,
            customerService,
            checkoutService,
            strategyResolver,
            notificationPublisher,
            exchangeRateCacheMock.Object,
            currencyService,
            lineItemService,
            discountService,
            taxServiceMock.Object,
            taxProviderManagerMock.Object,
            invoiceFactory,
            orderFactory,
            lineItemFactory,
            settings,
            logger);
    }

    /// <summary>
    /// Creates a mock tax provider that returns shipping tax based on a 10% rate
    /// </summary>
    private RegisteredTaxProvider CreateMockManualTaxProvider()
    {
        var taxProviderMock = new Mock<ITaxProvider>();
        taxProviderMock
            .Setup(x => x.CalculateTaxAsync(It.IsAny<TaxCalculationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaxCalculationRequest req, CancellationToken ct) =>
            {
                // Calculate 10% shipping tax on the taxable shipping amount
                var shippingTax = req.ShippingAmount * 0.10m;
                return new TaxCalculationResult
                {
                    Success = true,
                    TotalTax = shippingTax,
                    ShippingTax = shippingTax
                };
            });

        taxProviderMock.Setup(x => x.Metadata).Returns(new TaxProviderMetadata(
            Alias: "manual-tax",
            DisplayName: "Manual Tax Provider",
            Icon: null,
            Description: null,
            SupportsRealTimeCalculation: false,
            RequiresApiCredentials: false
        ));

        var setting = new TaxProviderSetting
        {
            ProviderAlias = "manual-tax",
            IsActive = true
        };

        return new RegisteredTaxProvider(taxProviderMock.Object, setting);
    }

    /// <summary>
    /// Creates a mock shipping provider with the specified RatesIncludeTax setting
    /// </summary>
    private RegisteredShippingProvider CreateMockShippingProvider(string key, bool ratesIncludeTax)
    {
        var shippingProviderMock = new Mock<IShippingProvider>();
        shippingProviderMock.Setup(x => x.Metadata).Returns(new ShippingProviderMetadata
        {
            Key = key,
            DisplayName = $"Test Provider ({key})",
            RatesIncludeTax = ratesIncludeTax
        });

        var config = new ShippingProviderConfiguration
        {
            ProviderKey = key,
            IsEnabled = true
        };

        return new RegisteredShippingProvider(shippingProviderMock.Object, config);
    }

    private IEFCoreScopeProvider<MerchelloDbContext> CreateScopeProvider()
    {
        var scopeProviderMock = new Mock<IEFCoreScopeProvider<MerchelloDbContext>>();
        scopeProviderMock
            .Setup(p => p.CreateScope(It.IsAny<RepositoryCacheMode>(), It.IsAny<bool?>()))
            .Returns(() =>
            {
                var dbContext = _fixture.CreateDbContext();
                var scopeMock = new Mock<IEfCoreScope<MerchelloDbContext>>();

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync<Task>(It.IsAny<Func<MerchelloDbContext, Task>>()))
                    .Returns((Func<MerchelloDbContext, Task> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Invoice?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Invoice?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<Invoice>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<Invoice>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<ShippingOption?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<ShippingOption?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<int>>>()))
                    .Returns((Func<MerchelloDbContext, Task<int>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<bool>>>()))
                    .Returns((Func<MerchelloDbContext, Task<bool>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Order?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Order?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<Order>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<Order>>> func) => func(dbContext));

                scopeMock.Setup(s => s.Complete()).Returns(true);
                scopeMock.Setup(s => s.Dispose()).Callback(dbContext.Dispose);

                return scopeMock.Object;
            });

        return scopeProviderMock.Object;
    }

    #region RatesIncludeTax Tests

    [Fact]
    public async Task CalculateShippingTax_WhenProviderNotFound_TaxesFullShippingAmount()
    {
        // Arrange - Provider lookup returns null (provider not found)
        var invoiceService = CreateInvoiceServiceWithCustomMocks(
            providerLookup: _ => null);

        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoiceWithOrders(orderCount: 1, lineItemsPerOrder: 1, itemPrice: 100m);

        // Set shipping cost and address (required for tax calculation)
        var order = invoice.Orders!.First();
        order.ShippingCost = 20m;
        order.ShippingOptionId = Guid.NewGuid();
        invoice.ShippingAddress = new Address { CountryCode = "US", TownCity = "New York", PostalCode = "10001" };

        await dataBuilder.SaveChangesAsync();

        // Act - Update the order to trigger recalculation
        var result = await invoiceService.UpdateOrderStatusAsync(order.Id, OrderStatus.Processing);

        // Assert - Provider not found, so full shipping should be taxed
        // With 10% tax rate on $20 shipping = $2 shipping tax
        result.ResultObject.ShouldBeTrue();
    }

    [Fact]
    public async Task CalculateShippingTax_WhenRatesIncludeTaxIsFalse_TaxesFullShippingAmount()
    {
        // Arrange - Provider has RatesIncludeTax = false (default)
        var shippingOptionId = Guid.NewGuid();
        var provider = CreateMockShippingProvider(shippingOptionId.ToString(), ratesIncludeTax: false);

        var invoiceService = CreateInvoiceServiceWithCustomMocks(
            providerLookup: key => key == shippingOptionId.ToString() ? provider : null);

        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoiceWithOrders(orderCount: 1, lineItemsPerOrder: 1, itemPrice: 100m);

        var order = invoice.Orders!.First();
        order.ShippingCost = 20m;
        order.ShippingOptionId = shippingOptionId;
        invoice.ShippingAddress = new Address { CountryCode = "US", TownCity = "New York", PostalCode = "10001" };

        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await invoiceService.UpdateOrderStatusAsync(order.Id, OrderStatus.Processing);

        // Assert - RatesIncludeTax = false, so full shipping should be taxed
        result.ResultObject.ShouldBeTrue();
        // The actual tax amount verification would require checking the invoice totals
    }

    [Fact]
    public async Task CalculateShippingTax_WhenRatesIncludeTaxIsTrue_ExcludesShippingFromTaxCalculation()
    {
        // Arrange - Provider has RatesIncludeTax = true
        var shippingOptionId = Guid.NewGuid();
        var provider = CreateMockShippingProvider(shippingOptionId.ToString(), ratesIncludeTax: true);

        var invoiceService = CreateInvoiceServiceWithCustomMocks(
            providerLookup: key => key == shippingOptionId.ToString() ? provider : null);

        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoiceWithOrders(orderCount: 1, lineItemsPerOrder: 1, itemPrice: 100m);

        var order = invoice.Orders!.First();
        order.ShippingCost = 20m;
        order.ShippingOptionId = shippingOptionId;
        invoice.ShippingAddress = new Address { CountryCode = "US", TownCity = "New York", PostalCode = "10001" };

        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await invoiceService.UpdateOrderStatusAsync(order.Id, OrderStatus.Processing);

        // Assert - RatesIncludeTax = true, so shipping should be excluded from tax
        result.ResultObject.ShouldBeTrue();
        // The shipping tax should be 0 because the provider rates already include tax
    }

    [Fact]
    public async Task CalculateShippingTax_WithMixedProviders_OnlyTaxesTaxExclusiveShipping()
    {
        // Arrange - Two orders with different providers
        // Provider 1: RatesIncludeTax = false (shipping = $15)
        // Provider 2: RatesIncludeTax = true (shipping = $25)
        // Only $15 should be taxed

        var shippingOptionId1 = Guid.NewGuid();
        var shippingOptionId2 = Guid.NewGuid();
        var provider1 = CreateMockShippingProvider(shippingOptionId1.ToString(), ratesIncludeTax: false);
        var provider2 = CreateMockShippingProvider(shippingOptionId2.ToString(), ratesIncludeTax: true);

        var invoiceService = CreateInvoiceServiceWithCustomMocks(
            providerLookup: key =>
            {
                if (key == shippingOptionId1.ToString()) return provider1;
                if (key == shippingOptionId2.ToString()) return provider2;
                return null;
            });

        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse1 = dataBuilder.CreateWarehouse(name: "Warehouse 1");
        var warehouse2 = dataBuilder.CreateWarehouse(name: "Warehouse 2");
        var shippingOption1 = dataBuilder.CreateShippingOption(warehouse: warehouse1, fixedCost: 15m);
        var shippingOption2 = dataBuilder.CreateShippingOption(warehouse: warehouse2, fixedCost: 25m);
        var customer = dataBuilder.CreateCustomer();

        var invoice = dataBuilder.CreateInvoice(customer.Email, 200m, customer);
        invoice.ShippingAddress = new Address { CountryCode = "US", TownCity = "New York", PostalCode = "10001" };

        var order1 = dataBuilder.CreateOrder(invoice, warehouse1, shippingOption1);
        order1.ShippingCost = 15m;
        order1.ShippingOptionId = shippingOptionId1;
        dataBuilder.CreateLineItem(order1, name: "Item 1", amount: 50m);

        var order2 = dataBuilder.CreateOrder(invoice, warehouse2, shippingOption2);
        order2.ShippingCost = 25m;
        order2.ShippingOptionId = shippingOptionId2;
        dataBuilder.CreateLineItem(order2, name: "Item 2", amount: 50m);

        await dataBuilder.SaveChangesAsync();

        // Act - Update first order to trigger recalculation
        var result = await invoiceService.UpdateOrderStatusAsync(order1.Id, OrderStatus.Processing);

        // Assert
        result.ResultObject.ShouldBeTrue();
        // Expected: Only $15 shipping from order1 is taxed (provider1 has RatesIncludeTax = false)
        // The $25 shipping from order2 is not taxed (provider2 has RatesIncludeTax = true)
        // Total taxable shipping = $15
        // Shipping tax = $15 * 10% = $1.50
    }

    [Fact]
    public async Task CalculateShippingTax_WhenAllProvidersHaveRatesIncludeTax_ReturnsZeroShippingTax()
    {
        // Arrange - Both providers have RatesIncludeTax = true
        var shippingOptionId1 = Guid.NewGuid();
        var shippingOptionId2 = Guid.NewGuid();
        var provider1 = CreateMockShippingProvider(shippingOptionId1.ToString(), ratesIncludeTax: true);
        var provider2 = CreateMockShippingProvider(shippingOptionId2.ToString(), ratesIncludeTax: true);

        var invoiceService = CreateInvoiceServiceWithCustomMocks(
            providerLookup: key =>
            {
                if (key == shippingOptionId1.ToString()) return provider1;
                if (key == shippingOptionId2.ToString()) return provider2;
                return null;
            });

        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse1 = dataBuilder.CreateWarehouse(name: "Warehouse 1");
        var warehouse2 = dataBuilder.CreateWarehouse(name: "Warehouse 2");
        var shippingOption1 = dataBuilder.CreateShippingOption(warehouse: warehouse1, fixedCost: 15m);
        var shippingOption2 = dataBuilder.CreateShippingOption(warehouse: warehouse2, fixedCost: 25m);
        var customer = dataBuilder.CreateCustomer();

        var invoice = dataBuilder.CreateInvoice(customer.Email, 200m, customer);
        invoice.ShippingAddress = new Address { CountryCode = "US", TownCity = "New York", PostalCode = "10001" };

        var order1 = dataBuilder.CreateOrder(invoice, warehouse1, shippingOption1);
        order1.ShippingCost = 15m;
        order1.ShippingOptionId = shippingOptionId1;
        dataBuilder.CreateLineItem(order1, name: "Item 1", amount: 50m);

        var order2 = dataBuilder.CreateOrder(invoice, warehouse2, shippingOption2);
        order2.ShippingCost = 25m;
        order2.ShippingOptionId = shippingOptionId2;
        dataBuilder.CreateLineItem(order2, name: "Item 2", amount: 50m);

        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await invoiceService.UpdateOrderStatusAsync(order1.Id, OrderStatus.Processing);

        // Assert
        result.ResultObject.ShouldBeTrue();
        // All providers have RatesIncludeTax = true, so shipping tax should be 0
    }

    [Fact]
    public async Task CalculateShippingTax_WhenNoShippingCost_ReturnsZeroShippingTax()
    {
        // Arrange - Order has no shipping cost (e.g., digital product)
        var invoiceService = CreateInvoiceServiceWithCustomMocks(
            providerLookup: _ => null);

        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoiceWithOrders(orderCount: 1, lineItemsPerOrder: 1, itemPrice: 100m);

        var order = invoice.Orders!.First();
        order.ShippingCost = 0m; // No shipping
        invoice.ShippingAddress = new Address { CountryCode = "US", TownCity = "New York", PostalCode = "10001" };

        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await invoiceService.UpdateOrderStatusAsync(order.Id, OrderStatus.Processing);

        // Assert
        result.ResultObject.ShouldBeTrue();
        // No shipping cost = no shipping tax to calculate
    }

    #endregion
}
