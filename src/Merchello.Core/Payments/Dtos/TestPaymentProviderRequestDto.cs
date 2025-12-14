namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to test a payment provider configuration
/// </summary>
public class TestPaymentProviderRequestDto
{
    /// <summary>
    /// Test amount (defaults to 100.00)
    /// </summary>
    public decimal Amount { get; set; } = 100.00m;

    /// <summary>
    /// Currency code (uses store default if null)
    /// </summary>
    public string? CurrencyCode { get; set; }
}
