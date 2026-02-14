using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Checkout.Services;
using Merchello.Core.Locality.Dtos;
using Merchello.Core.Shipping.Models;
using Microsoft.Extensions.Options;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Checkout.Services;

public class CheckoutValidatorTests
{
    private readonly CheckoutValidator _validator;
    private readonly CheckoutValidator _validatorWithPhoneRequired;

    public CheckoutValidatorTests()
    {
        var settings = Options.Create(new CheckoutSettings { RequirePhone = false });
        _validator = new CheckoutValidator(settings);

        var phoneRequiredSettings = Options.Create(new CheckoutSettings { RequirePhone = true });
        _validatorWithPhoneRequired = new CheckoutValidator(phoneRequiredSettings);
    }

    #region Email Validation

    [Theory]
    [InlineData("user@example.com", true)]
    [InlineData("name@domain.co.uk", true)]
    [InlineData("test.email+tag@sub.domain.com", true)]
    [InlineData("user@localhost.dev", true)]
    [InlineData("", false)]
    [InlineData(null, false)]
    [InlineData("   ", false)]
    [InlineData("notanemail", false)]
    [InlineData("@domain.com", false)]
    [InlineData("user@", false)]
    [InlineData("user@.com", false)]
    [InlineData("user @domain.com", false)]
    public void IsValidEmail_ReturnsExpected(string? email, bool expected)
    {
        _validator.IsValidEmail(email).ShouldBe(expected);
    }

    #endregion

    #region Address Validation

    [Fact]
    public void ValidateAddress_ValidAddress_ReturnsNoErrors()
    {
        var address = CreateValidAddress();

        var errors = _validator.ValidateAddress(address, "billing");

        errors.ShouldBeEmpty();
    }

    [Fact]
    public void ValidateAddress_MissingName_ReturnsError()
    {
        var address = CreateValidAddress();
        address.Name = null;

        var errors = _validator.ValidateAddress(address, "billing");

        errors.ShouldContainKey("billing.name");
    }

    [Fact]
    public void ValidateAddress_MissingAddress1_ReturnsError()
    {
        var address = CreateValidAddress();
        address.AddressOne = "";

        var errors = _validator.ValidateAddress(address, "shipping");

        errors.ShouldContainKey("shipping.addressOne");
    }

    [Fact]
    public void ValidateAddress_MissingCity_ReturnsError()
    {
        var address = CreateValidAddress();
        address.TownCity = null;

        var errors = _validator.ValidateAddress(address, "billing");

        errors.ShouldContainKey("billing.townCity");
    }

    [Fact]
    public void ValidateAddress_MissingCountryCode_ReturnsError()
    {
        var address = CreateValidAddress();
        address.CountryCode = "";

        var errors = _validator.ValidateAddress(address, "billing");

        errors.ShouldContainKey("billing.countryCode");
    }

    [Fact]
    public void ValidateAddress_MissingPostalCode_ReturnsError()
    {
        var address = CreateValidAddress();
        address.PostalCode = null;

        var errors = _validator.ValidateAddress(address, "billing");

        errors.ShouldContainKey("billing.postalCode");
    }

    [Fact]
    public void ValidateAddress_MultipleErrors_ReturnsAll()
    {
        var address = new AddressDto();

        var errors = _validator.ValidateAddress(address, "billing");

        errors.Count.ShouldBeGreaterThanOrEqualTo(4);
        errors.ShouldContainKey("billing.name");
        errors.ShouldContainKey("billing.addressOne");
        errors.ShouldContainKey("billing.townCity");
        errors.ShouldContainKey("billing.countryCode");
        errors.ShouldContainKey("billing.postalCode");
    }

    [Fact]
    public void ValidateAddress_PhoneNotRequired_NoPhoneNoError()
    {
        var address = CreateValidAddress();
        address.Phone = null;

        var errors = _validator.ValidateAddress(address, "billing");

        errors.ShouldNotContainKey("billing.phone");
    }

    [Fact]
    public void ValidateAddress_PhoneRequired_MissingPhone_ReturnsError()
    {
        var address = CreateValidAddress();
        address.Phone = null;

        var errors = _validatorWithPhoneRequired.ValidateAddress(address, "billing");

        errors.ShouldContainKey("billing.phone");
    }

    [Theory]
    [InlineData("+44 1234 567890")]
    [InlineData("(555) 123-4567")]
    [InlineData("+1-800-555-0123")]
    [InlineData("07911 123456")]
    public void ValidateAddress_ValidPhoneFormats_NoError(string phone)
    {
        var address = CreateValidAddress();
        address.Phone = phone;

        var errors = _validator.ValidateAddress(address, "billing");

        errors.ShouldNotContainKey("billing.phone");
    }

    [Theory]
    [InlineData("abc")]
    [InlineData("phone@number")]
    [InlineData("12-34-ab-cd")]
    public void ValidateAddress_InvalidPhoneFormats_ReturnsError(string phone)
    {
        var address = CreateValidAddress();
        address.Phone = phone;

        var errors = _validator.ValidateAddress(address, "billing");

        errors.ShouldContainKey("billing.phone");
    }

    #endregion

    #region Full Request Validation

    [Fact]
    public void ValidateAddressRequest_ValidRequest_ReturnsNoErrors()
    {
        var request = new SaveAddressesRequestDto
        {
            Email = "customer@example.com",
            BillingAddress = CreateValidAddress(),
            ShippingSameAsBilling = true
        };

        var errors = _validator.ValidateAddressRequest(request);

        errors.ShouldBeEmpty();
    }

