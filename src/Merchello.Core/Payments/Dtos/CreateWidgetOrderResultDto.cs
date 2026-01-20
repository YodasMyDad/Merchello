namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Response from creating a widget order.
/// Used by providers implementing the create-order/capture pattern.
/// </summary>
public class CreateWidgetOrderResultDto
{
    /// <summary>
    /// Whether the order was created successfully.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The provider-specific order ID to return to the SDK.
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
