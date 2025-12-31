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

/// <summary>
/// Result from testing payment link generation.
/// </summary>
public class TestPaymentLinkResultDto
{
    /// <summary>
    /// Whether the payment link was successfully created.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The generated payment URL.
    /// </summary>
    public string? PaymentUrl { get; set; }

    /// <summary>
    /// Error message if generation failed.
    /// </summary>
    public string? ErrorMessage { get; set; }
}
