using Merchello.Core.Accounting.Models;

namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Status update received from a fulfilment provider.
/// </summary>
public record FulfilmentStatusUpdate
{
    public required string ProviderReference { get; init; }
    public required string ProviderStatus { get; init; }
    public required OrderStatus MappedStatus { get; init; }
    public DateTime StatusDate { get; init; } = DateTime.UtcNow;
    public string? ErrorMessage { get; init; }
    public Dictionary<string, object> ExtendedData { get; init; } = [];
}
