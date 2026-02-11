using System.Text.Json;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Checkout;

/// <summary>
/// Tests for abandoned checkout recovery functionality.
/// These tests verify that:
/// 1. Addresses are properly stored in ExtendedData when tracking abandoned checkouts
/// 2. Addresses are properly restored when recovering from abandoned checkouts
/// 3. Currency is properly restored when recovering from abandoned checkouts
/// </summary>
[Collection("Integration Tests")]
public class AbandonedCheckoutRecoveryTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IAbandonedCheckoutService _abandonedCheckoutService;
    private readonly ICheckoutService _checkoutService;
    private readonly ICurrencyService _currencyService;

    public AbandonedCheckoutRecoveryTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _abandonedCheckoutService = fixture.GetService<IAbandonedCheckoutService>();
        _checkoutService = fixture.GetService<ICheckoutService>();
        _currencyService = fixture.GetService<ICurrencyService>();
    }

    #region Helper Methods

    private async Task<Basket> CreateBasketWithAddressesAsync(string currency = "GBP")
    {
        var builder = _fixture.CreateDataBuilder();
        var taxGroup = builder.CreateTaxGroup("Standard VAT", 20m);
        var productRoot = builder.CreateProductRoot("Test Product", taxGroup);
        var product = builder.CreateProduct("Test Product Variant", productRoot, price: 25.00m);
        product.Sku = "TEST-001";

        await builder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var currencySymbol = _currencyService.GetCurrency(currency).Symbol;
        var basket = _checkoutService.CreateBasket(currency, currencySymbol);

        basket.BillingAddress = builder.CreateTestAddress(
            email: "john@example.com",
            countryCode: "GB",
            firstName: "John",
            lastName: "Smith");
        basket.ShippingAddress = builder.CreateTestAddress(
            email: "john@example.com",
            countryCode: "GB",
            firstName: "John",
            lastName: "Smith");

        var lineItem = _checkoutService.CreateLineItem(product, 1);
        await _checkoutService.AddToBasketAsync(basket, lineItem, "GB");

        return basket;
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

    [Fact]
    public async Task TrackCheckoutActivityAsync_StoresAddressesInExtendedData()
    {
        // Arrange
        var basket = await CreateBasketWithAddressesAsync("GBP");

        // Save basket to database first
        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act - Track checkout activity (this should store addresses in ExtendedData)
        await _abandonedCheckoutService.TrackCheckoutActivityAsync(basket, "john@example.com");

        // Assert - Check that abandoned checkout was created
        var abandonedCheckout = _fixture.DbContext.AbandonedCheckouts
            .FirstOrDefault(ac => ac.BasketId == basket.Id);

        abandonedCheckout.ShouldNotBeNull();
        abandonedCheckout.Email.ShouldBe("john@example.com");
        abandonedCheckout.CurrencyCode.ShouldBe("GBP");
        abandonedCheckout.CustomerName.ShouldBe("John Smith");

        // Check that addresses were stored in ExtendedData
        abandonedCheckout.ExtendedData.ShouldNotBeNull();
        abandonedCheckout.ExtendedData.ContainsKey("BillingAddressJson").ShouldBeTrue();
        abandonedCheckout.ExtendedData.ContainsKey("ShippingAddressJson").ShouldBeTrue();

        // Verify billing address JSON
        var billingJson = abandonedCheckout.ExtendedData["BillingAddressJson"]?.ToString();
        billingJson.ShouldNotBeNullOrEmpty();
        var billingAddress = JsonSerializer.Deserialize<Address>(billingJson);
        billingAddress.ShouldNotBeNull();
        billingAddress.Name.ShouldBe("John Smith");
        billingAddress.Email.ShouldBe("john@example.com");
        billingAddress.AddressOne.ShouldBe("123 Test Street");

        // Verify shipping address JSON
        var shippingJson = abandonedCheckout.ExtendedData["ShippingAddressJson"]?.ToString();
        shippingJson.ShouldNotBeNullOrEmpty();
        var shippingAddress = JsonSerializer.Deserialize<Address>(shippingJson);
        shippingAddress.ShouldNotBeNull();
        shippingAddress.Name.ShouldBe("John Smith");
    }

    [Fact]
    public async Task TrackCheckoutActivityAsync_UpdatesExistingRecordWithNewAddresses()
    {
        // Arrange
        var basket = await CreateBasketWithAddressesAsync("GBP");

        // Save basket to database first
        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // First tracking call
        await _abandonedCheckoutService.TrackCheckoutActivityAsync(basket, "john@example.com");

        // Update basket addresses
        basket.BillingAddress.AddressOne = "456 New Street";
        basket.BillingAddress.TownCity = "Manchester";
        basket.ShippingAddress.AddressOne = "456 New Street";
        basket.ShippingAddress.TownCity = "Manchester";

        // Act - Second tracking call should update the existing record
        await _abandonedCheckoutService.TrackCheckoutActivityAsync(basket, "john@example.com");

        // Assert - Verify addresses were updated
        _fixture.DbContext.ChangeTracker.Clear();
        var abandonedCheckout = _fixture.DbContext.AbandonedCheckouts
            .FirstOrDefault(ac => ac.BasketId == basket.Id);

        abandonedCheckout.ShouldNotBeNull();
        var billingJson = abandonedCheckout.ExtendedData["BillingAddressJson"]?.ToString();
        var billingAddress = JsonSerializer.Deserialize<Address>(billingJson!);
        billingAddress!.AddressOne.ShouldBe("456 New Street");
        billingAddress.TownCity.ShouldBe("Manchester");
    }

    [Fact]
    public async Task RestoreBasketFromRecoveryAsync_RestoresCurrencyFromAbandonedCheckout()
    {
        // Arrange
        var basket = await CreateBasketWithAddressesAsync("GBP");

        // Save basket to database
        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Track checkout and mark as abandoned
        await _abandonedCheckoutService.TrackCheckoutActivityAsync(basket, "john@example.com");

        // Manually set the abandoned checkout to have a recovery token
        var abandonedCheckout = _fixture.DbContext.AbandonedCheckouts
            .First(ac => ac.BasketId == basket.Id);

        abandonedCheckout.Status = AbandonedCheckoutStatus.Abandoned;
        abandonedCheckout.DateAbandoned = DateTime.UtcNow;
        abandonedCheckout.RecoveryToken = "test-recovery-token";
        abandonedCheckout.RecoveryTokenExpiresUtc = DateTime.UtcNow.AddDays(7);
        await _fixture.DbContext.SaveChangesAsync();

        // Clear the basket's currency to simulate it being lost
        _fixture.DbContext.ChangeTracker.Clear();
        var basketToModify = await _fixture.DbContext.Baskets.FindAsync(basket.Id);
        basketToModify!.Currency = null;
        basketToModify.CurrencySymbol = null;
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act - Restore basket from recovery
        var result = await _abandonedCheckoutService.RestoreBasketFromRecoveryAsync("test-recovery-token");

        // Assert
        result.Success.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.Currency.ShouldBe("GBP");
        result.ResultObject.CurrencySymbol.ShouldBe(_currencyService.GetCurrency("GBP").Symbol);
    }

    [Fact]
    public async Task RestoreBasketFromRecoveryAsync_RestoresAddressesFromExtendedData()
    {
        // Arrange
        var basket = await CreateBasketWithAddressesAsync("GBP");

        // Save basket to database
        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Track checkout (this stores addresses in ExtendedData)
        await _abandonedCheckoutService.TrackCheckoutActivityAsync(basket, "john@example.com");

        // Mark as abandoned with recovery token
        var abandonedCheckout = _fixture.DbContext.AbandonedCheckouts
            .First(ac => ac.BasketId == basket.Id);

        abandonedCheckout.Status = AbandonedCheckoutStatus.Abandoned;
        abandonedCheckout.DateAbandoned = DateTime.UtcNow;
        abandonedCheckout.RecoveryToken = "test-recovery-token-2";
        abandonedCheckout.RecoveryTokenExpiresUtc = DateTime.UtcNow.AddDays(7);
        await _fixture.DbContext.SaveChangesAsync();

        // Clear the basket's addresses to simulate session loss
        _fixture.DbContext.ChangeTracker.Clear();
        var basketToModify = await _fixture.DbContext.Baskets.FindAsync(basket.Id);
        basketToModify!.BillingAddress = CreateEmptyAddress(); // Empty address
        basketToModify.ShippingAddress = CreateEmptyAddress(); // Empty address
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act - Restore basket from recovery
        var result = await _abandonedCheckoutService.RestoreBasketFromRecoveryAsync("test-recovery-token-2");

        // Assert
        result.Success.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();

        // Billing address should be restored
        result.ResultObject.BillingAddress.ShouldNotBeNull();
        result.ResultObject.BillingAddress.Name.ShouldBe("John Smith");
        result.ResultObject.BillingAddress.Email.ShouldBe("john@example.com");
        result.ResultObject.BillingAddress.AddressOne.ShouldBe("123 Test Street");
        result.ResultObject.BillingAddress.TownCity.ShouldBe("London");
        result.ResultObject.BillingAddress.CountryCode.ShouldBe("GB");

        // Shipping address should be restored
        result.ResultObject.ShippingAddress.ShouldNotBeNull();
        result.ResultObject.ShippingAddress.Name.ShouldBe("John Smith");
        result.ResultObject.ShippingAddress.CountryCode.ShouldBe("GB");
    }

    [Fact]
    public async Task RestoreBasketFromRecoveryAsync_WithExpiredToken_ReturnsError()
    {
        // Arrange
        var basket = await CreateBasketWithAddressesAsync("GBP");

        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        await _abandonedCheckoutService.TrackCheckoutActivityAsync(basket, "john@example.com");

        var abandonedCheckout = _fixture.DbContext.AbandonedCheckouts
            .First(ac => ac.BasketId == basket.Id);

        abandonedCheckout.Status = AbandonedCheckoutStatus.Abandoned;
        abandonedCheckout.DateAbandoned = DateTime.UtcNow;
        abandonedCheckout.RecoveryToken = "expired-token";
        abandonedCheckout.RecoveryTokenExpiresUtc = DateTime.UtcNow.AddDays(-1); // Expired
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _abandonedCheckoutService.RestoreBasketFromRecoveryAsync("expired-token");

        // Assert
        result.Success.ShouldBeFalse();
        result.Messages.Select(m => m.Message).ShouldContain(m => m != null && m.Contains("expired"));
    }

    [Fact]
    public async Task RestoreBasketFromRecoveryAsync_WithInvalidToken_ReturnsError()
    {
        // Act
        var result = await _abandonedCheckoutService.RestoreBasketFromRecoveryAsync("invalid-token");

        // Assert
        result.Success.ShouldBeFalse();
        result.Messages.Select(m => m.Message).ShouldContain(m => m != null && m.Contains("Invalid"));
    }

    [Fact]
    public async Task RestoreBasketFromRecoveryAsync_WithExpiredStatus_ReturnsError()
    {
        var basket = await CreateBasketWithAddressesAsync("GBP");

        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        await _abandonedCheckoutService.TrackCheckoutActivityAsync(basket, "john@example.com");

        var abandonedCheckout = _fixture.DbContext.AbandonedCheckouts.First(ac => ac.BasketId == basket.Id);
        abandonedCheckout.Status = AbandonedCheckoutStatus.Expired;
        abandonedCheckout.DateExpired = DateTime.UtcNow;
        abandonedCheckout.RecoveryToken = "expired-status-token";
        abandonedCheckout.RecoveryTokenExpiresUtc = DateTime.UtcNow.AddDays(7);
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var result = await _abandonedCheckoutService.RestoreBasketFromRecoveryAsync("expired-status-token");

        result.Success.ShouldBeFalse();
        result.Messages.Select(m => m.Message).ShouldContain(m => m != null && m.Contains("expired"));
    }

    [Fact]
    public async Task RestoreBasketFromRecoveryAsync_ReopeningValidLink_IsIdempotent()
    {
        var basket = await CreateBasketWithAddressesAsync("GBP");

        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        await _abandonedCheckoutService.TrackCheckoutActivityAsync(basket, "john@example.com");

        var abandonedCheckout = _fixture.DbContext.AbandonedCheckouts.First(ac => ac.BasketId == basket.Id);
        abandonedCheckout.Status = AbandonedCheckoutStatus.Abandoned;
        abandonedCheckout.DateAbandoned = DateTime.UtcNow;
        abandonedCheckout.RecoveryToken = "idempotent-token";
        abandonedCheckout.RecoveryTokenExpiresUtc = DateTime.UtcNow.AddDays(7);
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var firstRestore = await _abandonedCheckoutService.RestoreBasketFromRecoveryAsync("idempotent-token");
        firstRestore.Success.ShouldBeTrue();

        var afterFirst = await _abandonedCheckoutService.GetByRecoveryTokenAsync("idempotent-token");
        afterFirst.ShouldNotBeNull();
        afterFirst.Status.ShouldBe(AbandonedCheckoutStatus.Recovered);
        var firstRecoveredDate = afterFirst.DateRecovered;
        firstRecoveredDate.ShouldNotBeNull();

        await Task.Delay(50);
        var secondRestore = await _abandonedCheckoutService.RestoreBasketFromRecoveryAsync("idempotent-token");
        secondRestore.Success.ShouldBeTrue();

        var afterSecond = await _abandonedCheckoutService.GetByRecoveryTokenAsync("idempotent-token");
        afterSecond.ShouldNotBeNull();
        afterSecond.Status.ShouldBe(AbandonedCheckoutStatus.Recovered);
        afterSecond.DateRecovered.ShouldBe(firstRecoveredDate.Value);
    }
}
