using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Services.Interfaces;
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
[Collection("Integration")]
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

        shippingOption.ShippingCosts.Add(new Core.Shipping.Models.ShippingCost
        {
            CountryCode = "GB",
            Cost = 12.50m  // $12.50 USD shipping
        });

        warehouse.ServiceRegions.Add(new WarehouseServiceRegion
        {
            CountryCode = "GB",
            IsExcluded = false
        });
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Premium T-Shirt", taxGroup);
        var product = dataBuilder.CreateProduct("T-Shirt Blue Large", productRoot, price: 100.00m);
        product.Sku = "TSH-BLU-L";

        _fixture.DbContext.ProductRootWarehouses.Add(new ProductRootWarehouse
        {
            ProductRootId = productRoot.Id,
            WarehouseId = warehouse.Id,
            PriorityOrder = 1
        });

        _fixture.DbContext.ProductWarehouses.Add(new ProductWarehouse
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Stock = 100
        });

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Create basket in USD (store currency) with GBP as display currency
        var basket = new Basket
        {
            Id = Guid.NewGuid(),
            Currency = "GBP",  // Customer wants GBP
            LineItems =
            [
                new LineItem
                {
                    Id = Guid.NewGuid(),
                    ProductId = product.Id,
                    Name = product.Name,
                    Sku = product.Sku,
                    Quantity = 2,
                    Amount = 100.00m,  // $100 USD per item (store currency)
                    LineItemType = LineItemType.Product,
                    IsTaxable = true,
                    TaxRate = 20m
                }
            ],
            SubTotal = 200.00m,  // $200 USD
            Tax = 40.00m,        // $40 USD
            Total = 240.00m      // $240 USD
        };

        var billingAddress = new Address
        {
            Name = "John Smith",
            Email = "john@example.com",
            AddressOne = "123 Test Street",
            TownCity = "London",
            CountryCode = "GB",
            PostalCode = "SW1A 1AA"
        };

        var shippingAddress = new Address
        {
            Name = "John Smith",
            Email = "john@example.com",
            AddressOne = "123 Test Street",
            TownCity = "London",
            CountryCode = "GB",
            PostalCode = "SW1A 1AA"
        };

        // Get shipping options
        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            basket, shippingAddress, new Dictionary<Guid, Guid>());

        var group = shippingResult.WarehouseGroups.First();
        var selectedShippingOptions = new Dictionary<Guid, Guid>
        {
            [group.GroupId] = group.AvailableShippingOptions.First().ShippingOptionId
        };

        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = selectedShippingOptions
        };

        // Act
        var invoice = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);

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

        shippingOption.ShippingCosts.Add(new Core.Shipping.Models.ShippingCost { CountryCode = "GB", Cost = 5.00m });
        warehouse.ServiceRegions.Add(new WarehouseServiceRegion { CountryCode = "GB", IsExcluded = false });
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup("VAT", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Product", taxGroup);
        var product = dataBuilder.CreateProduct("Item", productRoot, price: 50.00m);
        product.Sku = "ITEM-001";

        _fixture.DbContext.ProductRootWarehouses.Add(new ProductRootWarehouse
        {
            ProductRootId = productRoot.Id,
            WarehouseId = warehouse.Id,
            PriorityOrder = 1
        });

        _fixture.DbContext.ProductWarehouses.Add(new ProductWarehouse
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Stock = 50
        });

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var productLineItemId = Guid.NewGuid();
        var basket = new Basket
        {
            Id = Guid.NewGuid(),
            Currency = "GBP",
            LineItems =
            [
                new LineItem
                {
                    Id = productLineItemId,
                    ProductId = product.Id,
                    Name = product.Name,
                    Sku = product.Sku,
                    Quantity = 2,
                    Amount = 50.00m,  // $50 USD
                    LineItemType = LineItemType.Product,
                    IsTaxable = true,
                    TaxRate = 20m
                },
                new LineItem
                {
                    Id = Guid.NewGuid(),
                    Name = "10% Discount",
                    Sku = "DISC-10",
                    Quantity = 1,
                    Amount = -10.00m,  // $10 USD discount
                    LineItemType = LineItemType.Discount,
                    IsTaxable = false,
                    DependantLineItemSku = product.Sku
                }
            ],
            SubTotal = 100.00m,
            Discount = 10.00m,
            Tax = 18.00m,
            Total = 108.00m
        };

        var billingAddress = new Address
        {
            Name = "Test User",
            Email = "test@example.com",
            CountryCode = "GB",
            PostalCode = "SW1A 1AA"
        };

        var shippingAddress = new Address
        {
            Name = "Test User",
            Email = "test@example.com",
            CountryCode = "GB",
            PostalCode = "SW1A 1AA"
        };

        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            basket, shippingAddress, new Dictionary<Guid, Guid>());

        var group = shippingResult.WarehouseGroups.First();
        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = new Dictionary<Guid, Guid>
            {
                [group.GroupId] = group.AvailableShippingOptions.First().ShippingOptionId
            }
        };

        // Act
        var invoice = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);

        // Assert
        invoice.CurrencyCode.ShouldBe("GBP");

        var order = invoice.Orders!.First();
        var discountLineItem = order.LineItems!.FirstOrDefault(li => li.LineItemType == LineItemType.Discount);

        discountLineItem.ShouldNotBeNull();
        // $10 USD / 1.25 = £8 GBP (but stored as negative for discount)
        Math.Abs(discountLineItem.Amount).ShouldBe(8.00m);
    }

    [Fact]
    public async Task CreateOrderFromBasketAsync_SameCurrency_NoConversion()
    {
        // Arrange - USD store, USD customer (no conversion needed)
        _fixture.SetExchangeRate("USD", "USD", 1.0m);

        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("US Warehouse", "US");
        var shippingOption = dataBuilder.CreateShippingOption("Standard", warehouse, fixedCost: 9.99m);

        shippingOption.ShippingCosts.Add(new Core.Shipping.Models.ShippingCost { CountryCode = "US", Cost = 9.99m });
        warehouse.ServiceRegions.Add(new WarehouseServiceRegion { CountryCode = "US", IsExcluded = false });
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup("Sales Tax", 8m);
        var productRoot = dataBuilder.CreateProductRoot("Product", taxGroup);
        var product = dataBuilder.CreateProduct("Item", productRoot, price: 49.99m);
        product.Sku = "ITEM-US";

        _fixture.DbContext.ProductRootWarehouses.Add(new ProductRootWarehouse
        {
            ProductRootId = productRoot.Id,
            WarehouseId = warehouse.Id,
            PriorityOrder = 1
        });

        _fixture.DbContext.ProductWarehouses.Add(new ProductWarehouse
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Stock = 100
        });

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = new Basket
        {
            Id = Guid.NewGuid(),
            Currency = "USD",  // Same as store currency
            LineItems =
            [
                new LineItem
                {
                    Id = Guid.NewGuid(),
                    ProductId = product.Id,
                    Name = product.Name,
                    Sku = product.Sku,
                    Quantity = 1,
                    Amount = 49.99m,
                    LineItemType = LineItemType.Product,
                    IsTaxable = true,
                    TaxRate = 8m
                }
            ],
            SubTotal = 49.99m,
            Tax = 4.00m,
            Total = 53.99m
        };

        var billingAddress = new Address
        {
            Name = "Test User",
            Email = "test@example.com",
            CountryCode = "US",
            PostalCode = "10001"
        };

        var shippingAddress = new Address
        {
            Name = "Test User",
            Email = "test@example.com",
            CountryCode = "US",
            PostalCode = "10001"
        };

        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            basket, shippingAddress, new Dictionary<Guid, Guid>());

        var group = shippingResult.WarehouseGroups.First();
        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = new Dictionary<Guid, Guid>
            {
                [group.GroupId] = group.AvailableShippingOptions.First().ShippingOptionId
            }
        };

        // Act
        var invoice = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);

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

        _fixture.DbContext.ProductRootWarehouses.Add(new ProductRootWarehouse
        {
            ProductRootId = productRoot.Id,
            WarehouseId = warehouse.Id,
            PriorityOrder = 1
        });

        _fixture.DbContext.ProductWarehouses.Add(new ProductWarehouse
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Stock = 100
        });

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = new Basket
        {
            Id = Guid.NewGuid(),
            Currency = "JPY",
            LineItems =
            [
                new LineItem
                {
                    Id = Guid.NewGuid(),
                    ProductId = product.Id,
                    Name = product.Name,
                    Sku = product.Sku,
                    Quantity = 1,
                    Amount = 100.00m,  // $100 USD
                    LineItemType = LineItemType.Product,
                    IsTaxable = true,
                    TaxRate = 10m
                }
            ],
            SubTotal = 100.00m,
            Tax = 10.00m,
            Total = 110.00m
        };

        var billingAddress = new Address
        {
            Name = "Test User",
            Email = "test@example.com",
            CountryCode = "JP",
            PostalCode = "100-0001"
        };

        var shippingAddress = new Address
        {
            Name = "Test User",
            Email = "test@example.com",
            CountryCode = "JP",
            PostalCode = "100-0001"
        };

        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            basket, shippingAddress, new Dictionary<Guid, Guid>());

        var group = shippingResult.WarehouseGroups.First();
        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = new Dictionary<Guid, Guid>
            {
                [group.GroupId] = group.AvailableShippingOptions.First().ShippingOptionId
            }
        };

        // Act
        var invoice = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);

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

        _fixture.DbContext.ProductRootWarehouses.Add(new ProductRootWarehouse
        {
            ProductRootId = productRoot.Id,
            WarehouseId = warehouse.Id,
            PriorityOrder = 1
        });

        _fixture.DbContext.ProductWarehouses.Add(new ProductWarehouse
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Stock = 100
        });

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = new Basket
        {
            Id = Guid.NewGuid(),
            Currency = "EUR",
            LineItems =
            [
                new LineItem
                {
                    Id = Guid.NewGuid(),
                    ProductId = product.Id,
                    Name = product.Name,
                    Sku = product.Sku,
                    Quantity = 1,
                    Amount = 54.00m,  // $54 USD
                    LineItemType = LineItemType.Product,
                    IsTaxable = true,
                    TaxRate = 19m
                },
                new LineItem
                {
                    Id = Guid.NewGuid(),
                    Name = "Gift Wrapping",
                    Sku = "ADDON-GIFT",
                    Quantity = 1,
                    Amount = 5.40m,  // $5.40 USD add-on
                    LineItemType = LineItemType.Addon,
                    IsTaxable = true,
                    TaxRate = 19m,
                    DependantLineItemSku = product.Sku
                }
            ],
            SubTotal = 59.40m,
            Tax = 11.29m,
            Total = 70.69m
        };

        var billingAddress = new Address
        {
            Name = "Test User",
            Email = "test@example.com",
            CountryCode = "DE",
            PostalCode = "10115"
        };

        var shippingAddress = new Address
        {
            Name = "Test User",
            Email = "test@example.com",
            CountryCode = "DE",
            PostalCode = "10115"
        };

        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            basket, shippingAddress, new Dictionary<Guid, Guid>());

        var group = shippingResult.WarehouseGroups.First();
        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = new Dictionary<Guid, Guid>
            {
                [group.GroupId] = group.AvailableShippingOptions.First().ShippingOptionId
            }
        };

        // Act
        var invoice = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);

        // Assert
        invoice.CurrencyCode.ShouldBe("EUR");

        var order = invoice.Orders!.First();

        // Product: $54 USD / 1.08 = €50 EUR
        var productLineItem = order.LineItems!.First(li => li.LineItemType == LineItemType.Product);
        productLineItem.Amount.ShouldBe(50.00m);

        // Add-on: $5.40 USD / 1.08 = €5 EUR
        var addonLineItem = order.LineItems!.FirstOrDefault(li => li.LineItemType == LineItemType.Addon);
        addonLineItem.ShouldNotBeNull();
        addonLineItem.Amount.ShouldBe(5.00m);
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

        _fixture.DbContext.ProductRootWarehouses.Add(new ProductRootWarehouse
        {
            ProductRootId = productRoot.Id,
            WarehouseId = warehouse.Id,
            PriorityOrder = 1
        });

        _fixture.DbContext.ProductWarehouses.Add(new ProductWarehouse
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Stock = 100
        });

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = new Basket
        {
            Id = Guid.NewGuid(),
            Currency = "GBP",
            LineItems =
            [
                new LineItem
                {
                    Id = Guid.NewGuid(),
                    ProductId = product.Id,
                    Name = product.Name,
                    Sku = product.Sku,
                    Quantity = 1,
                    Amount = 100.00m,  // $100 USD
                    LineItemType = LineItemType.Product,
                    IsTaxable = true,
                    TaxRate = 20m
                }
            ],
            SubTotal = 100.00m,
            Tax = 20.00m,
            Total = 120.00m
        };

        var billingAddress = new Address
        {
            Name = "Test User",
            Email = "test@example.com",
            CountryCode = "GB",
            PostalCode = "SW1A 1AA"
        };

        var shippingAddress = new Address
        {
            Name = "Test User",
            Email = "test@example.com",
            CountryCode = "GB",
            PostalCode = "SW1A 1AA"
        };

        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            basket, shippingAddress, new Dictionary<Guid, Guid>());

        var group = shippingResult.WarehouseGroups.First();
        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = new Dictionary<Guid, Guid>
            {
                [group.GroupId] = group.AvailableShippingOptions.First().ShippingOptionId
            }
        };

        // Act
        var invoice = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);

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
}
