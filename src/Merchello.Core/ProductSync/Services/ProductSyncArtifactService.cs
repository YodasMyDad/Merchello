using Merchello.Core.ProductSync.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Core.ProductSync.Services;

public class ProductSyncArtifactService(
    IHostEnvironment hostEnvironment,
    IOptions<ProductSyncSettings> settings,
    ILogger<ProductSyncArtifactService> logger) : IProductSyncArtifactService
{
    private readonly string _baseStoragePath = hostEnvironment.MapPath(settings.Value.ArtifactStoragePath);

    public async Task<(string FileName, string FilePath)> SaveImportArtifactAsync(
        string originalFileName,
        Stream content,
        CancellationToken cancellationToken = default)
    {
        var folderPath = GetSubfolderPath("imports");
        Directory.CreateDirectory(folderPath);

        var safeOriginalName = SanitizeFileName(string.IsNullOrWhiteSpace(originalFileName) ? "import.csv" : originalFileName);
        var fileName = $"{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}-{safeOriginalName}";
        var fullPath = Path.Combine(folderPath, fileName);

        ValidatePathSecurity(fullPath);

        if (content.CanSeek)
        {
            content.Seek(0, SeekOrigin.Begin);
        }

        await using var stream = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        await content.CopyToAsync(stream, cancellationToken);

        logger.LogDebug("Saved product sync import artifact {FilePath}", fullPath);
        return (safeOriginalName, fullPath);
    }

    public Task<(string FileName, string FilePath, Stream Stream)> CreateExportArtifactAsync(
        string suggestedFileName,
        CancellationToken cancellationToken = default)
    {
        var folderPath = GetSubfolderPath("exports");
        Directory.CreateDirectory(folderPath);

        var safeFileName = SanitizeFileName(string.IsNullOrWhiteSpace(suggestedFileName) ? "products-export.csv" : suggestedFileName);
        var fileName = $"{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}-{safeFileName}";
        var fullPath = Path.Combine(folderPath, fileName);

        ValidatePathSecurity(fullPath);

        Stream stream = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        return Task.FromResult((fileName, fullPath, stream));
    }

    public Task<Stream?> OpenReadAsync(string? filePath, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(filePath))
        {
            return Task.FromResult<Stream?>(null);
        }

        ValidatePathSecurity(filePath);
        if (!File.Exists(filePath))
        {
            return Task.FromResult<Stream?>(null);
        }

        Stream stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult<Stream?>(stream);
    }

    public Task DeleteIfExistsAsync(string? filePath, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(filePath))
        {
            return Task.CompletedTask;
        }

        try
        {
            ValidatePathSecurity(filePath);
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to delete product sync artifact {FilePath}", filePath);
        }

        return Task.CompletedTask;
    }

    private string GetSubfolderPath(string subFolder)
    {
        return Path.Combine(_baseStoragePath, subFolder, DateTime.UtcNow.ToString("yyyyMMdd"));
    }

    private void ValidatePathSecurity(string fullPath)
    {
        var normalized = fullPath.Replace('\\', Path.DirectorySeparatorChar);
        var resolvedPath = Path.GetFullPath(normalized);
        var resolvedBasePath = Path.GetFullPath(_baseStoragePath)
            .TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        var resolvedBasePathWithSeparator = $"{resolvedBasePath}{Path.DirectorySeparatorChar}";

        var isWithinBasePath = resolvedPath.Equals(resolvedBasePath, StringComparison.OrdinalIgnoreCase) ||
                               resolvedPath.StartsWith(resolvedBasePathWithSeparator, StringComparison.OrdinalIgnoreCase);

        if (!isWithinBasePath)
        {
            throw new InvalidOperationException($"Path traversal attempt detected: {fullPath}");
        }
    }

    private static readonly char[] InvalidFileNameChars =
        [.. Path.GetInvalidFileNameChars(), '<', '>', ':', '"', '|', '?', '*'];

    private static string SanitizeFileName(string fileName)
    {
        var sanitized = string.Join("_", fileName.Split(InvalidFileNameChars, StringSplitOptions.RemoveEmptyEntries));
        if (string.IsNullOrWhiteSpace(sanitized))
        {
            return "artifact.csv";
        }

        if (sanitized.Length > 180)
        {
            sanitized = sanitized[..180];
        }

        return sanitized;
    }
}
