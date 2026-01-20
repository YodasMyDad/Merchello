namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// A payment method in the checkout preview with provider context and deduplication status.
/// </summary>
public class CheckoutMethodPreviewDto
{
    /// <summary>
    /// The provider alias (e.g., "stripe", "braintree").
    /// </summary>
    public required string ProviderAlias { get; set; }

    /// <summary>
    /// The provider's display name for the UI.
    /// </summary>
    public required string ProviderDisplayName { get; set; }

    /// <summary>
    /// The provider setting ID for linking to configuration.
    /// </summary>
    public Guid ProviderSettingId { get; set; }

    /// <summary>
    /// The method alias within the provider (e.g., "cards", "applepay").
    /// </summary>
    public required string MethodAlias { get; set; }

    /// <summary>
    /// Display name shown to customers.
    /// </summary>
    public required string DisplayName { get; set; }

    /// <summary>
    /// Icon identifier or URL.
    /// </summary>
    public string? Icon { get; set; }

    /// <summary>
    /// Icon HTML/SVG markup for the payment method.
    /// When provided, this is used instead of Icon for rendering.
    /// </summary>
    public string? IconHtml { get; set; }

    /// <summary>
    /// The type/category of this payment method (e.g., "cards", "apple-pay").
    /// </summary>
    public string? MethodType { get; set; }

    /// <summary>
    /// Sort order for display in checkout.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// True if this method will be shown at checkout (wins for its MethodType).
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// If hidden, the display name of the provider that outranks this method.
    /// </summary>
    public string? OutrankedBy { get; set; }

    /// <summary>
    /// Regions/countries where this payment method is available.
    /// Empty/null means globally available.
    /// </summary>
    public IReadOnlyList<PaymentMethodRegionDto>? SupportedRegions { get; set; }
}
