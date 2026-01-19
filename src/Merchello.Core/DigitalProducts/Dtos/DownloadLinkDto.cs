namespace Merchello.Core.DigitalProducts.Dtos;

/// <summary>
/// DTO for download link information returned to clients.
/// </summary>
public class DownloadLinkDto
{
    /// <summary>
    /// Unique identifier for the download link.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Display name of the file.
    /// </summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>
    /// The full download URL.
    /// </summary>
    public string DownloadUrl { get; set; } = string.Empty;

    /// <summary>
    /// When the link expires. Null means never expires.
    /// </summary>
    public DateTime? ExpiresUtc { get; set; }

    /// <summary>
    /// Name of the product this file belongs to.
    /// </summary>
    public string ProductName { get; set; } = string.Empty;

    /// <summary>
    /// Maximum number of downloads allowed. Null means unlimited.
    /// </summary>
    public int? MaxDownloads { get; set; }

    /// <summary>
    /// Number of times this link has been used.
    /// </summary>
    public int DownloadCount { get; set; }

    /// <summary>
    /// Remaining downloads. Null means unlimited.
    /// </summary>
    public int? RemainingDownloads { get; set; }

    /// <summary>
    /// When the link was last used for a download.
    /// </summary>
    public DateTime? LastDownloadUtc { get; set; }

    /// <summary>
    /// Whether the link has expired.
    /// </summary>
    public bool IsExpired { get; set; }

    /// <summary>
    /// Whether the download limit has been reached.
    /// </summary>
    public bool IsDownloadLimitReached { get; set; }
}
