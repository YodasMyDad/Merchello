using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Locality.Models;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Checkout.Services;

/// <summary>
/// Integration tests for CheckoutSessionService - manages checkout session state
/// including addresses, shipping selections, and basket persistence.
/// </summary>
[Collection("Integration")]
public class CheckoutSessionServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICheckoutSessionService _sessionService;

    public CheckoutSessionServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.MockHttpContext.ClearSession();
        _sessionService = fixture.GetService<ICheckoutSessionService>();
    }

    #region GetSession Tests

    [Fact]
    public async Task GetSession_NewBasketId_CreatesNewSession()
    {
        // Arrange
        var basketId = Guid.NewGuid();

        // Act
        var session = await _sessionService.GetSessionAsync(basketId);

        // Assert
        session.ShouldNotBeNull();
        session.BasketId.ShouldBe(basketId);
        session.CurrentStep.ShouldBe(CheckoutStep.Information);
        session.SelectedShippingOptions.ShouldBeEmpty();
        session.BillingAddress.ShouldNotBeNull();
        session.ShippingAddress.ShouldNotBeNull();
    }

    [Fact]
    public async Task GetSession_SameBasketId_ReturnsSameSession()
    {
        // Arrange
        var basketId = Guid.NewGuid();

        // Act
        var session1 = await _sessionService.GetSessionAsync(basketId);
        var session2 = await _sessionService.GetSessionAsync(basketId);

        // Assert
        session1.BasketId.ShouldBe(session2.BasketId);
        session1.CurrentStep.ShouldBe(session2.CurrentStep);
    }

    #endregion

    #region SaveAddresses Tests

    [Fact]
    public async Task SaveAddresses_StoresBillingAddress()
    {
        // Arrange
        var basketId = Guid.NewGuid();
        var billing = new Address
        {
            Name = "John Doe",
            Email = "john@example.com",
            AddressOne = "123 Main St",
            TownCity = "Springfield",
            CountryCode = "US",
            PostalCode = "62701",
            Phone = "555-1234"
        };

        // Act
        await _sessionService.SaveAddressesAsync(new SaveSessionAddressesParameters
        {
            BasketId = basketId,
            Billing = billing,
            SameAsBilling = true
        });

        // Assert
        var session = await _sessionService.GetSessionAsync(basketId);
        session.BillingAddress.ShouldNotBeNull();
        session.BillingAddress.Name.ShouldBe("John Doe");
        session.BillingAddress.Email.ShouldBe("john@example.com");
        session.BillingAddress.AddressOne.ShouldBe("123 Main St");
        session.BillingAddress.TownCity.ShouldBe("Springfield");
        session.BillingAddress.CountryCode.ShouldBe("US");
        session.BillingAddress.PostalCode.ShouldBe("62701");
        session.BillingAddress.Phone.ShouldBe("555-1234");
    }

    [Fact]
    public async Task SaveAddresses_WithShippingAddress_StoresBoth()
    {
        // Arrange
        var basketId = Guid.NewGuid();
        var billing = new Address
        {
            Name = "John Doe",
            Email = "john@example.com",
            AddressOne = "123 Main St",
            TownCity = "Springfield",
            CountryCode = "US",
            PostalCode = "62701"
        };
        var shipping = new Address
        {
            Name = "Jane Smith",
            AddressOne = "456 Oak Ave",
            TownCity = "Portland",
            CountryCode = "US",
            PostalCode = "97201"
        };

        // Act
        await _sessionService.SaveAddressesAsync(new SaveSessionAddressesParameters
        {
            BasketId = basketId,
            Billing = billing,
            Shipping = shipping,
            SameAsBilling = false
        });

        // Assert
        var session = await _sessionService.GetSessionAsync(basketId);
        session.BillingAddress.Name.ShouldBe("John Doe");
        session.BillingAddress.AddressOne.ShouldBe("123 Main St");
        session.ShippingAddress.Name.ShouldBe("Jane Smith");
        session.ShippingAddress.AddressOne.ShouldBe("456 Oak Ave");
        session.ShippingAddress.TownCity.ShouldBe("Portland");
        session.ShippingSameAsBilling.ShouldBeFalse();
    }

    [Fact]
    public async Task SaveAddresses_WithSameAsBilling_CopiesBillingToShipping()
    {
        // Arrange
        var basketId = Guid.NewGuid();
        var billing = new Address
        {
            Name = "John Doe",
            Email = "john@example.com",
            AddressOne = "123 Main St",
            TownCity = "Springfield",
            CountryCode = "US",
            PostalCode = "62701"
        };

        // Act
        await _sessionService.SaveAddressesAsync(new SaveSessionAddressesParameters
        {
            BasketId = basketId,
            Billing = billing,
            SameAsBilling = true
        });

        // Assert
        var session = await _sessionService.GetSessionAsync(basketId);
        session.ShippingSameAsBilling.ShouldBeTrue();
        session.ShippingAddress.Name.ShouldBe("John Doe");
        session.ShippingAddress.AddressOne.ShouldBe("123 Main St");
        session.ShippingAddress.TownCity.ShouldBe("Springfield");
        session.ShippingAddress.CountryCode.ShouldBe("US");
        session.ShippingAddress.PostalCode.ShouldBe("62701");
    }

    #endregion

    #region SetCurrentStep Tests

    [Fact]
    public async Task SetCurrentStep_UpdatesStep()
    {
        // Arrange
        var basketId = Guid.NewGuid();
        await _sessionService.GetSessionAsync(basketId);

        // Act
        await _sessionService.SetCurrentStepAsync(basketId, CheckoutStep.Shipping);

        // Assert
        var session = await _sessionService.GetSessionAsync(basketId);
        session.CurrentStep.ShouldBe(CheckoutStep.Shipping);
    }

    #endregion

    #region SaveShippingSelections Tests

    [Fact]
    public async Task SaveShippingSelections_StoresSelections()
    {
        // Arrange
        var basketId = Guid.NewGuid();
        await _sessionService.GetSessionAsync(basketId);

        var groupId1 = Guid.NewGuid();
        var groupId2 = Guid.NewGuid();
        var selections = new Dictionary<Guid, string>
        {
            { groupId1, "so:00000000-0000-0000-0000-000000000001" },
            { groupId2, "dyn:fedex:GROUND" }
        };
        var quotedCosts = new Dictionary<Guid, QuotedShippingCost>
        {
            { groupId1, new QuotedShippingCost(5.00m, DateTime.UtcNow) },
            { groupId2, new QuotedShippingCost(12.50m, DateTime.UtcNow) }
        };

        // Act
        await _sessionService.SaveShippingSelectionsAsync(new SaveSessionShippingSelectionsParameters
        {
            BasketId = basketId,
            Selections = selections,
            QuotedCosts = quotedCosts
        });

        // Assert
        var session = await _sessionService.GetSessionAsync(basketId);
        session.SelectedShippingOptions.Count.ShouldBe(2);
        session.SelectedShippingOptions[groupId1].ShouldBe("so:00000000-0000-0000-0000-000000000001");
        session.SelectedShippingOptions[groupId2].ShouldBe("dyn:fedex:GROUND");
        session.QuotedShippingCosts.Count.ShouldBe(2);
        session.QuotedShippingCosts[groupId1].Cost.ShouldBe(5.00m);
        session.QuotedShippingCosts[groupId2].Cost.ShouldBe(12.50m);
    }

    #endregion

    #region ClearSession Tests

    [Fact]
    public async Task ClearSession_RemovesSessionData()
    {
        // Arrange
        var basketId = Guid.NewGuid();
        var billing = new Address
        {
            Name = "John Doe",
            Email = "john@example.com",
            AddressOne = "123 Main St",
            TownCity = "Springfield",
            CountryCode = "US",
            PostalCode = "62701"
        };
        await _sessionService.SaveAddressesAsync(new SaveSessionAddressesParameters
        {
            BasketId = basketId,
            Billing = billing,
            SameAsBilling = true
        });
        await _sessionService.SetCurrentStepAsync(basketId, CheckoutStep.Payment);

        // Act
        await _sessionService.ClearSessionAsync(basketId);

        // Assert - getting the session after clear should return a fresh session
        var session = await _sessionService.GetSessionAsync(basketId);
        session.CurrentStep.ShouldBe(CheckoutStep.Information);
        session.BillingAddress.Name.ShouldBeNullOrEmpty();
        session.SelectedShippingOptions.ShouldBeEmpty();
    }

    #endregion

    #region SaveEmail Tests

    [Fact]
    public async Task SaveEmail_StoresEmailWithoutClearingShipping()
    {
        // Arrange
        var basketId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var selections = new Dictionary<Guid, string>
        {
            { groupId, "dyn:ups:03" }
        };
        await _sessionService.SaveShippingSelectionsAsync(new SaveSessionShippingSelectionsParameters
        {
            BasketId = basketId,
            Selections = selections
        });

        // Act
        await _sessionService.SaveEmailAsync(basketId, "capture@example.com");

        // Assert
        var session = await _sessionService.GetSessionAsync(basketId);
        session.BillingAddress.Email.ShouldBe("capture@example.com");
        session.SelectedShippingOptions.Count.ShouldBe(1);
        session.SelectedShippingOptions[groupId].ShouldBe("dyn:ups:03");
    }

    #endregion

    #region Basket Session Roundtrip Tests

    [Fact]
    public void SaveBasketToSession_AndGetBasketFromSession_Roundtrips()
    {
        // Arrange
        var basket = new Basket
        {
            Id = Guid.NewGuid(),
            Currency = "USD",
            CustomerId = Guid.NewGuid(),
            LineItems = []
        };

        // Act
        _sessionService.SaveBasketToSession(basket);
        var retrieved = _sessionService.GetBasketFromSession();

        // Assert
        retrieved.ShouldNotBeNull();
        retrieved.Id.ShouldBe(basket.Id);
        retrieved.Currency.ShouldBe("USD");
        retrieved.CustomerId.ShouldBe(basket.CustomerId);
    }

    #endregion

    #region SetInvoiceId Tests

    [Fact]
    public async Task SetInvoiceId_StoresInvoiceId()
    {
        // Arrange
        var basketId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        await _sessionService.GetSessionAsync(basketId);

        // Act
        await _sessionService.SetInvoiceIdAsync(basketId, invoiceId);

        // Assert
        var session = await _sessionService.GetSessionAsync(basketId);
        session.InvoiceId.ShouldBe(invoiceId);
    }

    #endregion
}
