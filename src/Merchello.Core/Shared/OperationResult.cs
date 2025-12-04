namespace Merchello.Core.Shared;

/// <summary>
/// Result wrapper for operations that can succeed or fail
/// </summary>
public class OperationResult<T>
{
    public bool IsSuccess { get; private init; }
    public T? Data { get; private init; }
    public string? ErrorMessage { get; private init; }

    private OperationResult() { }

    public static OperationResult<T> Success(T data) => new()
    {
        IsSuccess = true,
        Data = data
    };

    public static OperationResult<T> Fail(string errorMessage) => new()
    {
        IsSuccess = false,
        ErrorMessage = errorMessage
    };
}

