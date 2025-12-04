using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Shipping.Models;

/// <summary>
/// Stores persisted settings for a shipping provider implementation.
/// </summary>
public class ShippingProviderConfiguration
{
    /// <summary>
    /// Unique identifier.
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// The provider key (must match the provider's metadata key).
    /// </summary>
    public string ProviderKey { get; set; } = null!;

    /// <summary>
    /// Display name for this provider configuration.
    /// </summary>
    public string? DisplayName { get; set; }

    /// <summary>
    /// Whether this provider is enabled.
    /// </summary>
    public bool IsEnabled { get; set; }

    /// <summary>
    /// JSON-serialized configuration values.
    /// </summary>
    public string? SettingsJson { get; set; }

    /// <summary>
    /// Sort order for display in checkout.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Date this record was last updated.
    /// </summary>
    public DateTime UpdateDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date this record was created.
    /// </summary>
    public DateTime CreateDate { get; set; } = DateTime.UtcNow;
}
