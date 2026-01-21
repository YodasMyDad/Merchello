using Merchello.Core.Fulfilment.Models;

namespace Merchello.Core.Fulfilment.Services.Parameters;

/// <summary>
/// Query parameters for fetching fulfilment sync logs.
/// </summary>
public class FulfilmentSyncLogQueryParameters
{
    public Guid? ProviderConfigurationId { get; set; }
    public FulfilmentSyncType? SyncType { get; set; }
    public FulfilmentSyncStatus? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
