using Merchello.Core.Fulfilment.Providers.ShipBob.Models;

namespace Merchello.Core.Fulfilment.Providers.ShipBob;

/// <summary>
/// Result of a ShipBob API call.
/// </summary>
public sealed record ShipBobApiResult<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public ShipBobApiError? Error { get; init; }

    public string ErrorMessage => Error?.GetDisplayMessage() ?? "Unknown error";
}
