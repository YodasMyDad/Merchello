namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to process a DirectForm payment (e.g., Purchase Order, Manual Payment).
/// Used when the payment method requires form data instead of a payment token.
/// </summary>
public class ProcessDirectPaymentDto
{
    /// <summary>
    /// The invoice ID to process payment for.
    /// Optional for DirectForm - invoice will be created if not provided.
    /// </summary>
    public Guid? InvoiceId { get; set; }

    /// <summary>
    /// The payment provider alias (e.g., "manual")
    /// </summary>
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// The payment method alias within the provider (e.g., "purchaseorder")
    /// </summary>
    public string? MethodAlias { get; set; }

    /// <summary>
    /// Form data from the DirectForm fields (key-value pairs matching CheckoutFormField.Key)
    /// </summary>
    public Dictionary<string, string>? FormData { get; set; }
}
