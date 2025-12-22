using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Payments.Models;

/// <summary>
/// Database entity for persisted payment provider configuration.
/// </summary>
public class PaymentProviderSetting
{
    /// <summary>
    /// Unique identifier.
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// The provider alias (must match the provider's metadata alias).
    /// </summary>
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// Display name for this provider configuration.
    /// </summary>
    public required string DisplayName { get; set; }

    /// <summary>
    /// Whether this provider is enabled.
    /// </summary>
    public bool IsEnabled { get; set; }

    /// <summary>
    /// Whether this provider is in test/sandbox mode.
    /// When true, the provider should use test credentials and sandbox environments.
    /// </summary>
    public bool IsTestMode { get; set; } = true;

    /// <summary>
    /// JSON-serialized configuration values.
    /// </summary>
    public string? Configuration { get; set; }

    /// <summary>
    /// Sort order for display in checkout.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Date this record was created.
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date this record was last updated.
    /// </summary>
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Method settings for this provider. Each method can be individually enabled/disabled.
    /// </summary>
    public List<PaymentMethodSetting> MethodSettings { get; set; } = [];
}

