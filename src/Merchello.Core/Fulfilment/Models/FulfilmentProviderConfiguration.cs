using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Configuration for a fulfilment provider instance.
/// </summary>
public class FulfilmentProviderConfiguration
{
    /// <summary>
    /// Unique identifier for this configuration
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// Key matching the provider's metadata key (e.g., "shipbob", "shipmonk")
    /// </summary>
    public string ProviderKey { get; set; } = null!;

    /// <summary>
    /// Custom display name for this configuration
    /// </summary>
    public string? DisplayName { get; set; }

    /// <summary>
    /// Whether this provider configuration is enabled
    /// </summary>
    public bool IsEnabled { get; set; }

    /// <summary>
    /// Inventory sync mode (Full or Delta)
    /// </summary>
    public InventorySyncMode InventorySyncMode { get; set; } = InventorySyncMode.Full;

    /// <summary>
    /// JSON configuration (API keys, endpoints, etc.)
    /// </summary>
    public string? SettingsJson { get; set; }

    /// <summary>
    /// Display order for UI
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Date created
    /// </summary>
    public DateTime CreateDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date last updated
    /// </summary>
    public DateTime UpdateDate { get; set; } = DateTime.UtcNow;
}
