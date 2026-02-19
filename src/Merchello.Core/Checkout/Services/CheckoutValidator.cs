using System.Text.RegularExpressions;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Locality.Dtos;
using Merchello.Core.Settings.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Checkout.Services;

/// <summary>
/// Service for validating checkout-related data.
/// </summary>
public partial class CheckoutValidator(
    IOptions<CheckoutSettings> checkoutSettings,
    IMerchelloStoreSettingsService? storeSettingsService = null) : ICheckoutValidator
{
    private readonly CheckoutSettings _checkoutSettings = checkoutSettings.Value;
    private readonly IMerchelloStoreSettingsService? _storeSettingsService = storeSettingsService;

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
    public Dictionary<string, string> ValidateAddress(AddressDto address, string prefix)
    {
        var errors = new Dictionary<string, string>();

        if (string.IsNullOrWhiteSpace(address.Name))
        {
            errors[$"{prefix}.name"] = "Name is required.";
        }

        if (string.IsNullOrWhiteSpace(address.AddressOne))
        {
            errors[$"{prefix}.addressOne"] = "Address is required.";
        }

        if (string.IsNullOrWhiteSpace(address.TownCity))
        {
            errors[$"{prefix}.townCity"] = "City is required.";
        }

        if (string.IsNullOrWhiteSpace(address.CountryCode))
        {
            errors[$"{prefix}.countryCode"] = "Country is required.";
        }

        if (string.IsNullOrWhiteSpace(address.PostalCode))
        {
            errors[$"{prefix}.postalCode"] = "Postal code is required.";
        }

        // Billing phone can be required by checkout settings.
        if (IsBillingPhoneRequired(prefix) && string.IsNullOrWhiteSpace(address.Phone))
        {
            errors[$"{prefix}.phone"] = "Phone number is required.";
        }
        else if (!string.IsNullOrWhiteSpace(address.Phone) && !PhoneRegex().IsMatch(address.Phone))
        {
            errors[$"{prefix}.phone"] = "Please enter a valid phone number.";
        }

        return errors;
    }

    private bool IsBillingPhoneRequired(string prefix) =>
        (_storeSettingsService?.GetRuntimeSettings().Checkout.BillingPhoneRequired ?? _checkoutSettings.BillingPhoneRequired) &&
        prefix.Equals("billing", StringComparison.OrdinalIgnoreCase);

    /// <inheritdoc />
    public bool IsValidEmail(string? email) =>
        !string.IsNullOrWhiteSpace(email) && EmailRegex().IsMatch(email);

    /// <inheritdoc />
    public Dictionary<string, string> ValidateShippingSelections(List<OrderGroup> groups, Dictionary<Guid, string> selections)
    {
        var errors = new Dictionary<string, string>();

        foreach (var group in groups)
        {
            if (!group.AvailableShippingOptions.Any())
            {
                errors[group.GroupId.ToString()] = $"No shipping methods are available for {group.GroupName}.";
                continue;
            }

            var selectionKey = ResolveSelectionKey(group, selections);

            if (string.IsNullOrEmpty(selectionKey))
            {
                errors[group.GroupId.ToString()] = $"Please select a shipping method for {group.GroupName}.";
                continue;
            }

            if (!group.AvailableShippingOptions.Any(o => o.SelectionKey == selectionKey))
            {
                errors[group.GroupId.ToString()] = $"Invalid shipping option selected for {group.GroupName}.";
            }
        }

        return errors;
    }

    /// <inheritdoc />
    public Dictionary<Guid, string> AugmentShippingSelections(List<OrderGroup> groups, Dictionary<Guid, string> selections)
    {
        var augmented = new Dictionary<Guid, string>(selections);

        foreach (var group in groups)
        {
            var selectedKey = ResolveSelectionKey(group, selections);
            if (string.IsNullOrEmpty(selectedKey)) continue;

            augmented[group.GroupId] = selectedKey;
            if (group.WarehouseId.HasValue)
            {
                augmented[group.WarehouseId.Value] = selectedKey;
            }
        }

        return augmented;
    }

    /// <summary>
    /// Resolves a shipping selection key for a group using multi-fallback lookup:
    /// GroupId, then WarehouseId, then searching available options.
    /// </summary>
    private static string? ResolveSelectionKey(OrderGroup group, Dictionary<Guid, string> selections)
    {
        // Try 1: lookup by GroupId
        if (selections.TryGetValue(group.GroupId, out var foundById) && !string.IsNullOrEmpty(foundById))
            return foundById;

        // Try 2: lookup by WarehouseId
        if (group.WarehouseId.HasValue &&
            selections.TryGetValue(group.WarehouseId.Value, out var foundByWarehouse) &&
            !string.IsNullOrEmpty(foundByWarehouse))
            return foundByWarehouse;

        // Try 3: search all selections for one matching this group's available options
        var availableSelectionKeys = group.AvailableShippingOptions.Select(o => o.SelectionKey).ToHashSet();
        var matchingSelection = selections.FirstOrDefault(kvp =>
            !string.IsNullOrEmpty(kvp.Value) && availableSelectionKeys.Contains(kvp.Value));

        return !string.IsNullOrEmpty(matchingSelection.Value) ? matchingSelection.Value : null;
    }

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase)]
    private static partial Regex EmailRegex();

    [GeneratedRegex(@"^\+?[\d\s\-()]*\d[\d\s\-()]*$")]
    private static partial Regex PhoneRegex();
}
