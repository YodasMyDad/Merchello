using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Payments.Factories;

/// <summary>
/// Factory for creating SavedPaymentMethod instances.
/// </summary>
public class SavedPaymentMethodFactory
{
    /// <summary>
    /// Create a SavedPaymentMethod from a vault confirmation result.
    /// Used for standalone vault flows (e.g., "Add Payment Method" in account settings).
    /// </summary>
    /// <param name="customerId">The Merchello customer ID.</param>
    /// <param name="providerAlias">The payment provider alias.</param>
    /// <param name="result">The vault confirmation result from the provider.</param>
    /// <param name="ipAddress">The IP address for consent tracking.</param>
    /// <param name="setAsDefault">Whether to set this as the default payment method.</param>
    /// <returns>A new SavedPaymentMethod instance.</returns>
    public SavedPaymentMethod CreateFromVaultConfirmation(
        Guid customerId,
        string providerAlias,
        VaultConfirmResult result,
        string? ipAddress = null,
        bool setAsDefault = false)
    {
        var now = DateTime.UtcNow;
        return new SavedPaymentMethod
        {
            Id = GuidExtensions.NewSequentialGuid,
            CustomerId = customerId,
            ProviderAlias = providerAlias,
            ProviderMethodId = result.ProviderMethodId!,
            ProviderCustomerId = result.ProviderCustomerId,
            MethodType = result.MethodType,
            CardBrand = result.CardBrand,
            Last4 = result.Last4,
            ExpiryMonth = result.ExpiryMonth,
            ExpiryYear = result.ExpiryYear,
            DisplayLabel = result.DisplayLabel ?? GenerateDisplayLabel(result),
            IsDefault = setAsDefault,
            IsVerified = true,
            ConsentDateUtc = now,
            ConsentIpAddress = ipAddress,
            DateCreated = now,
            DateUpdated = now,
            ExtendedData = result.ExtendedData ?? []
        };
    }

    /// <summary>
    /// Create a SavedPaymentMethod from checkout parameters.
    /// Used when customer opts to save their payment method during checkout.
    /// </summary>
    /// <param name="parameters">The checkout save parameters.</param>
    /// <returns>A new SavedPaymentMethod instance.</returns>
    public SavedPaymentMethod CreateFromCheckout(SavePaymentMethodFromCheckoutParameters parameters)
    {
        var now = DateTime.UtcNow;
        return new SavedPaymentMethod
        {
            Id = GuidExtensions.NewSequentialGuid,
            CustomerId = parameters.CustomerId,
            ProviderAlias = parameters.ProviderAlias,
            ProviderMethodId = parameters.ProviderMethodId,
            ProviderCustomerId = parameters.ProviderCustomerId,
            MethodType = parameters.MethodType,
            CardBrand = parameters.CardBrand,
            Last4 = parameters.Last4,
            ExpiryMonth = parameters.ExpiryMonth,
            ExpiryYear = parameters.ExpiryYear,
            BillingName = parameters.BillingName,
            BillingEmail = parameters.BillingEmail,
            DisplayLabel = GenerateDisplayLabel(
                parameters.MethodType,
                parameters.CardBrand,
                parameters.Last4,
                parameters.BillingEmail),
            IsDefault = parameters.SetAsDefault,
            IsVerified = true,
            ConsentDateUtc = now,
            ConsentIpAddress = parameters.IpAddress,
            DateCreated = now,
            DateUpdated = now,
            ExtendedData = parameters.ExtendedData ?? []
        };
    }

    /// <summary>
    /// Generate a display label from vault confirmation result.
    /// </summary>
    private static string GenerateDisplayLabel(VaultConfirmResult result) =>
        GenerateDisplayLabel(result.MethodType, result.CardBrand, result.Last4, null);

    /// <summary>
    /// Generate a human-readable display label for a payment method.
    /// </summary>
    private static string GenerateDisplayLabel(
        SavedPaymentMethodType type,
        string? brand,
        string? last4,
        string? email) => type switch
    {
        SavedPaymentMethodType.Card => $"{FormatCardBrand(brand)} ending in {last4}",
        SavedPaymentMethodType.PayPal => $"PayPal - {email ?? "account"}",
        SavedPaymentMethodType.BankAccount => $"Bank account ending in {last4}",
        _ => $"Payment method ending in {last4}"
    };

    /// <summary>
    /// Format a card brand for display.
    /// </summary>
    private static string FormatCardBrand(string? brand) => brand?.ToLowerInvariant() switch
    {
        "visa" => "Visa",
        "mastercard" => "Mastercard",
        "amex" or "american_express" => "American Express",
        "discover" => "Discover",
        "diners" or "diners_club" => "Diners Club",
        "jcb" => "JCB",
        "unionpay" => "UnionPay",
        _ => brand ?? "Card"
    };
}
