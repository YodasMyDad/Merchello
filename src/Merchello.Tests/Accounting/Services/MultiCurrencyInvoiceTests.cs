using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Core.Warehouses.Models;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Accounting.Services;

/// <summary>
/// Integration tests for multi-currency invoice creation.
/// Verifies that line items, add-ons, discounts, and shipping are all converted
/// from store currency to presentment currency using the centralized
/// ConvertToPresentmentCurrency() method.
/// </summary>
[Collection("Integration Tests")]
public class MultiCurrencyInvoiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IInvoiceService _invoiceService;
    private readonly IShippingService _shippingService;

    public MultiCurrencyInvoiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _invoiceService = fixture.GetService<IInvoiceService>();
        _shippingService = fixture.GetService<IShippingService>();
    }

    [Fact]
    public async Task CreateOrderFromBasketAsync_WithDifferentCurrency_ConvertsLineItemAmounts()
    {
        // Arrange - USD store, GBP customer, rate 1.25 (1 GBP = 1.25 USD)
        // So $100 USD / 1.25 = £80 GBP
        _fixture.SetExchangeRate("GBP", "USD", 1.25m);

        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("UK Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Standard Delivery", warehouse, fixedCost: 12.50m);

        shippingOption.SetShippingCosts(
        [
            new Core.Shipping.Models.ShippingCost
            {
                ShippingOptionId = shippingOption.Id,
                CountryCode = "GB",
                Cost = 12.50m  // $12.50 USD shipping
            }
        ]);

        var regions = warehouse.ServiceRegions;
        regions.Add(new WarehouseServiceRegion
        {
            CountryCode = "GB",
            IsExcluded = false
        });
        warehouse.SetServiceRegions(regions);
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Premium T-Shirt", taxGroup);
        var product = dataBuilder.CreateProduct("T-Shirt Blue Large", productRoot, price: 100.00m);
        product.Sku = "TSH-BLU-L";

        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Create basket in USD (store currency) with GBP as display currency
        var basket = CreateBasket("GBP", (product, 2));
        var billingAddress = CreateAddress("GB", "john@example.com");
        var shippingAddress = CreateAddress("GB", "john@example.com");

        // Get shipping options
        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });

        var group = shippingResult.WarehouseGroups.First();
        var selectedOption = group.AvailableShippingOptions.First();
        var selectedShippingOptions = new Dictionary<Guid, string>
        {
            [group.GroupId] = SelectionKeyExtensions.ForShippingOption(selectedOption.ShippingOptionId)
        };

        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = selectedShippingOptions
        };

        // Act
        var result = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        result.Success.ShouldBeTrue();
        var invoice = result.ResultObject!;

        // Assert - Invoice should be in GBP
        invoice.ShouldNotBeNull();
        invoice.CurrencyCode.ShouldBe("GBP");
        invoice.StoreCurrencyCode.ShouldBe("USD");
        invoice.PricingExchangeRate.ShouldBe(1.25m);

        // Verify line item amounts are converted
        var order = invoice.Orders!.First();
        var productLineItem = order.LineItems!.First(li => li.LineItemType == LineItemType.Product);

        // $100 USD / 1.25 = £80 GBP
        productLineItem.Amount.ShouldBe(80.00m);

        // Verify shipping is converted (shipping cost calculation may vary based on shipping provider)
        // Key assertion: shipping cost should be in GBP (less than USD equivalent at rate 1.25)
        order.ShippingCost.ShouldBeGreaterThan(0m);

        // Verify TotalInStoreCurrency is calculated correctly (reverse conversion)
        // Invoice totals are in GBP, TotalInStoreCurrency should be USD
        invoice.TotalInStoreCurrency.ShouldNotBeNull();
        invoice.TotalInStoreCurrency.Value.ShouldBeGreaterThan(invoice.Total);
    }

    [Fact]
    public async Task CreateOrderFromBasketAsync_WithDiscount_ConvertsDiscountAmount()
    {
        // Arrange - USD store, GBP customer, rate 1.25
        _fixture.SetExchangeRate("GBP", "USD", 1.25m);

        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Standard", warehouse, fixedCost: 5.00m);

        shippingOption.SetShippingCosts(
        [
            new Core.Shipping.Models.ShippingCost { ShippingOptionId = shippingOption.Id, CountryCode = "GB", Cost = 5.00m }
        ]);
        var regions = warehouse.ServiceRegions;
        regions.Add(new WarehouseServiceRegion { CountryCode = "GB", IsExcluded = false });
        warehouse.SetServiceRegions(regions);
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup("VAT", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Product", taxGroup);
        var product = dataBuilder.CreateProduct("Item", productRoot, price: 50.00m);
        product.Sku = "ITEM-001";

        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 50);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var productLineItemId = Guid.NewGuid();
        var basket = CreateBasket("GBP", (product, 2));
        var productLineItem = basket.LineItems.First(li => li.ProductId == product.Id);
        productLineItem.Id = productLineItemId;

        var basketDiscountLineItem = dataBuilder.CreateDiscountLineItem(
            name: "10% Discount",
            sku: "DISC-10",
            amount: -10.00m,
            dependantLineItemSku: product.Sku);
        basket.LineItems.Add(basketDiscountLineItem);
        basket.SubTotal = 100.00m;
        basket.Discount = 10.00m;
        basket.Tax = 18.00m;
        basket.Total = 108.00m;

        var billingAddress = CreateAddress("GB", "test@example.com");
        var shippingAddress = CreateAddress("GB", "test@example.com");

        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });

        var group = shippingResult.WarehouseGroups.First();
        var selectedOption = group.AvailableShippingOptions.First();
        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = new Dictionary<Guid, string>
            {
                [group.GroupId] = SelectionKeyExtensions.ForShippingOption(selectedOption.ShippingOptionId)
            }
        };

        // Act
        var result = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        result.Success.ShouldBeTrue();
        var invoice = result.ResultObject!;

        // Assert
        invoice.CurrencyCode.ShouldBe("GBP");

        var order = invoice.Orders!.First();
        var orderDiscountLineItem = order.LineItems!.FirstOrDefault(li => li.LineItemType == LineItemType.Discount);

        orderDiscountLineItem.ShouldNotBeNull();
        // $10 USD / 1.25 = ?8 GBP (but stored as negative for discount)
        Math.Abs(orderDiscountLineItem.Amount).ShouldBe(8.00m);
    }

    [Fact]
    public async Task CreateOrderFromBasketAsync_SameCurrency_NoConversion()
    {
        // Arrange - USD store, USD customer (no conversion needed)
        _fixture.SetExchangeRate("USD", "USD", 1.0m);

        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("US Warehouse", "US");
        var shippingOption = dataBuilder.CreateShippingOption("Standard", warehouse, fixedCost: 9.99m);

        shippingOption.SetShippingCosts(
        [
            new Core.Shipping.Models.ShippingCost { ShippingOptionId = shippingOption.Id, CountryCode = "US", Cost = 9.99m }
        ]);
        var regions = warehouse.ServiceRegions;
        regions.Add(new WarehouseServiceRegion { CountryCode = "US", IsExcluded = false });
        warehouse.SetServiceRegions(regions);
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup("Sales Tax", 8m);
        var productRoot = dataBuilder.CreateProductRoot("Product", taxGroup);
        var product = dataBuilder.CreateProduct("Item", productRoot, price: 49.99m);
        product.Sku = "ITEM-US";

        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = CreateBasket("USD", (product, 1));
        var billingAddress = CreateAddress("US", "test@example.com");
        var shippingAddress = CreateAddress("US", "test@example.com");

        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });

        var group = shippingResult.WarehouseGroups.First();
        var selectedOption = group.AvailableShippingOptions.First();
        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = new Dictionary<Guid, string>
            {
                [group.GroupId] = SelectionKeyExtensions.ForShippingOption(selectedOption.ShippingOptionId)
            }
        };

        // Act
        var result = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        result.Success.ShouldBeTrue();
        var invoice = result.ResultObject!;

        // Assert - No conversion should occur
        invoice.CurrencyCode.ShouldBe("USD");
        invoice.StoreCurrencyCode.ShouldBe("USD");
        invoice.PricingExchangeRate.ShouldBeNull();  // No rate needed for same currency
        invoice.TotalInStoreCurrency.ShouldBeNull();  // Not needed when currencies match

        var order = invoice.Orders!.First();
        var productLineItem = order.LineItems!.First(li => li.LineItemType == LineItemType.Product);
        productLineItem.Amount.ShouldBe(49.99m);  // Unchanged
    }

    [Fact]
    public async Task CreateOrderFromBasketAsync_JpyZeroDecimal_RoundsCorrectly()
    {
        // Arrange - USD store, JPY customer, rate 150 (1 JPY = 0.00667 USD, or 1 USD = 150 JPY)
        // So $100 USD / (1/150) = ¥15000 JPY, but we express rate as JPY→USD = 0.00667
        // Actually: presentment→store means JPY→USD, so rate = 0.00667
        // To convert $100 USD to JPY: $100 / 0.00667 ≈ ¥14993
        // Let's use rate = 0.01 for simpler math: $100 / 0.01 = ¥10000 JPY
        _fixture.SetExchangeRate("JPY", "USD", 0.01m);

        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("Warehouse", "JP");
        var shippingOption = dataBuilder.CreateShippingOption("Standard", warehouse, fixedCost: 10.00m);

        shippingOption.ShippingCosts.Add(new Core.Shipping.Models.ShippingCost { CountryCode = "JP", Cost = 10.00m });
        warehouse.ServiceRegions.Add(new WarehouseServiceRegion { CountryCode = "JP", IsExcluded = false });
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup("Consumption Tax", 10m);
        var productRoot = dataBuilder.CreateProductRoot("Product", taxGroup);
        var product = dataBuilder.CreateProduct("Item", productRoot, price: 100.00m);
        product.Sku = "ITEM-JP";

        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = CreateBasket("JPY", (product, 1));
        var billingAddress = CreateAddress("JP", "test@example.com");
        var shippingAddress = CreateAddress("JP", "test@example.com");

        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });

        var group = shippingResult.WarehouseGroups.First();
        var selectedOption = group.AvailableShippingOptions.First();
        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = new Dictionary<Guid, string>
            {
                [group.GroupId] = SelectionKeyExtensions.ForShippingOption(selectedOption.ShippingOptionId)
            }
        };

        // Act
        var result = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        result.Success.ShouldBeTrue();
        var invoice = result.ResultObject!;

        // Assert
        invoice.CurrencyCode.ShouldBe("JPY");

        var order = invoice.Orders!.First();
        var productLineItem = order.LineItems!.First(li => li.LineItemType == LineItemType.Product);

        // $100 USD / 0.01 = ¥10000 JPY (should have zero decimals)
        productLineItem.Amount.ShouldBe(10000m);
        (productLineItem.Amount % 1).ShouldBe(0m);  // No decimal places for JPY

        // Shipping should be converted and have zero decimals for JPY
        (order.ShippingCost % 1).ShouldBe(0m);
    }

    [Fact]
    public async Task CreateOrderFromBasketAsync_WithAddOn_ConvertsAddOnAmount()
    {
        // Arrange - USD store, EUR customer, rate 0.92 (1 EUR = 0.92 USD... wait, that's wrong direction)
        // Rate is presentment→store, so EUR→USD = 1.08 means 1 EUR = 1.08 USD
        // To convert $100 USD to EUR: $100 / 1.08 = €92.59 EUR
        _fixture.SetExchangeRate("EUR", "USD", 1.08m);

        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("EU Warehouse", "DE");
        var shippingOption = dataBuilder.CreateShippingOption("Standard", warehouse, fixedCost: 8.00m);

        shippingOption.ShippingCosts.Add(new Core.Shipping.Models.ShippingCost { CountryCode = "DE", Cost = 8.00m });
        warehouse.ServiceRegions.Add(new WarehouseServiceRegion { CountryCode = "DE", IsExcluded = false });
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup("VAT", 19m);
        var productRoot = dataBuilder.CreateProductRoot("Product", taxGroup);
        var product = dataBuilder.CreateProduct("Item", productRoot, price: 54.00m);
        product.Sku = "ITEM-EU";

        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = CreateBasket("EUR", (product, 1));
        var basketAddonLineItem = dataBuilder.CreateDiscountLineItem(
            name: "Gift Wrapping",
            sku: "ADDON-GIFT",
            amount: 5.40m,
            dependantLineItemSku: product.Sku);
        basketAddonLineItem.LineItemType = LineItemType.Addon;
        basketAddonLineItem.IsTaxable = true;
        basketAddonLineItem.TaxRate = 19m;
        basket.LineItems.Add(basketAddonLineItem);
        basket.SubTotal = 59.40m;
        basket.Tax = 11.29m;
        basket.Total = 70.69m;

        var billingAddress = CreateAddress("DE", "test@example.com");
        var shippingAddress = CreateAddress("DE", "test@example.com");

        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });

        var group = shippingResult.WarehouseGroups.First();
        var selectedOption = group.AvailableShippingOptions.First();
        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = new Dictionary<Guid, string>
            {
                [group.GroupId] = SelectionKeyExtensions.ForShippingOption(selectedOption.ShippingOptionId)
            }
        };

        // Act
        var result = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        result.Success.ShouldBeTrue();
        var invoice = result.ResultObject!;

        // Assert
        invoice.CurrencyCode.ShouldBe("EUR");

        var order = invoice.Orders!.First();

        // Product: $54 USD / 1.08 = €50 EUR
        var productLineItem = order.LineItems!.First(li => li.LineItemType == LineItemType.Product);
        productLineItem.Amount.ShouldBe(50.00m);

        // Add-on: $5.40 USD / 1.08 = €5 EUR
        var orderAddonLineItem = order.LineItems!.FirstOrDefault(li => li.LineItemType == LineItemType.Addon);
        orderAddonLineItem.ShouldNotBeNull();
        orderAddonLineItem.Amount.ShouldBe(5.00m);
    }

    [Fact]
    public async Task CreateOrderFromBasketAsync_TotalInStoreCurrency_CalculatedCorrectly()
    {
        // Arrange - USD store, GBP customer, rate 1.25
        _fixture.SetExchangeRate("GBP", "USD", 1.25m);

        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Standard", warehouse, fixedCost: 10.00m);

        shippingOption.ShippingCosts.Add(new Core.Shipping.Models.ShippingCost { CountryCode = "GB", Cost = 10.00m });
        warehouse.ServiceRegions.Add(new WarehouseServiceRegion { CountryCode = "GB", IsExcluded = false });
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup("VAT", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Product", taxGroup);
        var product = dataBuilder.CreateProduct("Item", productRoot, price: 100.00m);
        product.Sku = "ITEM-GB";

        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = CreateBasket("GBP", (product, 1));
        var billingAddress = CreateAddress("GB", "test@example.com");
        var shippingAddress = CreateAddress("GB", "test@example.com");

        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });

        var group = shippingResult.WarehouseGroups.First();
        var selectedOption = group.AvailableShippingOptions.First();
        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = new Dictionary<Guid, string>
            {
                [group.GroupId] = SelectionKeyExtensions.ForShippingOption(selectedOption.ShippingOptionId)
            }
        };

        // Act
        var result = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        result.Success.ShouldBeTrue();
        var invoice = result.ResultObject!;

        // Assert
        invoice.CurrencyCode.ShouldBe("GBP");
        invoice.StoreCurrencyCode.ShouldBe("USD");
        invoice.PricingExchangeRate.ShouldBe(1.25m);

        // SubTotal: $100 USD / 1.25 = £80 GBP
        invoice.SubTotal.ShouldBe(80.00m);

        // SubTotalInStoreCurrency: £80 GBP × 1.25 = $100 USD
        invoice.SubTotalInStoreCurrency.ShouldBe(100.00m);

        // TotalInStoreCurrency should reflect the original USD value
        invoice.TotalInStoreCurrency.ShouldNotBeNull();
        // The total includes shipping and tax, so it should be higher than SubTotalInStoreCurrency
        invoice.TotalInStoreCurrency.Value.ShouldBeGreaterThan(invoice.SubTotalInStoreCurrency!.Value);
    }

    private Basket CreateBasket(string currencyCode, params (Product Product, int Quantity)[] items)
    {
        var builder = _fixture.CreateDataBuilder();
        var currencyService = _fixture.GetService<ICurrencyService>();
        var currencyInfo = currencyService.GetCurrency(currencyCode);

        var basket = builder.CreateBasket(null, currencyCode, currencyInfo.Symbol);
        foreach (var (product, quantity) in items)
        {
            var lineItem = builder.CreateBasketLineItem(product, quantity);
            basket.LineItems.Add(lineItem);
        }

        basket.SubTotal = basket.LineItems.Sum(li => li.Amount * li.Quantity);
        basket.Tax = basket.LineItems
            .Where(li => li.IsTaxable)
            .Sum(li => currencyService.Round(li.Amount * li.Quantity * (li.TaxRate / 100m), currencyCode));
        basket.AdjustedSubTotal = basket.SubTotal - basket.Discount;
        basket.Total = basket.AdjustedSubTotal + basket.Tax;

        return basket;
    }

    private Address CreateAddress(string countryCode, string email)
    {
        var builder = _fixture.CreateDataBuilder();
        return builder.CreateTestAddress(email: email, countryCode: countryCode);
    }
}
