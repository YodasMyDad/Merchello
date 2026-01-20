namespace Merchello.Core.Payments.Dtos;

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
