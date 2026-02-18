namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Result payload for explicit fulfilment release actions.
/// </summary>
public class ReleaseFulfillmentResultDto
{
    /// <summary>
    /// Released order id.
    /// </summary>
    public Guid OrderId { get; set; }

    /// <summary>
    /// True when this call submitted the order to the provider.
    /// </summary>
    public bool Released { get; set; }

    /// <summary>
    /// True when the order had already been submitted before this call.
    /// </summary>
    public bool AlreadyReleased { get; set; }

    /// <summary>
    /// Human-readable result message.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Provider reference for the submitted order.
    /// </summary>
    public string? FulfilmentProviderReference { get; set; }
}