    [Fact]
    public void ValidateAddressRequest_MissingEmail_ReturnsError()
    {
        var request = new SaveAddressesRequestDto
        {
            Email = "",
            BillingAddress = CreateValidAddress(),
            ShippingSameAsBilling = true
        };

        var errors = _validator.ValidateAddressRequest(request);

        errors.ShouldContainKey("email");
        errors["email"].ShouldContain("required");
    }

    [Fact]
    public void ValidateAddressRequest_InvalidEmail_ReturnsError()
    {
        var request = new SaveAddressesRequestDto
        {
            Email = "not-an-email",
            BillingAddress = CreateValidAddress(),
            ShippingSameAsBilling = true
        };

        var errors = _validator.ValidateAddressRequest(request);

        errors.ShouldContainKey("email");
        errors["email"].ShouldContain("valid email");
    }

    [Fact]
    public void ValidateAddressRequest_NullBillingAddress_ReturnsError()
    {
        var request = new SaveAddressesRequestDto
        {
            Email = "test@example.com",
            BillingAddress = null!,
            ShippingSameAsBilling = true
        };

        var errors = _validator.ValidateAddressRequest(request);

        errors.ShouldContainKey("billingAddress");
    }

    [Fact]
    public void ValidateAddressRequest_ShippingSameAsBilling_SkipsShippingValidation()
    {
        var request = new SaveAddressesRequestDto
        {
            Email = "test@example.com",
            BillingAddress = CreateValidAddress(),
            ShippingSameAsBilling = true,
            ShippingAddress = new AddressDto() // Invalid but should be ignored
        };

        var errors = _validator.ValidateAddressRequest(request);

        errors.ShouldBeEmpty();
    }

    [Fact]
    public void ValidateAddressRequest_SeparateShipping_ValidatesShippingAddress()
    {
        var request = new SaveAddressesRequestDto
        {
            Email = "test@example.com",
            BillingAddress = CreateValidAddress(),
            ShippingSameAsBilling = false,
            ShippingAddress = new AddressDto { Name = "Test" } // Missing fields
        };

        var errors = _validator.ValidateAddressRequest(request);

        errors.ShouldContainKey("shipping.addressOne");
        errors.ShouldContainKey("shipping.townCity");
        errors.ShouldContainKey("shipping.countryCode");
        errors.ShouldContainKey("shipping.postalCode");
    }

    [Fact]
    public void ValidateAddressRequest_SeparateShipping_ValidAddress_NoErrors()
    {
        var request = new SaveAddressesRequestDto
        {
            Email = "test@example.com",
            BillingAddress = CreateValidAddress(),
            ShippingSameAsBilling = false,
            ShippingAddress = CreateValidAddress()
        };

        var errors = _validator.ValidateAddressRequest(request);

        errors.ShouldBeEmpty();
    }

    #endregion

    #region Shipping Selection Validation

    [Fact]
    public void ValidateShippingSelections_GroupWithoutShippingOptions_ReturnsUnavailableError()
    {
        var groupId = Guid.NewGuid();
        var groups = new List<OrderGroup>
        {
            new()
            {
                GroupId = groupId,
                GroupName = "Shipment from Main Warehouse",
                AvailableShippingOptions = []
            }
        };

        var errors = _validator.ValidateShippingSelections(groups, []);

        errors.ShouldContainKey(groupId.ToString());
        errors[groupId.ToString()].ShouldContain("No shipping methods are available");
    }

    [Fact]
    public void ValidateShippingSelections_MissingSelection_ReturnsSelectShippingError()
    {
        var option = new ShippingOptionInfo
        {
            ShippingOptionId = Guid.NewGuid(),
            Name = "Standard Shipping",
            Cost = 5m
        };

        var groupId = Guid.NewGuid();
        var groups = new List<OrderGroup>
        {
            new()
            {
                GroupId = groupId,
                GroupName = "Shipment from Main Warehouse",
                AvailableShippingOptions = [option]
            }
        };

        var errors = _validator.ValidateShippingSelections(groups, []);

        errors.ShouldContainKey(groupId.ToString());
        errors[groupId.ToString()].ShouldContain("Please select a shipping method");
    }

    [Fact]
    public void ValidateShippingSelections_ValidSelection_ReturnsNoErrors()
    {
        var option = new ShippingOptionInfo
        {
            ShippingOptionId = Guid.NewGuid(),
            Name = "Standard Shipping",
            Cost = 5m
        };

        var groupId = Guid.NewGuid();
        var groups = new List<OrderGroup>
        {
            new()
            {
                GroupId = groupId,
                GroupName = "Shipment from Main Warehouse",
                AvailableShippingOptions = [option]
            }
        };

        var selections = new Dictionary<Guid, string>
        {
            [groupId] = option.SelectionKey
        };

        var errors = _validator.ValidateShippingSelections(groups, selections);

        errors.ShouldBeEmpty();
    }

    #endregion

    #region Prefix Isolation

    [Fact]
    public void ValidateAddress_UsesCorrectPrefix()
    {
        var address = new AddressDto();

        var billingErrors = _validator.ValidateAddress(address, "billing");
        var shippingErrors = _validator.ValidateAddress(address, "shipping");

        billingErrors.Keys.ShouldAllBe(k => k.StartsWith("billing."));
        shippingErrors.Keys.ShouldAllBe(k => k.StartsWith("shipping."));
    }

    #endregion

    private static AddressDto CreateValidAddress() => new()
    {
        Name = "John Doe",
        AddressOne = "123 Main Street",
        TownCity = "London",
        CountryCode = "GB",
        PostalCode = "SW1A 1AA",
        Phone = "+44 20 7946 0958"
    };
}
