using Merchello.Core.Checkout.Dtos;

namespace Merchello.Core.Checkout.Services.Interfaces;

/// <summary>
/// Service for validating checkout-related data.
/// </summary>
public interface ICheckoutValidator
{
    /// <summary>
    /// Validates a checkout address request including email and billing/shipping addresses.
    /// </summary>
    /// <param name="request">The save addresses request to validate.</param>
    /// <returns>Dictionary of validation errors (field key -> error message). Empty if valid.</returns>
    Dictionary<string, string> ValidateAddressRequest(SaveAddressesRequestDto request);

    /// <summary>
    /// Validates a single address.
    /// </summary>
    /// <param name="address">The address to validate.</param>
    /// <param name="prefix">Prefix for error keys (e.g., "billing" or "shipping").</param>
    /// <returns>Dictionary of validation errors (field key -> error message). Empty if valid.</returns>
    Dictionary<string, string> ValidateAddress(CheckoutAddressDto address, string prefix);

    /// <summary>
    /// Validates an email address format.
    /// </summary>
    /// <param name="email">The email to validate.</param>
    /// <returns>True if the email format is valid.</returns>
    bool IsValidEmail(string? email);
}
