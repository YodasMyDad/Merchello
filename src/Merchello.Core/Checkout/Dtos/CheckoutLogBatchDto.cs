namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Batch of client-side log entries from the checkout.
/// </summary>
public record CheckoutLogBatchDto
{
    /// <summary>
    /// The log entries to ingest.
    /// </summary>
    public IReadOnlyList<CheckoutLogEntryDto> Entries { get; init; } = [];
}
