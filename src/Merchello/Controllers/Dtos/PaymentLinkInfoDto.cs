namespace Merchello.Controllers.Dtos;

/// <summary>
/// Payment link information returned from the API.
/// </summary>
public class PaymentLinkInfoDto
{
    /// <summary>
    /// The shareable payment URL.
    /// </summary>
    public string? PaymentUrl { get; init; }

    /// <summary>
    /// Provider alias that created this link.
    /// </summary>
    public string? ProviderAlias { get; init; }

    /// <summary>
    /// Display name of the provider.
    /// </summary>
    public string? ProviderDisplayName { get; init; }

    /// <summary>
    /// When the link was created.
    /// </summary>
    public DateTime? CreatedAt { get; init; }

    /// <summary>
    /// Username of the staff member who created the link.
    /// </summary>
    public string? CreatedBy { get; init; }

    /// <summary>
    /// Whether the invoice has been paid.
    /// </summary>
    public bool IsPaid { get; init; }

    /// <summary>
    /// Whether there is an active (unpaid) payment link.
    /// </summary>
    public bool HasActiveLink { get; init; }
}
