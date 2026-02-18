namespace Merchello.Core.ProductSync.Services.Interfaces;

public interface IProductSyncArtifactService
{
    Task<(string FileName, string FilePath)> SaveImportArtifactAsync(
        string originalFileName,
        Stream content,
        CancellationToken cancellationToken = default);

    Task<(string FileName, string FilePath, Stream Stream)> CreateExportArtifactAsync(
        string suggestedFileName,
        CancellationToken cancellationToken = default);

    Task<Stream?> OpenReadAsync(string? filePath, CancellationToken cancellationToken = default);

    Task DeleteIfExistsAsync(string? filePath, CancellationToken cancellationToken = default);
}
