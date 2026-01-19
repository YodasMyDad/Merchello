namespace Merchello.Core.DigitalProducts.Services.Parameters;

/// <summary>
/// Parameters for creating a single download link (used by factory).
/// </summary>
public class CreateDownloadLinkParameters
{
    /// <summary>
    /// The invoice this download link belongs to.
    /// </summary>
    public required Guid InvoiceId { get; init; }

    /// <summary>
    /// The line item this download link is associated with.
    /// </summary>
    public required Guid LineItemId { get; init; }

    /// <summary>
    /// The customer who purchased the digital product.
    /// Required - digital products require customer accounts.
    /// </summary>
    public required Guid CustomerId { get; init; }

    /// <summary>
    /// The Umbraco Media ID of the file.
    /// </summary>
    public required string MediaId { get; init; }

    /// <summary>
    /// Display name of the file.
    /// </summary>
    public required string FileName { get; init; }

    /// <summary>
    /// Number of days until the link expires. Null uses default, 0 means never expires.
    /// </summary>
    public int? ExpiryDays { get; init; }

    /// <summary>
    /// Maximum number of downloads allowed. Null or 0 means unlimited.
    /// </summary>
    public int? MaxDownloads { get; init; }
}
