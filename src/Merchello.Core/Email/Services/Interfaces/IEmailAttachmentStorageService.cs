using Merchello.Core.Email.Attachments;

namespace Merchello.Core.Email.Services.Interfaces;

/// <summary>
/// Service for managing email attachment temp file storage.
/// </summary>
public interface IEmailAttachmentStorageService
{
    /// <summary>
    /// Saves an attachment to temp file storage.
    /// </summary>
    /// <param name="deliveryId">The delivery ID (used for folder organization).</param>
    /// <param name="result">The attachment result containing content.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>A reference to the stored attachment.</returns>
    Task<StoredAttachmentReference> SaveAttachmentAsync(
        Guid deliveryId,
        EmailAttachmentResult result,
        CancellationToken ct = default);

    /// <summary>
    /// Loads an attachment from temp file storage.
    /// </summary>
    /// <param name="storagePath">The relative storage path.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>The attachment content as bytes, or null if not found.</returns>
    Task<byte[]?> LoadAttachmentAsync(string storagePath, CancellationToken ct = default);

    /// <summary>
    /// Deletes all attachment files for a delivery.
    /// </summary>
    /// <param name="deliveryId">The delivery ID.</param>
    void DeleteDeliveryAttachments(Guid deliveryId);

    /// <summary>
    /// Checks if an attachment file exists.
    /// </summary>
    /// <param name="storagePath">The relative storage path.</param>
    /// <returns>True if the file exists.</returns>
    bool FileExists(string storagePath);

    /// <summary>
    /// Gets all delivery folder names that are older than the retention period.
    /// </summary>
    /// <param name="retentionHours">Hours to retain files.</param>
    /// <returns>List of delivery folder names to delete.</returns>
    IEnumerable<string> GetExpiredDeliveryFolders(int retentionHours);
}
