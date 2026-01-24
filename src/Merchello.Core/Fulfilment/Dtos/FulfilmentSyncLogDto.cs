using Merchello.Core.Fulfilment.Models;

namespace Merchello.Core.Fulfilment.Dtos;

/// <summary>
/// Fulfilment sync log entry for display.
/// </summary>
public class FulfilmentSyncLogDto
{
    public Guid Id { get; set; }
    public Guid ProviderConfigurationId { get; set; }
    public string? ProviderDisplayName { get; set; }
    public FulfilmentSyncType SyncType { get; set; }
    public string SyncTypeLabel { get; set; } = string.Empty;
    public FulfilmentSyncStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public string StatusCssClass { get; set; } = string.Empty;
    public int ItemsProcessed { get; set; }
    public int ItemsSucceeded { get; set; }
    public int ItemsFailed { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
