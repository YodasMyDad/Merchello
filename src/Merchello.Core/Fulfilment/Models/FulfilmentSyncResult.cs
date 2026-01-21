namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Result of a product/inventory sync operation.
/// </summary>
public record FulfilmentSyncResult
{
    public bool Success { get; init; }
    public int ItemsProcessed { get; init; }
    public int ItemsSucceeded { get; init; }
    public int ItemsFailed { get; init; }
    public IReadOnlyList<string> Errors { get; init; } = [];

    public static FulfilmentSyncResult NotSupported() => new() { Success = false, Errors = ["Provider does not support this sync operation"] };
}
