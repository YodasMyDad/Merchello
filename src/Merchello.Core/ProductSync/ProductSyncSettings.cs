namespace Merchello.Core.ProductSync;

public class ProductSyncSettings
{
    public int WorkerIntervalSeconds { get; set; } = 10;
    public int RunRetentionDays { get; set; } = 90;
    public int ArtifactRetentionDays { get; set; } = 30;
    public int MaxCsvBytes { get; set; } = 15 * 1024 * 1024;
    public int MaxValidationIssuesReturned { get; set; } = 1000;
    public int ImageDownloadTimeoutSeconds { get; set; } = 30;
    public int MaxImageBytes { get; set; } = 20 * 1024 * 1024;

    public string ArtifactStoragePath { get; set; } = "App_Data/ProductSync";
    public string MediaImportRootFolderName { get; set; } = "Products";
}
