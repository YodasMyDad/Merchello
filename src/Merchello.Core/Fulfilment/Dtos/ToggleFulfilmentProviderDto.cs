namespace Merchello.Core.Fulfilment.Dtos;

/// <summary>
/// Request to toggle a fulfilment provider's enabled status.
/// </summary>
public class ToggleFulfilmentProviderDto
{
    /// <summary>
    /// Whether the provider should be enabled
    /// </summary>
    public bool IsEnabled { get; set; }
}
