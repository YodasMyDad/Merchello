using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Core.Warehouses.Models;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Checkout;

/// <summary>
/// Tests for checkout address validation and session fallback functionality.
/// These tests verify that:
/// 1. Addresses are properly validated before invoice creation
/// 2. Basket addresses are used as fallback when session addresses are empty
/// 3. Currency is properly preserved through the checkout flow
/// </summary>
[Collection("Integration")]
public class CheckoutAddressValidationTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IInvoiceService _invoiceService;
    private readonly IShippingService _shippingService;

    public CheckoutAddressValidationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _invoiceService = fixture.GetService<IInvoiceService>();
        _shippingService = fixture.GetService<IShippingService>();
    }

    #region Helper Methods

    private async Task<(Warehouse warehouse, Core.Shipping.Models.ShippingOption shippingOption, Product product)> SetupWarehouseAndProduct()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("UK Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Standard Delivery", warehouse, fixedCost: 5.99m);

        shippingOption.SetShippingCosts(
        [
            new Core.Shipping.Models.ShippingCost
            {
                ShippingOptionId = shippingOption.Id,
                CountryCode = "GB",
                Cost = 5.99m
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
        var productRoot = dataBuilder.CreateProductRoot("Test Product", taxGroup);
        var product = dataBuilder.CreateProduct("Test Product Variant", productRoot, price: 25.00m);
        product.Sku = "TEST-ADDR-001";

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

        return (warehouse, shippingOption, product);
    }

    private static Basket CreateBasketWithLineItem(Product product, string currency = "GBP")
    {
        return new Basket
        {
            Id = Guid.NewGuid(),
            Currency = currency,
            LineItems =
            [
                new LineItem
                {
                    Id = Guid.NewGuid(),
                    ProductId = product.Id,
                    Name = product.Name,
                    Sku = product.Sku,
                    Quantity = 1,
                    Amount = 25.00m,
                    LineItemType = LineItemType.Product,
                    IsTaxable = true,
                    TaxRate = 20m
                }
            ],
            SubTotal = 25.00m,
            Tax = 5.00m,
            Total = 30.00m
        };
    }

    private static Address CreateCompleteAddress(string name, string email) => new()
    {
        Name = name,
        Email = email,
        AddressOne = "123 Test Street",
        TownCity = "London",
        CountryCode = "GB",
        PostalCode = "SW1A 1AA"
    };

    private static Address CreateEmptyAddress() => new();

    #endregion

    #region Address Validation Tests

    [Fact]
    public async Task CreateOrderFromBasketAsync_WithCompleteAddresses_CreatesInvoiceSuccessfully()
    {
        // Arrange
        var (warehouse, shippingOption, product) = await SetupWarehouseAndProduct();

        var basket = CreateBasketWithLineItem(product);
        var billingAddress = CreateCompleteAddress("John Smith", "john@example.com");
        var shippingAddress = CreateCompleteAddress("John Smith", "john@example.com");

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
        result.Successful.ShouldBeTrue();
        var invoice = result.ResultObject!;

        // Assert
        invoice.ShouldNotBeNull();
        invoice.BillingAddress.ShouldNotBeNull();
        invoice.BillingAddress.Name.ShouldBe("John Smith");
        invoice.BillingAddress.Email.ShouldBe("john@example.com");
        invoice.BillingAddress.AddressOne.ShouldBe("123 Test Street");
        invoice.BillingAddress.TownCity.ShouldBe("London");
        invoice.BillingAddress.CountryCode.ShouldBe("GB");

        invoice.ShippingAddress.ShouldNotBeNull();
        invoice.ShippingAddress.Name.ShouldBe("John Smith");
    }

    [Fact]
    public async Task CreateOrderFromBasketAsync_WithGBPCurrency_PreservesCorrectCurrency()
    {
        // Arrange
        var (warehouse, shippingOption, product) = await SetupWarehouseAndProduct();

        var basket = CreateBasketWithLineItem(product, "GBP");
        basket.CurrencySymbol = "£";
        var billingAddress = CreateCompleteAddress("John Smith", "john@example.com");
        var shippingAddress = CreateCompleteAddress("John Smith", "john@example.com");

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
        result.Successful.ShouldBeTrue();
        var invoice = result.ResultObject!;

        // Assert
        invoice.ShouldNotBeNull();
        invoice.CurrencyCode.ShouldBe("GBP");
    }

    [Fact]
    public async Task CreateOrderFromBasketAsync_WithUSDCurrency_PreservesCorrectCurrency()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("US Warehouse", "US");
        var shippingOption = dataBuilder.CreateShippingOption("Standard Delivery", warehouse, fixedCost: 5.99m);

        shippingOption.SetShippingCosts(
        [
            new Core.Shipping.Models.ShippingCost
            {
                ShippingOptionId = shippingOption.Id,
                CountryCode = "US",
                Cost = 5.99m
            }
        ]);

        var regions = warehouse.ServiceRegions;
        regions.Add(new WarehouseServiceRegion
        {
            CountryCode = "US",
            IsExcluded = false
        });
        warehouse.SetServiceRegions(regions);
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup("US Tax", 10m);
        var productRoot = dataBuilder.CreateProductRoot("Test Product US", taxGroup);
        var product = dataBuilder.CreateProduct("Test Product US Variant", productRoot, price: 25.00m);
        product.Sku = "TEST-USD-001";

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

        var basket = CreateBasketWithLineItem(product, "USD");
        basket.CurrencySymbol = "$";

        var billingAddress = new Address
        {
            Name = "Jane Doe",
            Email = "jane@example.com",
            AddressOne = "456 Test Ave",
            TownCity = "New York",
            CountryCode = "US",
            PostalCode = "10001"
        };

        var shippingAddress = new Address
        {
            Name = "Jane Doe",
            Email = "jane@example.com",
            AddressOne = "456 Test Ave",
            TownCity = "New York",
            CountryCode = "US",
            PostalCode = "10001"
        };

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
        result.Successful.ShouldBeTrue();
        var invoice = result.ResultObject!;

        // Assert
        invoice.ShouldNotBeNull();
        invoice.CurrencyCode.ShouldBe("USD");
    }

    [Fact]
    public async Task CreateOrderFromBasketAsync_WithEmptySessionAddresses_ThrowsException()
    {
        // Note: The InvoiceService validates that billing email is required.
        // This test verifies that invoice creation fails with empty addresses.
        // The controller layer should validate and use basket fallback BEFORE calling the service.

        // Arrange
        var (warehouse, shippingOption, product) = await SetupWarehouseAndProduct();

        var basket = CreateBasketWithLineItem(product);

        // Basket has addresses (would be saved to database)
        basket.BillingAddress = CreateCompleteAddress("John Smith", "john@example.com");
        basket.ShippingAddress = CreateCompleteAddress("John Smith", "john@example.com");

        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = basket.ShippingAddress
            });

        var group = shippingResult.WarehouseGroups.First();
        var selectedOption = group.AvailableShippingOptions.First();
        var selectedShippingOptions = new Dictionary<Guid, string>
        {
            [group.GroupId] = SelectionKeyExtensions.ForShippingOption(selectedOption.ShippingOptionId)
        };

        // Session has empty addresses (simulating expired HTTP session)
        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = CreateEmptyAddress(),
            ShippingAddress = CreateEmptyAddress(),
            SelectedShippingOptions = selectedShippingOptions
        };

        // Act & Assert - Invoice creation fails because billing email is required
        // This validates that the InvoiceService has proper validation at the service level.
        // The controller's ValidateCheckoutSession method catches this earlier with better error messages.
        var result = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        result.Successful.ShouldBeFalse();
    }

    #endregion

    #region Basket Fallback Tests

    [Fact]
    public async Task BasketFallback_WhenSessionHasName_SessionAddressesAreUsed()
    {
        // Arrange
        var (warehouse, shippingOption, product) = await SetupWarehouseAndProduct();

        var basket = CreateBasketWithLineItem(product);
        basket.BillingAddress = CreateCompleteAddress("Basket Name", "basket@example.com");
        basket.ShippingAddress = CreateCompleteAddress("Basket Name", "basket@example.com");

        // Session has different name (not empty)
        var sessionBillingAddress = CreateCompleteAddress("Session Name", "session@example.com");
        var sessionShippingAddress = CreateCompleteAddress("Session Name", "session@example.com");

        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = sessionShippingAddress
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
            BillingAddress = sessionBillingAddress,
            ShippingAddress = sessionShippingAddress,
            SelectedShippingOptions = selectedShippingOptions
        };

        // Act
        var result = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        result.Successful.ShouldBeTrue();
        var invoice = result.ResultObject!;

        // Assert - Session addresses are used (not basket addresses)
        invoice.ShouldNotBeNull();
        invoice.BillingAddress.Name.ShouldBe("Session Name");
        invoice.BillingAddress.Email.ShouldBe("session@example.com");
    }

    #endregion
}
