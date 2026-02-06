using Merchello.Core.Shared.Models;

namespace Merchello.Core.Shared;

/// <summary>
/// Result wrapper for operations that can succeed or fail
/// </summary>
public class OperationResult<T> : IResult
{
    public bool Success { get; private init; }
    public T? Data { get; private init; }
    public string? ErrorMessage { get; private init; }

    private OperationResult() { }

    public static OperationResult<T> Ok(T data) => new()
    {
        Success = true,
        Data = data
    };

    public static OperationResult<T> Fail(string errorMessage) => new()
    {
        Success = false,
        ErrorMessage = errorMessage
    };
}

