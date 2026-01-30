using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Shared.Providers;

/// <summary>
/// Base configuration entity for all provider types.
/// Consolidates provider configuration tables into a single store.
/// </summary>
public abstract class ProviderConfiguration
{
    /// <summary>
    /// Unique identifier.
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// Provider key/alias (unique per provider type).
    /// </summary>
    public string ProviderKey { get; set; } = string.Empty;

    /// <summary>
    /// Display name for this provider configuration.
    /// </summary>
    public string? DisplayName { get; set; }

    /// <summary>
    /// Whether this provider configuration is enabled/active.
    /// </summary>
    public bool IsEnabled { get; set; }

    /// <summary>
    /// Sort order for display.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// JSON-serialized configuration values.
    /// </summary>
    public string? SettingsJson { get; set; }

    /// <summary>
    /// Date this record was created.
    /// </summary>
    public DateTime CreateDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date this record was last updated.
    /// </summary>
    public DateTime UpdateDate { get; set; } = DateTime.UtcNow;
}
