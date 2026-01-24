using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Strategies.Models;

namespace Merchello.Core.Checkout.Services.Interfaces;

/// <summary>
/// Service for validating checkout-related data.
/// </summary>
public interface ICheckoutValidator
{
    /// <summary>
    /// Validates that all order groups have a shipping selection and that selected options are valid.
    /// Uses multi-fallback key matching: GroupId, then WarehouseId, then available options search.
    /// </summary>
    /// <param name="groups">The order groups to validate against.</param>
    /// <param name="selections">The shipping selections (key = GroupId or WarehouseId, value = SelectionKey).</param>
    /// <returns>Dictionary of validation errors (group ID -> error message). Empty if valid.</returns>
    Dictionary<string, string> ValidateShippingSelections(List<OrderGroup> groups, Dictionary<Guid, string> selections);

    /// <summary>
    /// Augments shipping selections with both GroupId and WarehouseId keys for stable lookups.
    /// Ensures selections can be found regardless of GroupId changes between PRE/POST selection modes.
    /// </summary>
    /// <param name="groups">The order groups.</param>
    /// <param name="selections">The original shipping selections.</param>
    /// <returns>Augmented selections dictionary with additional keys.</returns>
    Dictionary<Guid, string> AugmentShippingSelections(List<OrderGroup> groups, Dictionary<Guid, string> selections);

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
