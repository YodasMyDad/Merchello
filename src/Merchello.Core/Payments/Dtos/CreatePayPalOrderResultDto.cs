namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Response from creating a PayPal order.
/// </summary>
public class CreatePayPalOrderResultDto
{
    /// <summary>
    /// Whether the order was created successfully.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The PayPal order ID to return to the PayPal SDK.
    /// </summary>
    public string? OrderId { get; set; }

    /// <summary>
    /// Error message if creation failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Correlation ID for error tracking and support troubleshooting.
    /// Populated when Success is false.
    /// </summary>
    public string? CorrelationId { get; set; }
}
