using System.Text.RegularExpressions;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Checkout.Services;

/// <summary>
/// Service for validating checkout-related data.
/// </summary>
public partial class CheckoutValidator(IOptions<CheckoutSettings> checkoutSettings) : ICheckoutValidator
{
    private readonly CheckoutSettings _checkoutSettings = checkoutSettings.Value;

    /// <inheritdoc />
    public Dictionary<string, string> ValidateAddressRequest(SaveAddressesRequestDto request)
    {
        var errors = new Dictionary<string, string>();

        // Email validation
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            errors["email"] = "Email is required.";
        }
        else if (!IsValidEmail(request.Email))
        {
            errors["email"] = "Please enter a valid email address.";
        }

        // Billing address validation
        if (request.BillingAddress == null)
        {
            errors["billingAddress"] = "Billing address is required.";
        }
        else
        {
            var billingErrors = ValidateAddress(request.BillingAddress, "billing");
            foreach (var error in billingErrors)
            {
                errors[error.Key] = error.Value;
            }
        }

        // Shipping address validation (if not same as billing)
        if (!request.ShippingSameAsBilling && request.ShippingAddress != null)
        {
            var shippingErrors = ValidateAddress(request.ShippingAddress, "shipping");
            foreach (var error in shippingErrors)
            {
                errors[error.Key] = error.Value;
            }
        }

        return errors;
    }

    /// <inheritdoc />
    public Dictionary<string, string> ValidateAddress(CheckoutAddressDto address, string prefix)
    {
        var errors = new Dictionary<string, string>();

        if (string.IsNullOrWhiteSpace(address.Name))
        {
            errors[$"{prefix}.name"] = "Name is required.";
        }

        if (string.IsNullOrWhiteSpace(address.Address1))
        {
            errors[$"{prefix}.address1"] = "Address is required.";
        }

        if (string.IsNullOrWhiteSpace(address.City))
        {
            errors[$"{prefix}.city"] = "City is required.";
        }

        if (string.IsNullOrWhiteSpace(address.CountryCode))
        {
            errors[$"{prefix}.countryCode"] = "Country is required.";
        }

        if (string.IsNullOrWhiteSpace(address.PostalCode))
        {
            errors[$"{prefix}.postalCode"] = "Postal code is required.";
        }

        // Optional: Validate phone if required by settings
        if (_checkoutSettings.RequirePhone && string.IsNullOrWhiteSpace(address.Phone))
        {
            errors[$"{prefix}.phone"] = "Phone number is required.";
        }

        return errors;
    }

    /// <inheritdoc />
    public bool IsValidEmail(string? email) =>
        !string.IsNullOrWhiteSpace(email) && EmailRegex().IsMatch(email);

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase)]
    private static partial Regex EmailRegex();
}
