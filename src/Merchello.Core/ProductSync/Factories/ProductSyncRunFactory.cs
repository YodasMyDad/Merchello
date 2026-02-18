using System.Text.Json;
using Merchello.Core.ProductSync.Models;

namespace Merchello.Core.ProductSync.Factories;

public class ProductSyncRunFactory
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public ProductSyncRun CreateImportRun(
        ProductSyncProfile profile,
        string? requestedByUserId,
        string? requestedByUserName,
        string inputFileName,
        string inputFilePath,
        object options)
    {
        return new ProductSyncRun
        {
            Direction = ProductSyncDirection.Import,
            Profile = profile,
            Status = ProductSyncRunStatus.Queued,
            RequestedByUserId = requestedByUserId,
            RequestedByUserName = requestedByUserName,
            InputFileName = inputFileName,
            InputFilePath = inputFilePath,
            OptionsJson = JsonSerializer.Serialize(options, JsonOptions),
            DateCreatedUtc = DateTime.UtcNow
        };
    }

    public ProductSyncRun CreateExportRun(
        ProductSyncProfile profile,
        string? requestedByUserId,
        string? requestedByUserName,
        object options)
    {
        return new ProductSyncRun
        {
            Direction = ProductSyncDirection.Export,
            Profile = profile,
            Status = ProductSyncRunStatus.Queued,
            RequestedByUserId = requestedByUserId,
            RequestedByUserName = requestedByUserName,
            OptionsJson = JsonSerializer.Serialize(options, JsonOptions),
            DateCreatedUtc = DateTime.UtcNow
        };
    }
}
