using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Tax.Models;

/// <summary>
/// Persisted settings for a tax provider.
/// </summary>
public class TaxProviderSetting
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// Provider alias (unique identifier).
    /// </summary>
    public string ProviderAlias { get; set; } = string.Empty;

    /// <summary>
    /// Whether this is the active tax provider.
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// JSON-serialized configuration values.
    /// </summary>
    public string? ConfigurationJson { get; set; }

    /// <summary>
    /// Sort order for display purposes.
    /// </summary>
    public int SortOrder { get; set; }

    public DateTime CreateDate { get; set; } = DateTime.UtcNow;
    public DateTime UpdateDate { get; set; } = DateTime.UtcNow;
}
