namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Result of cancelling an order at a fulfilment provider.
/// </summary>
public record FulfilmentCancelResult
{
    public bool Success { get; init; }
    public string? ErrorMessage { get; init; }

    public static FulfilmentCancelResult Succeeded() => new() { Success = true };
    public static FulfilmentCancelResult Failed(string error) => new() { Success = false, ErrorMessage = error };
    public static FulfilmentCancelResult NotSupported() => Failed("Provider does not support order cancellation");
}
