namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request DTO for testing vault charge in the backoffice.
/// </summary>
public class TestVaultChargeRequestDto
{
    /// <summary>
    /// The provider-side payment method ID (e.g., Stripe pm_xxx).
    /// </summary>
    public required string ProviderMethodId { get; init; }

    /// <summary>
    /// The provider-side customer ID (e.g., Stripe cus_xxx).
    /// </summary>
    public string? ProviderCustomerId { get; init; }

    /// <summary>
    /// The amount to charge.
    /// </summary>
    public decimal Amount { get; init; } = 10.00m;

    /// <summary>
    /// The currency code (e.g., "USD", "GBP").
    /// </summary>
    public string? CurrencyCode { get; init; }
}
