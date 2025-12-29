using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Preview of payment methods as they will appear at checkout.
/// Shows which methods are active vs hidden due to deduplication.
/// </summary>
public class CheckoutPaymentPreviewDto
{
    /// <summary>
    /// Express checkout methods that will appear (Apple Pay, Google Pay, etc.).
    /// </summary>
    public List<CheckoutMethodPreviewDto> ExpressMethods { get; set; } = [];

    /// <summary>
    /// Standard payment methods that will appear (Cards, PayPal, etc.).
    /// </summary>
    public List<CheckoutMethodPreviewDto> StandardMethods { get; set; } = [];

    /// <summary>
    /// Methods that are enabled but hidden because another provider's method
    /// of the same type has a lower sort order.
    /// </summary>
    public List<CheckoutMethodPreviewDto> HiddenMethods { get; set; } = [];
}

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
    /// The type/category of this payment method (e.g., Cards, ApplePay).
    /// </summary>
    public PaymentMethodType? MethodType { get; set; }

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
}
