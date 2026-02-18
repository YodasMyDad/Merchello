using Merchello.Core.ProductSync.Models;

namespace Merchello.Core.ProductSync.Dtos;

public class ProductSyncRunDto
{
    public Guid Id { get; set; }
    public ProductSyncDirection Direction { get; set; }
    public ProductSyncProfile Profile { get; set; }
    public ProductSyncRunStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public string StatusCssClass { get; set; } = string.Empty;

    public string? RequestedByUserId { get; set; }
    public string? RequestedByUserName { get; set; }

    public string? InputFileName { get; set; }
    public string? OutputFileName { get; set; }

    public int ItemsProcessed { get; set; }
    public int ItemsSucceeded { get; set; }
    public int ItemsFailed { get; set; }
    public int WarningCount { get; set; }
    public int ErrorCount { get; set; }

    public DateTime? StartedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public DateTime DateCreatedUtc { get; set; }
    public string? ErrorMessage { get; set; }
}
