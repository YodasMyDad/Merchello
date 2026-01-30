using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Models;

/// <summary>
/// Database entity for storing payment method settings.
/// Each provider can have multiple method settings (one per payment method it offers).
/// </summary>
[NotMapped]
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
    /// Whether this payment method appears in customer checkout.
    /// If null, uses the provider's ShowInCheckoutByDefault value.
    /// </summary>
    public bool? ShowInCheckout { get; set; }

    /// <summary>
    /// Optional Umbraco media key for custom checkout icon.
    /// If set, overrides the provider's default icon.
    /// </summary>
    public Guid? IconMediaKey { get; set; }

    /// <summary>
    /// Optional checkout style override (stored as JSON).
    /// If set, overrides the provider's default checkout style.
    /// </summary>
    public PaymentMethodCheckoutStyle? CheckoutStyleOverride { get; set; }

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
    [JsonIgnore]
    public PaymentProviderSetting? ProviderSetting { get; set; }
}
