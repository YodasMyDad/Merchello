using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.ProductSync.Models;

public class ProductSyncRun
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public ProductSyncDirection Direction { get; set; }
    public ProductSyncProfile Profile { get; set; }
    public ProductSyncRunStatus Status { get; set; } = ProductSyncRunStatus.Queued;

    public string? RequestedByUserId { get; set; }
    public string? RequestedByUserName { get; set; }

    public string? InputFileName { get; set; }
    public string? InputFilePath { get; set; }
    public string? OutputFileName { get; set; }
    public string? OutputFilePath { get; set; }
    public string? OptionsJson { get; set; }

    public int ItemsProcessed { get; set; }
    public int ItemsSucceeded { get; set; }
    public int ItemsFailed { get; set; }
    public int WarningCount { get; set; }
    public int ErrorCount { get; set; }

    public DateTime? StartedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public DateTime DateCreatedUtc { get; set; } = DateTime.UtcNow;
    public string? ErrorMessage { get; set; }

    public virtual ICollection<ProductSyncIssue> Issues { get; set; } = [];
}
