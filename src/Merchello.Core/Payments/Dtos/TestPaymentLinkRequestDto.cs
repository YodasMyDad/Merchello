namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to test payment link generation for a provider.
/// </summary>
public class TestPaymentLinkRequestDto
{
    /// <summary>
    /// Test amount for the payment link.
    /// </summary>
    public decimal Amount { get; set; } = 100.00m;
}
