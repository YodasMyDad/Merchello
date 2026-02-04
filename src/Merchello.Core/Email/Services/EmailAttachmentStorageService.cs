using Merchello.Core.Email.Attachments;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Email.Services;

/// <summary>
/// Service for managing email attachment temp file storage.
/// Stores attachments as files in App_Data/Email_Attachments/{deliveryId}/.
/// </summary>
public class EmailAttachmentStorageService(
    IHostEnvironment hostEnvironment,
    IOptions<EmailSettings> emailSettings,
    ILogger<EmailAttachmentStorageService> logger) : IEmailAttachmentStorageService
{
    private readonly string _baseStoragePath = hostEnvironment.MapPath(emailSettings.Value.AttachmentStoragePath);

    public async Task<StoredAttachmentReference> SaveAttachmentAsync(
        Guid deliveryId,
        EmailAttachmentResult result,
        CancellationToken ct = default)
    {
        var deliveryFolder = GetDeliveryFolderPath(deliveryId);
        Directory.CreateDirectory(deliveryFolder);

        var sanitizedFileName = SanitizeFileName(result.FileName);
        var filePath = Path.Combine(deliveryFolder, sanitizedFileName);

        // Security: Ensure path stays within storage folder
        ValidatePathSecurity(filePath);

        await File.WriteAllBytesAsync(filePath, result.Content, ct);

        var storagePath = $"{deliveryId}/{sanitizedFileName}";

        logger.LogDebug(
            "Saved attachment {FileName} ({Size} bytes) for delivery {DeliveryId}",
            result.FileName, result.Content.Length, deliveryId);

        return new StoredAttachmentReference
        {
            StoragePath = storagePath,
            FileName = result.FileName,
            ContentType = result.ContentType,
            FileSizeBytes = result.Content.Length,
            CreatedUtc = DateTime.UtcNow
        };
    }

    public async Task<byte[]?> LoadAttachmentAsync(string storagePath, CancellationToken ct = default)
    {
        var fullPath = GetFullPath(storagePath);

        // Security: Ensure path stays within storage folder
        ValidatePathSecurity(fullPath);

        if (!File.Exists(fullPath))
        {
            logger.LogWarning("Attachment file not found: {StoragePath}", storagePath);
            return null;
        }

        return await File.ReadAllBytesAsync(fullPath, ct);
    }

    public void DeleteDeliveryAttachments(Guid deliveryId)
    {
        var deliveryFolder = GetDeliveryFolderPath(deliveryId);

        if (Directory.Exists(deliveryFolder))
        {
            try
            {
                Directory.Delete(deliveryFolder, recursive: true);
                logger.LogDebug("Deleted attachment folder for delivery {DeliveryId}", deliveryId);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to delete attachment folder for delivery {DeliveryId}", deliveryId);
            }
        }
    }

    public bool FileExists(string storagePath)
    {
        var fullPath = GetFullPath(storagePath);

        try
        {
            ValidatePathSecurity(fullPath);
            return File.Exists(fullPath);
        }
        catch
        {
            return false;
        }
    }

    public IEnumerable<string> GetExpiredDeliveryFolders(int retentionHours)
    {
        if (!Directory.Exists(_baseStoragePath))
            yield break;

        var cutoff = DateTime.UtcNow.AddHours(-retentionHours);

        foreach (var folder in Directory.GetDirectories(_baseStoragePath))
        {
            var folderInfo = new DirectoryInfo(folder);

            // Check if folder creation time is older than retention period
            if (folderInfo.CreationTimeUtc < cutoff)
            {
                yield return folderInfo.Name;
            }
        }
    }

    private string GetDeliveryFolderPath(Guid deliveryId)
    {
        return Path.Combine(_baseStoragePath, deliveryId.ToString());
    }

    private string GetFullPath(string storagePath)
    {
        // Normalize path separators
        storagePath = storagePath.Replace('/', Path.DirectorySeparatorChar);
        return Path.Combine(_baseStoragePath, storagePath);
    }

    private void ValidatePathSecurity(string fullPath)
    {
        var resolvedPath = Path.GetFullPath(fullPath);
        var resolvedBasePath = Path.GetFullPath(_baseStoragePath);

        if (!resolvedPath.StartsWith(resolvedBasePath, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Path traversal attempt detected: {fullPath}");
        }
    }

    private static string SanitizeFileName(string fileName)
    {
        var invalidChars = Path.GetInvalidFileNameChars();
        var sanitized = string.Join("_", fileName.Split(invalidChars, StringSplitOptions.RemoveEmptyEntries));

        // Ensure non-empty
        if (string.IsNullOrWhiteSpace(sanitized))
            sanitized = "attachment";

        // Limit length
        if (sanitized.Length > 200)
            sanitized = sanitized[..200];

        return sanitized;
    }
}
