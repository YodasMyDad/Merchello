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
    /// Standard payment methods that will appear as form-based options (Cards via HostedFields/DirectForm).
    /// These are deduplicated by MethodType.
    /// </summary>
    public List<CheckoutMethodPreviewDto> StandardMethods { get; set; } = [];

    /// <summary>
    /// Redirect payment methods that will appear in the "Or pay with" section.
    /// These are NOT deduplicated - all enabled redirect methods are shown.
    /// </summary>
    public List<CheckoutMethodPreviewDto> RedirectMethods { get; set; } = [];

    /// <summary>
    /// Methods that are enabled but hidden because another provider's method
    /// of the same type has a lower sort order.
    /// </summary>
    public List<CheckoutMethodPreviewDto> HiddenMethods { get; set; } = [];
}
