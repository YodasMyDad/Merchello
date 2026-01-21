namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Result of submitting an order to a fulfilment provider.
/// </summary>
public record FulfilmentOrderResult
{
    public bool Success { get; init; }
    public string? ProviderReference { get; init; }
    public string? ErrorMessage { get; init; }
    public string? ErrorCode { get; init; }
    public Dictionary<string, object> ExtendedData { get; init; } = [];

    public static FulfilmentOrderResult Succeeded(string providerReference)
        => new() { Success = true, ProviderReference = providerReference };

    public static FulfilmentOrderResult Failed(string errorMessage, string? errorCode = null)
        => new() { Success = false, ErrorMessage = errorMessage, ErrorCode = errorCode };
}
