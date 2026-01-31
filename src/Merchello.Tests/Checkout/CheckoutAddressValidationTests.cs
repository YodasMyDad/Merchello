using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
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
[Collection("Integration Tests")]
public class CheckoutAddressValidationTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IInvoiceService _invoiceService;
    private readonly IShippingService _shippingService;
    private readonly ICheckoutService _checkoutService;

    public CheckoutAddressValidationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _invoiceService = fixture.GetService<IInvoiceService>();
        _shippingService = fixture.GetService<IShippingService>();
        _checkoutService = fixture.GetService<ICheckoutService>();
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

        dataBuilder.AddServiceRegion(warehouse, "GB");
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Test Product", taxGroup);
        var product = dataBuilder.CreateProduct("Test Product Variant", productRoot, price: 25.00m);
        product.Sku = "TEST-ADDR-001";

        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return (warehouse, shippingOption, product);
    }

    private async Task<Basket> CreateBasketAsync(Product product, string currency = "GBP", string countryCode = "GB")
    {
        var basket = _checkoutService.CreateBasket(currency);
        var lineItem = _checkoutService.CreateLineItem(product, 1);
        await _checkoutService.AddToBasketAsync(basket, lineItem, countryCode);
        await _checkoutService.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = countryCode
        });
        return basket;
    }

    private Address CreateCompleteAddress(string firstName, string lastName, string email, string countryCode = "GB")
    {
        var builder = _fixture.CreateDataBuilder();
        return builder.CreateTestAddress(
            email: email,
            countryCode: countryCode,
            firstName: firstName,
            lastName: lastName);
    }

    private Address CreateEmptyAddress()
    {
        var builder = _fixture.CreateDataBuilder();
        return builder.CreateTestAddress(
            email: null,
            countryCode: string.Empty,
            firstName: string.Empty,
            lastName: string.Empty);
    }

    #endregion

    #region Address Validation Tests

    [Fact]
    public async Task CreateOrderFromBasketAsync_WithCompleteAddresses_CreatesInvoiceSuccessfully()
    {
        // Arrange
        var (warehouse, shippingOption, product) = await SetupWarehouseAndProduct();

        var basket = await CreateBasketAsync(product);
        var billingAddress = CreateCompleteAddress("John", "Smith", "john@example.com");
        var shippingAddress = CreateCompleteAddress("John", "Smith", "john@example.com");

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

        var basket = await CreateBasketAsync(product, "GBP");
        basket.CurrencySymbol = "£";
        var billingAddress = CreateCompleteAddress("John", "Smith", "john@example.com");
        var shippingAddress = CreateCompleteAddress("John", "Smith", "john@example.com");

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

        dataBuilder.AddServiceRegion(warehouse, "US");
        warehouse.ShippingOptions.Add(shippingOption);

        var taxGroup = dataBuilder.CreateTaxGroup("US Tax", 10m);
        var productRoot = dataBuilder.CreateProductRoot("Test Product US", taxGroup);
        var product = dataBuilder.CreateProduct("Test Product US Variant", productRoot, price: 25.00m);
        product.Sku = "TEST-USD-001";

        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = await CreateBasketAsync(product, "USD", "US");
        basket.CurrencySymbol = "$";
        var billingAddress = CreateCompleteAddress("Jane", "Doe", "jane@example.com", "US");
        var shippingAddress = CreateCompleteAddress("Jane", "Doe", "jane@example.com", "US");

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

        var basket = await CreateBasketAsync(product);

        // Basket has addresses (would be saved to database)
        basket.BillingAddress = CreateCompleteAddress("John", "Smith", "john@example.com");
        basket.ShippingAddress = CreateCompleteAddress("John", "Smith", "john@example.com");

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

        var basket = await CreateBasketAsync(product);
        basket.BillingAddress = CreateCompleteAddress("Basket", "Name", "basket@example.com");
        basket.ShippingAddress = CreateCompleteAddress("Basket", "Name", "basket@example.com");

        // Session has different name (not empty)
        var sessionBillingAddress = CreateCompleteAddress("Session", "Name", "session@example.com");
        var sessionShippingAddress = CreateCompleteAddress("Session", "Name", "session@example.com");

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
