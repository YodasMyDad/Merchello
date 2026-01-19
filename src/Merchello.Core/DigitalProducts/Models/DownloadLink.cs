using System.ComponentModel.DataAnnotations.Schema;

namespace Merchello.Core.DigitalProducts.Models;

/// <summary>
/// Represents a secure download link for a digital product file.
/// Links are created after successful payment and can be time-limited or download-limited.
/// </summary>
public class DownloadLink
{
    /// <summary>
    /// Unique identifier for the download link.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// The invoice this download link belongs to.
    /// </summary>
    public Guid InvoiceId { get; set; }

    /// <summary>
    /// The line item this download link is associated with.
    /// </summary>
    public Guid LineItemId { get; set; }

    /// <summary>
    /// The customer who purchased the digital product.
    /// Required - digital products require customer accounts.
    /// </summary>
    public Guid CustomerId { get; set; }

    /// <summary>
    /// The Umbraco Media ID of the file.
    /// </summary>
    public string MediaId { get; set; } = string.Empty;

    /// <summary>
    /// Display name of the file.
    /// </summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>
    /// HMAC-signed secure token for URL construction.
    /// Format: {linkId:N}-{base64signature}
    /// </summary>
    public string Token { get; set; } = string.Empty;

    /// <summary>
    /// When the link expires. Null means never expires.
    /// </summary>
    public DateTime? ExpiresUtc { get; set; }

    /// <summary>
    /// Maximum number of downloads allowed. Null means unlimited.
    /// </summary>
    public int? MaxDownloads { get; set; }

    /// <summary>
    /// Number of times this link has been used.
    /// </summary>
    public int DownloadCount { get; set; }

    /// <summary>
    /// When the link was last used for a download.
    /// </summary>
    public DateTime? LastDownloadUtc { get; set; }

    /// <summary>
    /// When the link was created.
    /// </summary>
    public DateTime DateCreated { get; set; }

    /// <summary>
    /// Returns true if the link is still valid (not expired and download limit not reached).
    /// </summary>
    public bool IsValid =>
        (!ExpiresUtc.HasValue || ExpiresUtc > DateTime.UtcNow) &&
        (!MaxDownloads.HasValue || DownloadCount < MaxDownloads);

    /// <summary>
    /// The full download URL. Not persisted - built at runtime by the service.
    /// </summary>
    [NotMapped]
    public string DownloadUrl { get; set; } = string.Empty;
}
