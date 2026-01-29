namespace Merchello.Core.Upsells.Services.Parameters;

/// <summary>
/// Parameters for initializing a post-purchase upsell window after checkout payment.
/// </summary>
public class InitializePostPurchaseParameters
{
    /// <summary>
    /// The invoice that was just paid.
    /// </summary>
    public required Guid InvoiceId { get; init; }

    /// <summary>
    /// The payment provider alias (e.g., "stripe", "braintree").
    /// </summary>
    public required string ProviderAlias { get; init; }

    /// <summary>
    /// Optional saved payment method ID. If null, the customer's default method is used.
    /// </summary>
    public Guid? SavedPaymentMethodId { get; init; }
}
