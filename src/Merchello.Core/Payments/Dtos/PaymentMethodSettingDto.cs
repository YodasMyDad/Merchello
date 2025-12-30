using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// DTO for payment method settings returned from API.
/// Combines the method definition with its persisted settings.
/// </summary>
public class PaymentMethodSettingDto
{
    /// <summary>
    /// Method alias (e.g., "cards", "applepay", "paypal").
    /// </summary>
    public required string MethodAlias { get; set; }

    /// <summary>
    /// Display name (from setting override or method definition).
    /// </summary>
    public required string DisplayName { get; set; }

    /// <summary>
    /// Original display name from the provider definition.
    /// </summary>
    public string? DefaultDisplayName { get; set; }

    /// <summary>
    /// Icon identifier.
    /// </summary>
    public string? Icon { get; set; }

    /// <summary>
    /// Icon HTML/SVG markup for the payment method.
    /// </summary>
    public string? IconHtml { get; set; }

    /// <summary>
    /// Method description.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Whether the method is enabled.
    /// </summary>
    public bool IsEnabled { get; set; }

    /// <summary>
    /// Sort order for display.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Whether this is an express checkout method.
    /// </summary>
    public bool IsExpressCheckout { get; set; }

    /// <summary>
    /// Method type for deduplication.
    /// </summary>
    public PaymentMethodType? MethodType { get; set; }
}
