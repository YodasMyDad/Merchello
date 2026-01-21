using Merchello.Core.Fulfilment.Models;

namespace Merchello.Core.Fulfilment.Dtos;

/// <summary>
/// Request to create/enable a fulfilment provider configuration.
/// </summary>
public class CreateFulfilmentProviderDto
{
    /// <summary>
    /// The provider key to enable
    /// </summary>
    public required string ProviderKey { get; set; }

    /// <summary>
    /// Display name override (optional, defaults to provider's display name)
    /// </summary>
    public string? DisplayName { get; set; }

    /// <summary>
    /// Whether to enable immediately
    /// </summary>
    public bool IsEnabled { get; set; } = true;

    /// <summary>
    /// Inventory sync mode
    /// </summary>
    public InventorySyncMode InventorySyncMode { get; set; } = InventorySyncMode.Full;

    /// <summary>
    /// Configuration values (key-value pairs for API keys, etc.)
    /// </summary>
    public Dictionary<string, string>? Configuration { get; set; }
}
