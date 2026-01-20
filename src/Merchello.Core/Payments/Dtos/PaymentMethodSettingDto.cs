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
    /// Custom display name override. Null if using provider default.
    /// </summary>
    public string? DisplayNameOverride { get; set; }

    /// <summary>
    /// Icon identifier.
    /// </summary>
    public string? Icon { get; set; }

    /// <summary>
    /// Icon HTML/SVG markup for the payment method.
    /// </summary>
    public string? IconHtml { get; set; }

    /// <summary>
    /// Custom icon media key (Umbraco media). Null if using provider default.
    /// </summary>
    public Guid? IconMediaKey { get; set; }

    /// <summary>
    /// Resolved URL for custom icon media. Null if no custom icon or media not found.
    /// </summary>
    public string? IconMediaUrl { get; set; }

    /// <summary>
    /// Custom checkout style override. Null if using provider default.
    /// </summary>
    public PaymentMethodCheckoutStyleDto? CheckoutStyleOverride { get; set; }

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
    /// Method type for deduplication. Use values from <see cref="Models.PaymentMethodTypes"/>.
    /// </summary>
    public string? MethodType { get; set; }

    /// <summary>
    /// Regions/countries where this payment method is available.
    /// Empty/null means globally available.
    /// </summary>
    public IReadOnlyList<PaymentMethodRegionDto>? SupportedRegions { get; set; }
}
