namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Result of testing connection to a fulfilment provider.
/// </summary>
public record FulfilmentConnectionTestResult
{
    public bool Success { get; init; }
    public string? ProviderVersion { get; init; }
    public string? AccountName { get; init; }
    public int? WarehouseCount { get; init; }
    public string? ErrorMessage { get; init; }
    public string? ErrorCode { get; init; }

    public static FulfilmentConnectionTestResult Succeeded(string? accountName = null, string? providerVersion = null)
        => new() { Success = true, AccountName = accountName, ProviderVersion = providerVersion };

    public static FulfilmentConnectionTestResult Failed(string error, string? errorCode = null)
        => new() { Success = false, ErrorMessage = error, ErrorCode = errorCode };

    public static FulfilmentConnectionTestResult NotSupported()
        => Failed("Provider does not support connection testing");
}
