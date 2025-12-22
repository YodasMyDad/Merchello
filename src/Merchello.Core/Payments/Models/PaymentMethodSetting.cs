namespace Merchello.Core.Payments.Models;

/// <summary>
/// Database entity for storing payment method settings.
/// Each provider can have multiple method settings (one per payment method it offers).
/// </summary>
public class PaymentMethodSetting
{
    /// <summary>
    /// Unique identifier for this method setting.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Foreign key to the parent provider setting.
    /// </summary>
    public Guid PaymentProviderSettingId { get; set; }

    /// <summary>
    /// The payment method alias (e.g., "cards", "paypal", "applepay").
    /// Must match a PaymentMethodDefinition.Alias from the provider.
    /// </summary>
    public required string MethodAlias { get; set; }

    /// <summary>
    /// Optional custom display name override. If null, uses the provider's default display name.
    /// </summary>
    public string? DisplayNameOverride { get; set; }

    /// <summary>
    /// Whether this payment method is enabled for checkout.
    /// </summary>
    public bool IsEnabled { get; set; }

    /// <summary>
    /// Sort order for display in checkout. Lower numbers appear first.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// When this setting was created.
    /// </summary>
    public DateTime DateCreated { get; set; }

    /// <summary>
    /// When this setting was last updated.
    /// </summary>
    public DateTime DateUpdated { get; set; }

    /// <summary>
    /// Navigation property to the parent provider setting.
    /// </summary>
    public PaymentProviderSetting? ProviderSetting { get; set; }
}
